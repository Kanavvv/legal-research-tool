"""
main.py

STAGE 3 of the Legal Research Tool project: the backend API.

This is a real web server. It exposes two endpoints:
  - GET  /search?q=...   -> raw re-ranked search results (from Stage 2)
  - POST /ask            -> the full RAG pipeline: searches, then asks
                             Claude to write an actual answer citing
                             the real cases found, instead of just
                             returning a list of chunks.

Run it with: uvicorn main:app --reload
Then visit http://127.0.0.1:8000/docs for an interactive test page
that FastAPI builds for you automatically.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic

from search import search  # reuses the two-stage retrieval from Stage 2.5

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    print("WARNING: ANTHROPIC_API_KEY environment variable is not set. /ask will fail until it is.")

client = anthropic.Anthropic(api_key=API_KEY)

app = FastAPI(title="Legal Research Tool API")

# Allows a frontend running on a different address (e.g. a local dev server)
# to actually call this API from the browser. Without this, browsers block it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Legal Research Tool API is running."}


@app.get("/search")
def search_endpoint(q: str):
    """Raw search results, no AI-generated answer -- useful for testing retrieval alone."""
    results = search(q)
    return {
        "query": q,
        "results": [
            {
                "score": float(score),
                "title": meta["title"],
                "citation": meta["citation"],
                "case_id": meta["case_id"],
                "excerpt": doc[:300],
            }
            for score, doc, meta in results
        ],
    }


@app.post("/ask")
def ask_endpoint(request: AskRequest):
    """The full RAG pipeline: search, then have Claude write a real answer with citations."""
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Server is missing ANTHROPIC_API_KEY.")

    results = search(request.question, top_k=5)
    if not results:
        return {"answer": "No relevant judgments were found for this question.", "sources": []}

    # Build the context block Claude will read to write its answer
    context_blocks = []
    for i, (score, doc, meta) in enumerate(results):
        context_blocks.append(
            f"[Source {i+1}] {meta['title']} ({meta['citation']})\n{doc}"
        )
    context_text = "\n\n---\n\n".join(context_blocks)

    system_prompt = (
        "You are a legal research assistant helping a law student. Answer the question "
        "using ONLY the provided case excerpts below. Cite sources by their [Source N] "
        "number and case name. If the excerpts don't fully answer the question, say so "
        "plainly rather than guessing. This is for educational research, not legal advice."
    )

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        system=system_prompt,
        messages=[{
            "role": "user",
            "content": f"Question: {request.question}\n\nCase excerpts:\n\n{context_text}",
        }],
    )

    answer_text = "".join(block.text for block in message.content if hasattr(block, "text"))

    return {
        "answer": answer_text,
        "sources": [
            {"title": meta["title"], "citation": meta["citation"], "case_id": meta["case_id"]}
            for _, _, meta in results
        ],
    }
