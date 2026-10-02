# Nyaya — Legal Research Tool

An AI-powered legal research site for Indian case law, built as a full-stack RAG (Retrieval-Augmented Generation) application.

Ask a legal question in plain English and get back a synthesized, cited answer generated from real judgment text — not keyword matching, but semantic retrieval over Supreme Court judgments, Bombay High Court judgments, and central statutes, with Claude writing the answer.

## How it works

1. **Data ingestion** — pulls judgment PDFs from the public [Indian Supreme Court Judgments](https://github.com/vanga/indian-supreme-court-judgments) and Indian High Court Judgments datasets (AWS Open Data, CC-BY-4.0) and statute sections from India Code, then extracts text with `pdfplumber`.
2. **Chunking & embedding** — splits documents into overlapping ~350-word chunks, embeds each with a `sentence-transformers` bi-encoder (`multi-qa-mpnet-base-dot-v1`), and stores them in a hosted **Qdrant** collection with `year`, `court`, `doc_type` and `title` metadata.
3. **Two-stage retrieval** — a query first gets fast semantic search (12 candidates, optionally filtered by year, court or document type), then a **cross-encoder re-ranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`) re-scores them and keeps the top 5. Exact case-name lookups use a Qdrant full-text index on `title` instead.
4. **Generation** — the top chunks go to Claude (Anthropic API), which streams back a cited, structured answer grounded only in the retrieved text.
5. **Weekly freshness job** — a scheduled Cloud Run Job indexes newly published Supreme Court judgments and, when there are any, emails subscribers a Claude-written "This Week in the Supreme Court" digest via Resend.

## Features

- **Ask** — question answering with citations, filters, and related cases
- **Case search** — find a judgment by name
- **Compare Cases** — side-by-side analysis of two judgments
- **Argument Builder** — structured arguments drawn from case law
- **On This Day** — a judgment decided on today's date in history
- **Export to Word** — for answers and Argument Builder output
- **My Desk** — sign in with Firebase to keep search history and favorites
- **Games** — Trivia, Latin Match and Verdict, with streaks and a leaderboard
- **Newsletter** — signup form and weekly digest

## Tech stack

- **Data**: `pandas`, `pdfplumber`, `requests`, `pyarrow`/`fastparquet`
- **Embeddings & retrieval**: `sentence-transformers` (CPU `torch`), `qdrant-client`
- **Backend**: FastAPI, uvicorn, Anthropic Python SDK, Firebase Admin (auth + Firestore)
- **Frontend**: React 19, Vite, React Router, `react-markdown` + `remark-gfm`, Firebase JS SDK, `docx`
- **Infra**: Google Cloud Run (API + weekly job), Cloud Scheduler, Vercel (frontend), Qdrant Cloud, Resend (email)

## Project structure

```
legal-research-tool/
├── main.py                  # FastAPI backend: /ask, /search, /compare, /argument, user data, games
├── search.py                # Two-stage retrieval against Qdrant (+ title search)
├── Dockerfile               # Cloud Run image for the backend (models baked in)
│
├── fetch_corpus.py          # Download Supreme Court judgments
├── fetch_hc_corpus.py       # Download Bombay High Court judgments (2023)
├── discover_hc.py           # Explore the High Court dataset layout
├── fetch_statutes.py        # Download central Acts from India Code
├── build_index.py           # Chunk, embed, and upload to Qdrant (resumable)
├── create_title_index.py    # One-time: full-text index on case titles
├── build_on_this_day.py     # One-time: build the "On This Day" index in Firestore
│
├── weekly_pipeline.py       # Scheduled job: index new judgments + send digest
├── Dockerfile.weekly        # Image for the weekly job
├── weekly_job/              # Self-contained build context for the weekly job
│
├── verify_index.py          # Maintenance: check what is in Qdrant vs. the corpus
├── fix_missing_case_id.py   # Maintenance: backfill missing case IDs
├── optimize_qdrant.py       # Maintenance: Qdrant collection tuning
├── finish_qdrant_setup.py   # Maintenance: payload indexes etc.
├── citation_scan.py         # Experiment: is a citation graph feasible?
│
├── frontend/                # React app (pages/, components/, games/)
└── corpus*/                 # (gitignored) downloaded text, regenerate with the fetch scripts
```

## Configuration

Backend (`main.py` / `search.py`):

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API access |
| `QDRANT_URL`, `QDRANT_API_KEY` | Vector database |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64-encoded Firebase service account JSON (login, history, favorites, leaderboard) |
| `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` | Newsletter signups |

The weekly job needs the same Anthropic, Qdrant and Resend variables, plus optional `DIGEST_FROM_ADDRESS`, `MAX_NEW_PER_RUN` and `DRY_RUN`.

Indexing options for `build_index.py`: `MIN_YEAR` (only index from this year on), `EMBED_DEVICE=cpu` (skip Apple MPS), `ENCODE_BATCH`.

Never commit `firebase-service-account.json` or any `.env` file — both are gitignored.

## Running it locally

**Backend:**
```bash
pip3 install -r requirements.txt
python3 fetch_corpus.py            # download Supreme Court judgments
python3 build_index.py             # embed and upload to Qdrant (safe to stop and re-run)
python3 create_title_index.py      # one-time, enables case-name search

export ANTHROPIC_API_KEY=...  QDRANT_URL=...  QDRANT_API_KEY=...
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`. Note that the frontend currently points at the deployed Cloud Run backend URL; change `API_URL` in the frontend source to hit a local backend.

## Deployment

- **Backend** — build `Dockerfile` and deploy to Cloud Run. Both models are downloaded at build time and `HF_HUB_OFFLINE=1` is set, so cold starts don't fetch from Hugging Face.
- **Weekly job** — build `Dockerfile.weekly` (or `weekly_job/`), deploy as a Cloud Run Job, and trigger it with Cloud Scheduler.
- **Frontend** — deployed on Vercel; `frontend/vercel.json` rewrites all routes to `index.html` so direct URLs work.

## Known limitations

- Coverage is partial: Supreme Court judgments (bounded by `MIN_YEAR` when indexing), one year of Bombay High Court judgments, and a selected set of central Acts.
- Answers are only as good as the retrieved context; the model is instructed to say when it doesn't have enough information rather than guess.
- This is an educational research tool, not a substitute for professional legal advice or verified legal research.

## Why this exists

Started as a learning project to understand real-world RAG system design end-to-end — data pipelines, embedding models, vector databases, retrieval quality tuning (including debugging a mismatched similarity metric and adding cross-encoder re-ranking) — and grew into a deployed, full-featured site.
