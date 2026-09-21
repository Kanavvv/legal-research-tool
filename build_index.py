"""
build_index.py

STAGE 2 of the Legal Research Tool project.

Takes the judgment text files from Stage 1, breaks each one into
smaller overlapping chunks, converts each chunk into an "embedding"
(a list of numbers representing its meaning) using a free local AI
model, and stores everything in a local vector database (Chroma) --
ready for semantic search in Stage 3.
"""

import pandas as pd
import os
import chromadb
from sentence_transformers import SentenceTransformer

CORPUS_DIR = "corpus"
CHUNK_SIZE_WORDS = 350
CHUNK_OVERLAP_WORDS = 50

print("Loading the local embedding model (first run downloads it, ~420MB, one-time)...")
model = SentenceTransformer("multi-qa-mpnet-base-dot-v1")

manifest = pd.read_csv(f"{CORPUS_DIR}/manifest.csv")
print(f"Found {len(manifest)} judgments in the manifest.\n")

client = chromadb.PersistentClient(path="chroma_db")
collection = client.get_or_create_collection(
    "supreme_court_judgments_v3",
    metadata={"hnsw:space": "ip"},  # "ip" = inner product / dot product, what this model was trained for
)


def chunk_text(text, chunk_size=CHUNK_SIZE_WORDS, overlap=CHUNK_OVERLAP_WORDS):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


all_chunk_texts = []
all_chunk_ids = []
all_chunk_metadata = []

for idx, row in manifest.iterrows():
    text_file = row["text_file"]
    if not os.path.exists(text_file):
        print(f"  [{idx+1}/{len(manifest)}] MISSING: {text_file}", flush=True)
        continue

    file_size = os.path.getsize(text_file)
    print(f"  [{idx+1}/{len(manifest)}] Reading {text_file} ({file_size} bytes)...", flush=True)

    with open(text_file, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks):
        all_chunk_texts.append(chunk)
        all_chunk_ids.append(f"{row['case_id']}_chunk{i}")
        all_chunk_metadata.append({
            "case_id": str(row["case_id"]),
            "title": str(row["title"]),
            "citation": str(row["citation"]),
            "court": str(row["court"]),
            "decision_date": str(row["decision_date"]),
            "chunk_index": i,
        })

print(f"Split {len(manifest)} judgments into {len(all_chunk_texts)} chunks.")
print("Generating embeddings for all chunks (this may take a few minutes)...\n")

BATCH_SIZE = 64
for i in range(0, len(all_chunk_texts), BATCH_SIZE):
    batch_texts = all_chunk_texts[i:i + BATCH_SIZE]
    batch_ids = all_chunk_ids[i:i + BATCH_SIZE]
    batch_meta = all_chunk_metadata[i:i + BATCH_SIZE]

    embeddings = model.encode(batch_texts).tolist()

    collection.add(
        ids=batch_ids,
        embeddings=embeddings,
        documents=batch_texts,
        metadatas=batch_meta,
    )
    print(f"  Indexed {min(i + BATCH_SIZE, len(all_chunk_texts))}/{len(all_chunk_texts)} chunks")

print(f"\nDone. {collection.count()} chunks are now searchable in chroma_db/")
