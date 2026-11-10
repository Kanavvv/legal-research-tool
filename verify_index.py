"""
verify_index.py

Checks that every document that SHOULD be indexed actually IS indexed in
Qdrant -- by reading Qdrant directly, not by trusting indexed_case_ids.txt
(which only records what build_index.py thinks it uploaded).

Applies the same MIN_YEAR filter and duplicate-row handling as
build_index.py, so "should be indexed" means the same thing here as it
did during indexing.

Usage (matching how you ran build_index.py):
    MIN_YEAR=2010 python3 verify_index.py

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import os
import pandas as pd
from qdrant_client import QdrantClient

CORPUS_MANIFESTS = [
    "corpus/manifest.csv",
    "corpus_statutes/manifest.csv",
    "corpus_hc/manifest.csv",
]
COLLECTION_NAME = "supreme_court_judgments"
SCROLL_BATCH = 1000
MIN_YEAR = int(os.environ.get("MIN_YEAR", "0"))

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    timeout=120,
)

# ---- 1. What SHOULD be indexed, per the manifests -----------------------
manifests = []
for path in CORPUS_MANIFESTS:
    if os.path.exists(path):
        manifests.append(pd.read_csv(path))
    else:
        print(f"(skipping {path} -- not found)")

manifest = pd.concat(manifests, ignore_index=True)
manifest = manifest.drop_duplicates(subset="case_id", keep="first")
manifest["case_id"] = manifest["case_id"].astype(str)

if MIN_YEAR:
    year_numbers = pd.to_numeric(manifest["year"], errors="coerce")
    manifest = manifest[year_numbers.isna() | (year_numbers >= MIN_YEAR)]
    print(f"MIN_YEAR={MIN_YEAR}: checking only documents from {MIN_YEAR} onward "
          f"(same filter used when indexing).")

# Documents whose text file is missing locally were never indexable in the
# first place -- these are expected skips, not a sign of missing data.
has_file = manifest["text_file"].apply(lambda p: isinstance(p, str) and os.path.exists(p))
missing_file = manifest[~has_file]
eligible = manifest[has_file]

print(f"\n{len(manifest)} documents should be indexed under this filter.")
if len(missing_file):
    print(f"({len(missing_file)} of those have no local text file -- these were never "
          f"indexable and are expected to be missing, not a problem.)")
print(f"{len(eligible)} documents SHOULD actually be in Qdrant right now.\n")

expected_ids = set(eligible["case_id"])
title_of = dict(zip(eligible.case_id, eligible.title.fillna("").astype(str)))

# ---- 2. What's ACTUALLY in Qdrant, read directly -------------------------
print("Reading every case_id actually stored in Qdrant...")
found_ids = set()
scanned = 0
offset = None
while True:
    points, offset = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=SCROLL_BATCH,
        offset=offset,
        with_payload=["case_id"],
        with_vectors=False,
    )
    for p in points:
        found_ids.add(p.payload.get("case_id"))
    scanned += len(points)
    if scanned % 20000 < SCROLL_BATCH:
        print(f"  scanned {scanned} chunks so far")
    if offset is None:
        break

print(f"Scanned {scanned} chunks, covering {len(found_ids)} distinct documents in Qdrant.\n")

# ---- 3. Compare -----------------------------------------------------------
missing = expected_ids - found_ids
extra = found_ids - expected_ids   # in Qdrant but not expected under this filter (e.g. an earlier, wider run)

print("=== Result ===")
if not missing:
    print(f"All {len(expected_ids)} expected documents are present in Qdrant. Nothing missing.")
else:
    print(f"{len(missing)} of {len(expected_ids)} expected documents are MISSING from Qdrant.")
    print("First 20 missing:")
    for cid in list(missing)[:20]:
        print(f"   {cid}  --  {title_of.get(cid, '')[:70]}")
    pd.DataFrame({"case_id": sorted(missing)}).to_csv("missing_from_index.csv", index=False)
    print(f"\nFull list written to missing_from_index.csv")

if extra:
    print(f"\n(Also: {len(extra)} documents in Qdrant fall outside this MIN_YEAR filter -- "
          f"expected if you've indexed a wider range before, not a problem.)")
