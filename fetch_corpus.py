"""
fetch_corpus.py (v2 -- multi-year, resumable)

Downloads real Indian Supreme Court judgments across MULTIPLE years,
extracts their text, and appends to a growing local corpus + manifest.

Resumable: if you run this again (e.g. to add another year, or because
a previous run was interrupted), it skips anything already downloaded
rather than starting over.
"""

import pandas as pd
import requests
import pdfplumber
import os
import io
import time

# Add/remove years here. Run this script again any time to fetch more.
# Covers ~30 years to reach toward the 4GB free-tier ceiling (~26,000 judgments).
# Each year naturally yields roughly 800-1000 English judgments regardless of
# NUM_PER_YEAR, so more years -- not a higher number here -- is what grows the corpus.
# Which years to fetch. Override without editing this file, e.g.:
#   FETCH_YEARS=2026,2025,2024 python3 fetch_corpus.py
_years_env = os.environ.get("FETCH_YEARS", "").strip()
if _years_env:
    YEARS = [int(y) for y in _years_env.split(",") if y.strip()]
else:
    YEARS = list(range(2023, 1993, -1))  # 2023 down to 1994, newest first
NUM_PER_YEAR = 5000  # effectively "take everything available" per year

OUTPUT_DIR = "corpus"
MANIFEST_PATH = f"{OUTPUT_DIR}/manifest.csv"
os.makedirs(f"{OUTPUT_DIR}/text", exist_ok=True)

BASE_URL = "https://indian-supreme-court-judgments.s3.amazonaws.com"

# Load existing manifest so we know what's already done
if os.path.exists(MANIFEST_PATH) and os.path.getsize(MANIFEST_PATH) > 0:
    try:
        existing_manifest = pd.read_csv(MANIFEST_PATH)
        done_case_ids = set(existing_manifest["case_id"].astype(str))
        print(f"Found existing manifest with {len(done_case_ids)} judgments already fetched.")
    except Exception:
        existing_manifest = pd.DataFrame()
        done_case_ids = set()
else:
    existing_manifest = pd.DataFrame()
    done_case_ids = set()

new_rows = []

for YEAR in YEARS:
    print(f"\n=== YEAR {YEAR} ===")
    metadata_url = f"{BASE_URL}/metadata/parquet/year={YEAR}/metadata.parquet"
    try:
        resp = requests.get(metadata_url, timeout=60)
        resp.raise_for_status()
    except Exception as e:
        print(f"  Could not fetch metadata for {YEAR}: {e}")
        continue

    temp_parquet = f"{OUTPUT_DIR}/_metadata_temp.parquet"
    with open(temp_parquet, "wb") as f:
        f.write(resp.content)

    try:
        metadata = pd.read_parquet(temp_parquet, engine="pyarrow")
    except Exception:
        metadata = pd.read_parquet(temp_parquet, engine="fastparquet")

    print(f"  Found {len(metadata)} total judgments for {YEAR}")

    metadata = metadata[metadata["available_languages"].apply(lambda x: "ENG" in str(x).split(","))]
    metadata = metadata[~metadata["case_id"].astype(str).isin(done_case_ids)]  # skip already-done
    metadata = metadata.head(NUM_PER_YEAR).reset_index(drop=True)
    print(f"  {len(metadata)} new English judgments to fetch this run")

    for i, row in metadata.iterrows():
        case_id = row.get("case_id", f"case_{YEAR}_{i}")
        safe_id = str(case_id).replace("/", "_").replace(" ", "_")
        pdf_path = row.get("path", "")
        if not pdf_path:
            continue

        pdf_url = f"{BASE_URL}/data/pdf/year={YEAR}/english/{os.path.basename(pdf_path)}_EN.pdf"

        try:
            pdf_resp = requests.get(pdf_url, timeout=30)
            if pdf_resp.status_code != 200:
                continue

            with pdfplumber.open(io.BytesIO(pdf_resp.content)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)

            if len(text.strip()) < 200:
                continue

            text_filename = f"{OUTPUT_DIR}/text/{safe_id}.txt"
            with open(text_filename, "w", encoding="utf-8") as f:
                f.write(text)

            new_rows.append({
                "case_id": case_id, "title": row.get("title", ""),
                "petitioner": row.get("petitioner", ""), "respondent": row.get("respondent", ""),
                "citation": row.get("citation", ""), "court": row.get("court", ""),
                "decision_date": row.get("decision_date", ""), "text_file": text_filename,
                "year": YEAR, "source_url": pdf_url,
            })

            if len(new_rows) % 50 == 0:
                print(f"    ...{len(new_rows)} new judgments saved so far this run")

        except Exception as e:
            pass

        time.sleep(0.15)

    # Save progress after EVERY year, so pressing Control+C never loses
    # everything -- at worst you lose the current year's partial progress
    new_df = pd.DataFrame(new_rows)
    full_manifest = pd.concat([existing_manifest, new_df], ignore_index=True) if len(existing_manifest) else new_df
    full_manifest.to_csv(MANIFEST_PATH, index=False)
    print(f"  Saved progress: {len(full_manifest)} total judgments in manifest so far")

print(f"\nDone. Added {len(new_rows)} new judgments this run.")
print(f"Total judgments in corpus now: {len(full_manifest)}")
