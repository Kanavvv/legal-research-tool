"""
optimize_qdrant.py

Makes the Qdrant collection safe for the full dataset on a low-RAM
(1 GiB) cluster:
  - full-precision vectors are stored on DISK instead of RAM
  - a compact int8-compressed copy is kept in RAM for fast search

Applied in place -- nothing is re-uploaded. The work happens on
Qdrant's servers, so it doesn't use your Mac's CPU.

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import os
from qdrant_client import QdrantClient, models

COLLECTION_NAME = "supreme_court_judgments"

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    timeout=120,
)

info = client.get_collection(COLLECTION_NAME)
print("BEFORE")
print("  points (chunks):", info.points_count)
print("  status:", info.status)
print("  vectors config:", info.config.params.vectors)
print("  quantization:", info.config.quantization_config)

try:
    client.update_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={"": models.VectorParamsDiff(on_disk=True)},
        hnsw_config=models.HnswConfigDiff(on_disk=True),
        quantization_config=models.ScalarQuantization(
            scalar=models.ScalarQuantizationConfig(
                type=models.ScalarType.INT8,
                quantile=0.99,
                always_ram=True,
            )
        ),
    )
    print("\nUpdate accepted by the server.")
except Exception as e:
    print("\nThe server rejected the update:")
    print(" ", e)
    raise SystemExit(1)

info = client.get_collection(COLLECTION_NAME)
print("\nAFTER")
print("  status:", info.status, "(may show 'yellow' for a while as it re-optimizes -- that's normal)")
print("  vectors config:", info.config.params.vectors)
print("  quantization:", info.config.quantization_config)
