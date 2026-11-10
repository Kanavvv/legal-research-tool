"""
discover_hc.py

Before building the full High Court fetcher, this confirms the real
data structure -- same lesson learned from the Supreme Court dataset
(where guessing filenames wasted several rounds of debugging).

Checks:
1. What bench codes actually exist for Bombay High Court (court=27_1) in 2023
2. What columns the metadata parquet actually has (to find the real
   field name for the PDF filename/link)
3. What actual filenames exist in storage for one bench
"""

import requests
import xml.etree.ElementTree as ET
import pandas as pd
import io

BASE_URL = "https://indian-high-court-judgments.s3.ap-south-1.amazonaws.com"
YEAR = 2023
COURT = "27_1"  # Bombay High Court

ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}

print(f"=== Step 1: What benches exist for court={COURT}, year={YEAR}? ===")
list_url = f"{BASE_URL}/?list-type=2&prefix=metadata/parquet/year={YEAR}/court={COURT}/&delimiter=/"
resp = requests.get(list_url, timeout=30)
root = ET.fromstring(resp.content)
bench_prefixes = [p.find("s3:Prefix", ns).text for p in root.findall("s3:CommonPrefixes", ns)]
for p in bench_prefixes:
    print(" ", p)

if not bench_prefixes:
    print("No benches found -- check the court code or year.")
else:
    first_bench_prefix = bench_prefixes[0]
    print(f"\n=== Step 2: Metadata columns for {first_bench_prefix} ===")
    meta_url = f"{BASE_URL}/{first_bench_prefix}metadata.parquet"
    meta_resp = requests.get(meta_url, timeout=30)
    if meta_resp.status_code == 200:
        with open("_hc_temp.parquet", "wb") as f:
            f.write(meta_resp.content)
        try:
            df = pd.read_parquet("_hc_temp.parquet", engine="pyarrow")
        except Exception:
            df = pd.read_parquet("_hc_temp.parquet", engine="fastparquet")
        print("Columns:", list(df.columns))
        print(f"\nRow count: {len(df)}")
        print("\nFirst row sample:")
        print(df.iloc[0].to_dict())
    else:
        print(f"Could not fetch metadata.parquet (status {meta_resp.status_code})")

    print(f"\n=== Step 3: Actual PDF filenames in storage for this bench ===")
    pdf_prefix = first_bench_prefix.replace("metadata/parquet/", "data/pdf/")
    list_url2 = f"{BASE_URL}/?list-type=2&prefix={pdf_prefix}&max-keys=10"
    resp2 = requests.get(list_url2, timeout=30)
    root2 = ET.fromstring(resp2.content)
    for c in root2.findall("s3:Contents", ns):
        print(" ", c.find("s3:Key", ns).text)
