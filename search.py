"""
search.py

STAGE 2.5: Two-stage retrieval.

Stage A (fast, approximate): semantic search pulls a wide net of
candidate chunks from the vector database using the bi-encoder.

Stage B (slow, precise): a cross-encoder re-reads each candidate
directly against the exact query and re-scores it properly. This
fixes near-miss rankings that pure embedding search produces, at
the cost of being slower -- which is fine since it only runs on a
small shortlist (e.g. 20 candidates), not all 4,214 chunks.

This file can be run directly to test searches, and its search()
function will be imported by the backend API in Stage 3.
"""

import chromadb
from sentence_transformers import SentenceTransformer, CrossEncoder

COLLECTION_NAME = "supreme_court_judgments_v3"
BI_ENCODER_MODEL = "multi-qa-mpnet-base-dot-v1"
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
CANDIDATES = 20   # how many chunks Stage A pulls before re-ranking
TOP_K = 5         # how many to show after Stage B re-ranks them

print("Loading models (cross-encoder downloads ~80MB on first run)...")
bi_encoder = SentenceTransformer(BI_ENCODER_MODEL)
cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)

client = chromadb.PersistentClient(path="chroma_db")
collection = client.get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "ip"})


def search(query, top_k=TOP_K, candidates=CANDIDATES):
    # Stage A: fast semantic search over all chunks
    query_embedding = bi_encoder.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=candidates)

    docs = results["documents"][0]
    metas = results["metadatas"][0]

    if not docs:
        return []

    # Stage B: cross-encoder re-ranks just this shortlist, precisely
    pairs = [[query, doc] for doc in docs]
    scores = cross_encoder.predict(pairs)

    reranked = sorted(zip(scores, docs, metas), key=lambda x: x[0], reverse=True)
    return reranked[:top_k]


if __name__ == "__main__":
    query = input("Enter a legal search query: ")
    results = search(query)
    print(f"\nTop {len(results)} results after re-ranking:\n")
    for i, (score, doc, meta) in enumerate(results):
        marker = "  <-- ELDECO" if "1043" in meta["case_id"] else ""
        print(f"{i+1}. [score={score:.2f}] {meta['title'][:60]}{marker}")
        print(f"   {meta['citation']} | {meta['case_id']}")
        print(f"   {doc[:200]}...\n")
