"""
fetch_landmarks.py

Adds the older Supreme Court judgments (1950-2001) that today's judgments keep
relying on, rather than every judgment from those years. "Landmark" here is
measured, not guessed: a case counts by how many judgments already in the
corpus (Supreme Court 2002 onward, and the High Courts) cite it, either by its
S.C.R. citation or by its party names.

    python3 fetch_landmarks.py --dry-run        # rank and print the top 40, fetch nothing
    python3 fetch_landmarks.py --top 1500       # fetch the top 1500 into corpus/text

Writes corpus/manifest_landmarks.csv, which build_index.py picks up.
Source: the indian-supreme-court-judgments open dataset on AWS (same as fetch_corpus.py).
"""
import argparse
import collections
import glob
import io
import os
import time
from concurrent.futures import ProcessPoolExecutor

import pandas as pd
import pdfplumber
import requests

from citation_scan import find_case_names, find_citations, name_key

BASE_URL = "https://indian-supreme-court-judgments.s3.amazonaws.com"
META_DIR = "corpus/_meta"
OUT_MANIFEST = "corpus/manifest_landmarks.csv"
TEXT_DIR = "corpus/text"
YEARS = range(1950, 2002)
CITING_DIRS = ["corpus/text", "corpus_hc/text"]
UA = {"User-Agent": "NyayaCorpusBuilder/1.0 (asknyaya.in)"}


def load_metadata():
    os.makedirs(META_DIR, exist_ok=True)
    frames = []
    for year in YEARS:
        path = f"{META_DIR}/{year}.parquet"
        if not os.path.exists(path):
            r = requests.get(f"{BASE_URL}/metadata/parquet/year={year}/metadata.parquet", headers=UA, timeout=60)
            if r.status_code != 200:
                print(f"  no metadata for {year}")
                continue
            with open(path, "wb") as f:
                f.write(r.content)
        m = pd.read_parquet(path)
        m["year"] = year
        frames.append(m)
    meta = pd.concat(frames, ignore_index=True)
    meta = meta[meta["available_languages"].apply(lambda x: "ENG" in str(x).split(","))]
    return meta.reset_index(drop=True)


def keys_for_row(row):
    keys = {k for _fam, k, _y, _raw in find_citations(str(row.get("citation") or ""))}
    nk = name_key(row.get("petitioner") or "", row.get("respondent") or "")
    if nk:
        keys.add(("name",) + nk)
    return keys


def keys_in_file(path):
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            text = f.read()
    except OSError:
        return set()
    keys = {k for _fam, k, year, _raw in find_citations(text) if year < 2002}
    keys |= {("name",) + k for k, _raw in find_case_names(text)}
    return keys


def rank(meta):
    # key -> meta row; a key two rows share (common party names) identifies neither
    owner, clash = {}, set()
    for i, row in meta.iterrows():
        for k in keys_for_row(row):
            if k in owner and owner[k] != i:
                clash.add(k)
            owner[k] = i
    for k in clash:
        owner.pop(k, None)
    print(f"{len(meta)} English judgments 1950-2001; {len(owner)} usable keys ({len(clash)} ambiguous dropped)")

    files = [p for d in CITING_DIRS for p in glob.glob(f"{d}/*.txt")]
    print(f"Scanning {len(files)} judgments for citations to them…")
    counts = collections.Counter()
    with ProcessPoolExecutor() as pool:
        for keys in pool.map(keys_in_file, files, chunksize=64):
            for i in {owner[k] for k in keys if k in owner}:
                counts[i] += 1
    return counts


def fetch_text(row):
    url = f"{BASE_URL}/data/pdf/year={row['year']}/english/{os.path.basename(str(row['path']))}_EN.pdf"
    r = requests.get(url, headers=UA, timeout=60)
    if r.status_code != 200:
        return None, url
    with pdfplumber.open(io.BytesIO(r.content)) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    return (text if len(text.strip()) >= 200 else None), url


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=1500)
    ap.add_argument("--min-citing", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    meta = load_metadata()
    have = set()
    for m in glob.glob("corpus/manifest*.csv"):
        have |= set(pd.read_csv(m, usecols=["case_id"])["case_id"].astype(str))
    counts = rank(meta)
    chosen = [(n, i) for i, n in counts.most_common() if n >= a.min_citing
              and str(meta.at[i, "case_id"]) not in have][:a.top]
    print(f"\n{len(chosen)} landmarks chosen (cited by at least {a.min_citing} judgments). Top 40:")
    for n, i in chosen[:40]:
        print(f"  {n:4d}  {meta.at[i, 'year']}  {str(meta.at[i, 'title'])[:80]}  {meta.at[i, 'citation']}")
    if a.dry_run:
        return

    os.makedirs(TEXT_DIR, exist_ok=True)
    rows = []
    if os.path.exists(OUT_MANIFEST):
        rows = pd.read_csv(OUT_MANIFEST).to_dict("records")
    done = {str(r["case_id"]) for r in rows}
    for k, (n, i) in enumerate(chosen, 1):
        row = meta.loc[i]
        case_id = str(row["case_id"])
        if case_id in done:
            continue
        try:
            text, url = fetch_text(row)
        except Exception as e:
            print(f"  skip {case_id}: {e}")
            continue
        if not text:
            continue
        path = f"{TEXT_DIR}/{case_id.replace('/', '_').replace(' ', '_')}.txt"
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        rows.append({"case_id": case_id, "title": row.get("title", ""), "petitioner": row.get("petitioner", ""),
                     "respondent": row.get("respondent", ""), "citation": row.get("citation", ""),
                     "court": "Supreme Court of India", "decision_date": row.get("decision_date", ""),
                     "text_file": path, "year": int(row["year"]), "source_url": url, "doc_type": "judgment",
                     "cited_by": n})
        if k % 50 == 0:
            pd.DataFrame(rows).to_csv(OUT_MANIFEST, index=False)
            print(f"  {k}/{len(chosen)} fetched")
        time.sleep(0.1)
    pd.DataFrame(rows).to_csv(OUT_MANIFEST, index=False)
    print(f"\nWrote {len(rows)} landmark judgments to {OUT_MANIFEST}")


if __name__ == "__main__":
    main()
