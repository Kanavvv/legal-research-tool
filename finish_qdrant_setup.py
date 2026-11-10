"""
finish_qdrant_setup.py

Second step of getting the Qdrant collection ready for the full dataset
on a small (1 GiB RAM) cluster:
  1. Moves the text/metadata payloads to disk, keeping RAM free
  2. Adds indexes on year / court / doc_type so the search filters stay fast
  3. Prints the real 'court' values stored, so the website's court filter
     can match them exactly

Run it only once the collection status is GREEN (the first optimization
has finished). If it says the collection is still optimizing, wait 10-15
minutes and run it again.

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import os
from collections import Counter
from qdrant_client import QdrantClient, models

COLLECTION_NAME = "supreme_court_judgments"

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    timeout=120,
)

info = client.get_collection(COLLECTION_NAME)
status = getattr(info.status, "value", str(info.status)).lower()
print(f"Status: {status} | chunks: {info.points_count}")
print(f"Payload already on disk: {info.config.params.on_disk_payload}")

if status != "green":
    print("\nThe collection is still re-optimizing. Wait 10-15 minutes and run this again.")
    raise SystemExit(0)

# 1. Payload to disk
if not info.config.params.on_disk_payload:
    client.update_collection(
        collection_name=COLLECTION_NAME,
        collection_params=models.CollectionParamsDiff(on_disk_payload=True),
    )
    print("Payload moved to disk.")
else:
    print("Payload was already on disk -- nothing to change.")

# 2. Indexes so filtered searches (year / court / type) stay fast
for field, schema in [
    ("year", models.PayloadSchemaType.INTEGER),
    ("court", models.PayloadSchemaType.KEYWORD),
    ("doc_type", models.PayloadSchemaType.KEYWORD),
]:
    try:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name=field,
            field_schema=schema,
        )
        print(f"Index created on '{field}'.")
    except Exception as e:
        print(f"Could not index '{field}': {e}")

# 3. What values are actually stored? (sample of 2000 chunks)
points, _ = client.scroll(
    collection_name=COLLECTION_NAME,
    limit=2000,
    with_payload=["court", "doc_type", "year"],
    with_vectors=False,
)
print("\nSample of 2000 chunks:")
print("  doc_type values:", dict(Counter(str(p.payload.get("doc_type")) for p in points)))
print("  court values:   ", dict(Counter(str(p.payload.get("court")) for p in points)))
years = sorted({p.payload.get("year") for p in points if p.payload.get("year")})
print("  years present:  ", years)
