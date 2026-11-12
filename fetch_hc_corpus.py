"""
fetch_hc_corpus.py

Downloads real Bombay High Court judgments, based on the structure
confirmed by discover_hc.py:
  - metadata gives us 'cnr' and 'decision_date' directly
  - real PDF filenames follow the pattern {cnr}_1_{decision_date}.pdf
  - not every metadata row has pdf_exists = True

If the constructed filename doesn't work (a different order number than
"_1_"), it falls back to asking the storage bucket directly for that
CNR's real filename, rather than guessing blindly.
"""

import requests
import pandas as pd
import pdfplumber
import os
import io
import time
import xml.etree.ElementTree as ET

BASE_URL = "https://indian-high-court-judgments.s3.ap-south-1.amazonaws.com"
# Defaults fetch the Bombay High Court. Another court, e.g. Delhi:
#   HC_COURT=7_26 HC_BENCHES=dhcdb HC_NAME="High Court of Delhi" NUM_PER_BENCH=2000 python3 fetch_hc_corpus.py
# (court codes and benches are listed in the bucket under metadata/parquet/year=YYYY/)
YEAR = int(os.environ.get("HC_YEAR", "2023"))
COURT = os.environ.get("HC_COURT", "27_1")  # Bombay High Court
BENCHES = os.environ.get("HC_BENCHES", "newos,newas,hcbgoa,hcaurdb,kolhcdb,newos_spl").split(",")  # excludes "testcase"
COURT_NAME = os.environ.get("HC_NAME", "Bombay High Court")
NUM_PER_BENCH = int(os.environ.get("NUM_PER_BENCH", "400"))

OUTPUT_DIR = "corpus_hc"
MANIFEST_PATH = f"{OUTPUT_DIR}/manifest.csv"
os.makedirs(f"{OUTPUT_DIR}/text", exist_ok=True)

ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}

if os.path.exists(MANIFEST_PATH):
    existing = pd.read_csv(MANIFEST_PATH)
    done_keys = set(existing["case_id"].astype(str))
else:
    existing = pd.DataFrame()
    done_keys = set()

new_rows = []


def find_real_filename(cnr, bench):
    """Fallback: ask the bucket directly for this CNR's actual filename."""
    list_url = f"{BASE_URL}/?list-type=2&prefix=data/pdf/year={YEAR}/court={COURT}/bench={bench}/{cnr}&max-keys=5"
    try:
        resp = requests.get(list_url, timeout=15)
        root = ET.fromstring(resp.content)
        keys = [c.find("s3:Key", ns).text for c in root.findall("s3:Contents", ns)]
        return keys[0] if keys else None
    except Exception:
        return None


for bench in BENCHES:
    print(f"\n=== Bench: {bench} ===")
    meta_url = f"{BASE_URL}/metadata/parquet/year={YEAR}/court={COURT}/bench={bench}/metadata.parquet"
    try:
        resp = requests.get(meta_url, timeout=60)
        if resp.status_code != 200:
            print(f"  No metadata found for this bench (status {resp.status_code}), skipping.")
            continue
    except Exception as e:
        print(f"  Error fetching metadata: {e}")
        continue

    temp_path = f"{OUTPUT_DIR}/_temp.parquet"
    with open(temp_path, "wb") as f:
        f.write(resp.content)
    try:
        metadata = pd.read_parquet(temp_path, engine="pyarrow")
    except Exception:
        metadata = pd.read_parquet(temp_path, engine="fastparquet")

    metadata = metadata[~metadata["cnr"].astype(str).isin(done_keys)]
    metadata = metadata.head(NUM_PER_BENCH).reset_index(drop=True)
    print(f"  {len(metadata)} judgments to try from this bench")

    saved_count = 0
    for _, row in metadata.iterrows():
        cnr = str(row["cnr"])
        case_id = cnr

        try:
            decision_date = pd.to_datetime(row["decision_date"]).strftime("%Y-%m-%d")
        except Exception:
            continue

        guessed_key = f"data/pdf/year={YEAR}/court={COURT}/bench={bench}/{cnr}_1_{decision_date}.pdf"
        pdf_url = f"{BASE_URL}/{guessed_key}"

        try:
            pdf_resp = requests.get(pdf_url, timeout=20)
        except requests.exceptions.RequestException:
            continue

        if pdf_resp.status_code != 200:
            real_key = find_real_filename(cnr, bench)
            if not real_key:
                continue
            try:
                pdf_resp = requests.get(f"{BASE_URL}/{real_key}", timeout=20)
            except requests.exceptions.RequestException:
                continue
            if pdf_resp.status_code != 200:
                continue

        try:
            with pdfplumber.open(io.BytesIO(pdf_resp.content)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        except Exception:
            continue

        if len(text.strip()) < 200:
            continue

        text_filename = f"{OUTPUT_DIR}/text/{case_id}.txt"
        with open(text_filename, "w", encoding="utf-8") as f:
            f.write(text)

        new_rows.append({
            "case_id": case_id,
            "title": str(row.get("title", "")),
            "citation": f"CNR {cnr}",
            "court": COURT_NAME,
            "decision_date": decision_date,
            "text_file": text_filename,
            "year": YEAR,
            "source_url": pdf_url,
            "doc_type": "judgment",
        })
        saved_count += 1
        if saved_count % 25 == 0:
            print(f"    ...{saved_count} saved so far from {bench}")

        time.sleep(0.15)

    print(f"  Saved {saved_count} judgments from {bench}")

    # Save progress after EVERY bench, so a crash later doesn't lose earlier work
    new_df = pd.DataFrame(new_rows)
    full_manifest = pd.concat([existing, new_df], ignore_index=True) if len(existing) else new_df
    full_manifest.to_csv(MANIFEST_PATH, index=False)

print(f"\nDone. Added {len(new_rows)} new High Court judgments this run.")
print(f"Total in corpus_hc: {len(full_manifest)}")
