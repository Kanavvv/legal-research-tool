"""
fetch_statutes.py (v2 -- better matching + real diagnostics)

Fixes from the first attempt:
1. Act matching now requires the target name to actually START the
   Act's title (after stripping "The "), so "Motor Vehicles Act"
   matches the real central Act, not a Maharashtra-specific one.
2. Prints the RAW first API response before the main loop, so if
   section fetching still fails, we see exactly why instead of
   guessing field names blind a second time.
"""

import requests
import pandas as pd
import os
import time
import io

BASE = "https://indiacode.ecourtsindia.com"
OUTPUT_DIR = "corpus_statutes"
MANIFEST_PATH = f"{OUTPUT_DIR}/manifest.csv"
os.makedirs(f"{OUTPUT_DIR}/text", exist_ok=True)

TARGET_ACTS = [
    "Indian Contract Act",
    "Specific Relief Act",
    "Arbitration and Conciliation Act",
    "Transfer of Property Act",
    "Sale of Goods Act",
    "Negotiable Instruments Act",
    "Hindu Marriage Act",
    "Motor Vehicles Act",
    "Consumer Protection Act",
    "Constitution of India",
]

MAX_SECTIONS_PER_ACT = 100000  # effectively: every section of each Act

print("Downloading the Acts index...")
acts_resp = requests.get(f"{BASE}/data/acts.csv", timeout=60)
acts_resp.raise_for_status()
acts_df = pd.read_csv(io.StringIO(acts_resp.text))

name_col = "short_title"
slug_col = "id"

def normalize(title):
    return str(title).strip()[4:] if str(title).strip().lower().startswith("the ") else str(title).strip()

matched_acts = []
for target in TARGET_ACTS:
    candidates = acts_df[acts_df[name_col].apply(lambda t: normalize(t).lower().startswith(target.lower()))]
    if len(candidates) > 0:
        # Prefer the shortest slug -- tends to be the canonical/main Act, not a regional variant
        candidates = candidates.assign(_slug_len=candidates[slug_col].astype(str).str.len())
        row = candidates.sort_values("_slug_len").iloc[0]
        matched_acts.append({"search_term": target, "name": row[name_col], "slug": row[slug_col]})
        print(f"  Matched '{target}' -> {row[name_col]} (slug: {row[slug_col]})")
    else:
        print(f"  NOT FOUND: '{target}' -- skipping")

print(f"\nDownloading the section index...")
sections_resp = requests.get(f"{BASE}/data/sections.csv", timeout=60)
sections_resp.raise_for_status()
sections_df = pd.read_csv(io.StringIO(sections_resp.text))

section_act_col = "act"
section_num_col = "number"

if os.path.exists(MANIFEST_PATH) and os.path.getsize(MANIFEST_PATH) > 0:
    try:
        existing = pd.read_csv(MANIFEST_PATH)
        done_keys = set(existing["case_id"].astype(str))
    except Exception:
        existing = pd.DataFrame()
        done_keys = set()
else:
    existing = pd.DataFrame()
    done_keys = set()

new_rows = []
debug_printed = True  # debug output no longer needed

for act in matched_acts:
    slug = act["slug"]
    act_sections = sections_df[sections_df[section_act_col].astype(str) == str(slug)]
    act_sections = act_sections.head(MAX_SECTIONS_PER_ACT)
    print(f"\n=== {act['name']} ({len(act_sections)} sections to try) ===")

    saved_this_act = 0
    for _, srow in act_sections.iterrows():
        section_num = str(srow[section_num_col])
        case_id = f"{slug}_s{section_num}"
        if case_id in done_keys:
            continue

        url = f"{BASE}/api/v1/{slug}/section/{section_num}"

        if not debug_printed:
            debug_resp = requests.get(url, timeout=20)
            print(f"\n  [DEBUG] URL: {url}")
            print(f"  [DEBUG] Status: {debug_resp.status_code}")
            print(f"  [DEBUG] Raw response (first 1000 chars): {debug_resp.text[:1000]}")
            debug_printed = True
            resp = debug_resp
        else:
            try:
                resp = requests.get(url, timeout=20)
            except Exception:
                continue

        if resp.status_code != 200:
            continue

        try:
            data = resp.json()
        except Exception:
            continue

        section_obj = data.get("section", {})
        text = section_obj.get("text") or ""
        title = section_obj.get("heading") or f"Section {section_num}"
        if len(text.strip()) < 30:
            continue

        text_filename = f"{OUTPUT_DIR}/text/{case_id}.txt"
        with open(text_filename, "w", encoding="utf-8") as f:
            f.write(f"{act['name']} - Section {section_num}: {title}\n\n{text}")

        new_rows.append({
            "case_id": case_id,
            "title": f"{act['name']}, Section {section_num}: {title}",
            "citation": f"{act['name']}, S. {section_num}",
            "court": "", "decision_date": "", "text_file": text_filename,
            "year": None, "source_url": f"{BASE}/{slug}/section/{section_num}/",
            "doc_type": "statute",
        })
        saved_this_act += 1
        time.sleep(0.1)

    print(f"  Saved {saved_this_act} new sections from this Act")

    # Save progress after every Act so an interruption never loses the run
    new_df = pd.DataFrame(new_rows)
    full_manifest = pd.concat([existing, new_df], ignore_index=True) if len(existing) else new_df
    if len(full_manifest):
        full_manifest.to_csv(MANIFEST_PATH, index=False)

print(f"\nDone. Added {len(new_rows)} new sections this run.")
print(f"Total statute sections in corpus: {len(full_manifest)}")
