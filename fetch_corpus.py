"""
fetch_corpus.py

STAGE 1 of the Legal Research Tool project.

Downloads a manageable batch of REAL Indian Supreme Court judgments
(public domain, via AWS Open Data / eCourts) for a chosen year,
extracts their text, and saves everything into a local "corpus"
folder ready for the next stage (embeddings + vector search).

Source: https://github.com/vanga/indian-supreme-court-judgments
License: CC-BY-4.0
"""

import pandas as pd
import requests
import pdfplumber
import os
import io
import time

YEAR = 2023          # which year of judgments to pull
NUM_JUDGMENTS = 150  # how many to download for this first batch (keep small to start)

OUTPUT_DIR = "corpus"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/text", exist_ok=True)

BASE_URL = "https://indian-supreme-court-judgments.s3.amazonaws.com"

# ---- Step 1: download that year's metadata (tells us what judgments exist) ----
metadata_url = f"{BASE_URL}/metadata/parquet/year={YEAR}/metadata.parquet"
print(f"Downloading metadata for {YEAR}...")
resp = requests.get(metadata_url, timeout=60)
resp.raise_for_status()

temp_parquet = f"{OUTPUT_DIR}/_metadata_temp.parquet"
with open(temp_parquet, "wb") as f:
    f.write(resp.content)

try:
    metadata = pd.read_parquet(temp_parquet, engine="pyarrow")
except Exception as e1:
    print(f"pyarrow engine failed ({e1}), trying fastparquet instead...")
    metadata = pd.read_parquet(temp_parquet, engine="fastparquet")

print(f"Found {len(metadata)} total judgments for {YEAR}")

# Keep only ones with English available (language codes are like "ENG,HIN,PUN")
metadata = metadata[metadata["available_languages"].apply(lambda x: "ENG" in str(x).split(","))]
metadata = metadata.head(NUM_JUDGMENTS).reset_index(drop=True)
print(f"Downloading {len(metadata)} English judgments...\n")

manifest_rows = []

for i, row in metadata.iterrows():
    case_id = row.get("case_id", f"case_{i}")
    safe_id = str(case_id).replace("/", "_").replace(" ", "_")
    pdf_path = row.get("path", "")

    if not pdf_path:
        continue

    pdf_url = f"{BASE_URL}/data/pdf/year={YEAR}/english/{os.path.basename(pdf_path)}_EN.pdf"

    try:
        pdf_resp = requests.get(pdf_url, timeout=30)
        if pdf_resp.status_code != 200:
            print(f"  [{i+1}/{len(metadata)}] Skipped {safe_id} (not found)")
            continue

        with pdfplumber.open(io.BytesIO(pdf_resp.content)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        if len(text.strip()) < 200:
            print(f"  [{i+1}/{len(metadata)}] Skipped {safe_id} (barely any text extracted)")
            continue

        text_filename = f"{OUTPUT_DIR}/text/{safe_id}.txt"
        with open(text_filename, "w", encoding="utf-8") as f:
            f.write(text)

        manifest_rows.append({
            "case_id": case_id,
            "title": row.get("title", ""),
            "petitioner": row.get("petitioner", ""),
            "respondent": row.get("respondent", ""),
            "citation": row.get("citation", ""),
            "court": row.get("court", ""),
            "decision_date": row.get("decision_date", ""),
            "text_file": text_filename,
        })
        print(f"  [{i+1}/{len(metadata)}] Saved {safe_id}")

    except Exception as e:
        print(f"  [{i+1}/{len(metadata)}] Error on {safe_id}: {e}")

    time.sleep(0.2)  # be polite to the server, don't hammer it

manifest = pd.DataFrame(manifest_rows)
manifest.to_csv(f"{OUTPUT_DIR}/manifest.csv", index=False)

print(f"\nDone. Saved {len(manifest)} judgments with text to {OUTPUT_DIR}/text/")
print(f"Manifest (case info) saved to {OUTPUT_DIR}/manifest.csv")
