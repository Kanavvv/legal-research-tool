"""
build_on_this_day.py -- one-time batch job: groups every judgment in your
corpus by its calendar day (month + day, ignoring year), and writes that
index to Firestore so the website can cheaply show "a judgment decided on
this day in history" without scanning the whole corpus on every page load.

Usage (from your legal-research-tool folder):
    python3 build_on_this_day.py
"""

import os
import sys
import re
from collections import defaultdict

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

MANIFEST = "corpus/manifest.csv"
SERVICE_ACCOUNT = "firebase-service-account.json"
MAX_PER_DAY = 15  # cap how many we store per calendar day, oldest/most varied kept


def extract_month_day(date_str):
    """Pulls MM-DD out of a date string, tolerant of a few common formats."""
    if not isinstance(date_str, str):
        return None
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", date_str)  # 2020-05-29
    if m:
        return f"{m.group(2)}-{m.group(3)}"
    m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", date_str)  # 29/05/2020 or 05-29-2020
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        # Heuristic: if the first number can't be a month, treat as DD-MM
        if a > 12:
            return f"{b:02d}-{a:02d}"
        return f"{a:02d}-{b:02d}"
    return None


def main():
    if not os.path.exists(MANIFEST):
        sys.exit(f"Can't find {MANIFEST}. Run this from your legal-research-tool folder.")
    if not os.path.exists(SERVICE_ACCOUNT):
        sys.exit(f"Can't find {SERVICE_ACCOUNT}. It should already be in this folder from the login setup.")

    cred = credentials.Certificate(SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    m = pd.read_csv(MANIFEST)
    date_col = "decision_date" if "decision_date" in m.columns else None
    if date_col is None:
        sys.exit("Couldn't find a decision_date column in your manifest.")

    by_day = defaultdict(list)
    skipped = 0

    for _, row in m.iterrows():
        md = extract_month_day(row.get(date_col))
        if not md:
            skipped += 1
            continue
        by_day[md].append({
            "case_id": str(row.get("case_id", "")),
            "title": str(row.get("title", "")),
            "citation": str(row.get("citation", "")),
            "decision_date": str(row.get(date_col, "")),
            "source_url": str(row.get("source_url", "")) if "source_url" in m.columns else "",
        })

    print(f"Grouped {sum(len(v) for v in by_day.values())} judgments into {len(by_day)} calendar days "
          f"({skipped} skipped -- missing or unparseable date).")

    batch = db.batch()
    batch_count = 0
    written = 0

    for month_day, items in by_day.items():
        # Keep a varied sample rather than always the same N (e.g. alphabetical skew)
        items = sorted(items, key=lambda x: x["decision_date"])[:MAX_PER_DAY]
        doc_ref = db.collection("on_this_day_index").document(month_day)
        batch.set(doc_ref, {"judgments": items})
        batch_count += 1
        written += 1
        if batch_count >= 450:
            batch.commit()
            batch = db.batch()
            batch_count = 0
            print(f"  ...written {written}/{len(by_day)}")

    if batch_count:
        batch.commit()

    print(f"\nDone. Wrote {written} calendar-day entries to Firestore (collection: on_this_day_index).")


if __name__ == "__main__":
    main()
