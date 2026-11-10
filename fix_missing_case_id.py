"""
fix_missing_case_id.py

One-time fix for the single judgment whose case_id was blank in the
manifest (M/S. KALAMANI TEX & ANR versus P. BALASUBRAMANIAN). It:
  1. Finds the blank-case_id row(s) in corpus/manifest.csv and gives each
     a real, unique case_id derived from its citation/title/year.
  2. Removes the stray "nan"-keyed chunks already sitting in Qdrant, so
     re-indexing doesn't leave old, mis-keyed data behind.

After running this, run build_index.py (same MIN_YEAR as before) once
more -- it will pick up the newly-fixed row as a normal new document.

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import os
import re
import shutil
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, PointIdsList

MANIFEST = "corpus/manifest.csv"
COLLECTION_NAME = "supreme_court_judgments"

if not os.path.exists(MANIFEST):
    raise SystemExit(f"Can't find {MANIFEST}. Run this from your legal-research-tool folder.")

m = pd.read_csv(MANIFEST)
blank = m["case_id"].isna() | (m["case_id"].astype(str).str.strip() == "") | (m["case_id"].astype(str) == "nan")
n_blank = blank.sum()

if n_blank == 0:
    print("No blank case_id rows found -- nothing to fix.")
else:
    print(f"Found {n_blank} row(s) with a blank case_id:")
    for idx in m[blank].index:
        print(f"   {m.at[idx, 'title']}")

    shutil.copy(MANIFEST, MANIFEST + ".bak")
    print(f"\nBacked up the original manifest to {MANIFEST}.bak")

    for idx in m[blank].index:
        title = str(m.at[idx, "title"])
        year = m.at[idx, "year"] if "year" in m.columns and pd.notna(m.at[idx, "year"]) else ""
        slug = re.sub(r"[^A-Za-z0-9]+", "_", title)[:40].strip("_").upper()
        new_id = f"{int(year) if year != '' else 'UNK'}_FIXED_{slug}"
        m.at[idx, "case_id"] = new_id
        print(f"Assigned new case_id: {new_id}")

    m.to_csv(MANIFEST, index=False)
    print(f"\nSaved the corrected manifest to {MANIFEST}")

# Remove the stray "nan"-keyed chunks from Qdrant, if any
client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    timeout=60,
)
# Removing the stray "nan"-keyed chunks needs a search index on case_id
# (delete-by-filter requires one); create it if it isn't there yet.
from qdrant_client.models import PayloadSchemaType
try:
    client.create_payload_index(
        collection_name=COLLECTION_NAME, field_name="case_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print("Created a search index on case_id (helps future scripts too).")
except Exception:
    pass  # already exists

# Find and delete the stray points by ID (works with or without an index,
# and only reads the small case_id field, not the full chunk text).
stray_ids = []
offset = None
while True:
    points, offset = client.scroll(
        collection_name=COLLECTION_NAME, limit=1000, offset=offset,
        with_payload=["case_id"], with_vectors=False,
    )
    stray_ids.extend(p.id for p in points if p.payload.get("case_id") == "nan")
    if offset is None:
        break

if stray_ids:
    client.delete(collection_name=COLLECTION_NAME, points_selector=PointIdsList(points=stray_ids))
    print(f"\nRemoved {len(stray_ids)} stray chunks stored under case_id 'nan' from Qdrant.")
else:
    print("\nNo stray 'nan'-keyed chunks found in Qdrant.")
print("Next: run build_index.py again (with the same MIN_YEAR you used before) "
      "to properly index the fixed documents.")
