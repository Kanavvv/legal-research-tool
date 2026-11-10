"""
create_title_index.py -- one-time setup: tells Qdrant to build a real
full-text search index on the "title" field, so case names can be found
by actual text matching instead of semantic/meaning-based search (which
is great for legal questions, but unreliable for finding one specific
case by its exact name).

Usage (from your legal-research-tool folder):
    python3 create_title_index.py
"""

import os
from qdrant_client import QdrantClient
from qdrant_client.models import TextIndexParams, TokenizerType

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
COLLECTION_NAME = "supreme_court_judgments"

if not QDRANT_URL or not QDRANT_API_KEY:
    raise SystemExit(
        "Set QDRANT_URL and QDRANT_API_KEY as environment variables first, "
        "same values you use for the backend (export QDRANT_URL=... etc)."
    )

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

print("Creating a full-text index on the 'title' field...")
client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="title",
    field_schema=TextIndexParams(type="text", tokenizer=TokenizerType.WORD, lowercase=True),
)
print("Done. Case titles can now be found by real text search, not just semantic similarity.")
