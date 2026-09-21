# Legal Research Tool

An AI-powered semantic search engine for Indian Supreme Court judgments, built as a full-stack RAG (Retrieval-Augmented Generation) application.

Ask a legal question in plain English and get back a synthesized, cited answer generated from real judgment text — not keyword matching, but actual semantic understanding of the query and the case law.

## How it works

1. **Data ingestion** — pulls real 2023 Supreme Court judgment PDFs from the public [Indian Supreme Court Judgments dataset](https://github.com/vanga/indian-supreme-court-judgments) (AWS Open Data, CC-BY-4.0), extracts text with `pdfplumber`.
2. **Chunking & embedding** — splits judgments into overlapping ~350-word chunks, embeds each with a `sentence-transformers` bi-encoder (`multi-qa-mpnet-base-dot-v1`), and stores them in a local **Chroma** vector database configured for inner-product similarity.
3. **Two-stage retrieval** — a query first goes through fast approximate semantic search (top ~20 candidates), then a **cross-encoder re-ranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`) precisely re-scores those candidates against the exact query.
4. **Generation** — the top re-ranked chunks are passed to Claude (Anthropic API), which synthesizes a cited, structured answer grounded only in the retrieved text.
5. **API + frontend** — a FastAPI backend exposes `/search` (raw retrieval) and `/ask` (full RAG pipeline) endpoints; a React (Vite) frontend provides the search interface.

## Tech stack

- **Data**: `pandas`, `pdfplumber`, `requests`, `pyarrow`/`fastparquet`
- **Embeddings & retrieval**: `sentence-transformers`, `chromadb`
- **Backend**: `FastAPI`, `uvicorn`, Anthropic Python SDK
- **Frontend**: React, Vite, `react-markdown`

## Project structure

```
legal-research-tool/
├── fetch_corpus.py      # Stage 1: download real judgments
├── build_index.py       # Stage 2: chunk, embed, and index into Chroma
├── search.py             # Stage 2.5: two-stage retrieval (semantic + re-ranking)
├── main.py               # Stage 3: FastAPI backend (RAG pipeline)
├── frontend/              # React frontend
│   └── src/App.jsx
└── corpus/                # (gitignored) downloaded judgment text, regenerate with fetch_corpus.py
```

## Running it locally

**Backend:**
```bash
pip3 install -r requirements.txt   # or install packages individually, see below
python3 fetch_corpus.py            # downloads real judgments (~150 by default)
python3 build_index.py             # builds the vector index (~15-20 min on CPU)
export ANTHROPIC_API_KEY="your-key-here"
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`.

## Known limitations

- Corpus currently covers a sample of 2023 judgments only, not the full historical archive.
- Answers are only as good as the retrieved context; the system is instructed to say when it doesn't have enough information rather than guess.
- This is an educational research tool, not a substitute for professional legal advice or verified legal research.

## Why this exists

Built as a learning project to understand real-world RAG system design end-to-end: data pipelines, embedding models, vector databases, retrieval quality tuning (including debugging a mismatched similarity metric and validating retrieval with a two-stage re-ranking pipeline), and a working full-stack deployment.
