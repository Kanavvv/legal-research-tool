"""
build_citation_graph.py -- the precedent graph behind "cited by" and "relies on".

Reads every indexed Supreme Court judgment's text, finds the judgments it
cites (by reporter citation, or by party names when that names exactly one
judgment), and writes one Firestore document per judgment to `case_graph`:

    cites:          judgments this one relies on
    cited_by:       later judgments that cite this one (most recent first)
    cited_by_count
    overruled_mentions: later judgments whose text says this one was overruled,
                        near where they cite it (a prompt to check, not a ruling)

Reuses the citation patterns from citation_scan.py.

Usage (from the legal-research-tool folder):
    python3 build_citation_graph.py            # dry run: prints stats only
    python3 build_citation_graph.py --write    # also writes to Firestore
Needs firebase-service-account.json for --write.
"""

import json
import os
import re
import sys
from collections import defaultdict

import pandas as pd

from citation_scan import find_citations, find_case_names, name_key

MANIFEST = "corpus/manifest.csv"
INDEXED = "indexed_case_ids.txt"
COLLECTION = os.environ.get("GRAPH_COLLECTION", "case_graph")
MAX_LIST = 60  # cap the lists stored per judgment

OVERRULE = re.compile(r"\boverrul(?:ed|ing|es)\b", re.I)
NOT_OVERRULE = re.compile(r"\b(?:not|never|cannot be|could not be|has not been|was not)\s+(?:\w+\s+){0,2}overrul", re.I)


def doc_id(case_id):
    return case_id.replace("/", "%2F")


def main(write=False):
    m = pd.read_csv(MANIFEST)
    m["case_id"] = m["case_id"].astype(str)
    indexed = {line.strip() for line in open(INDEXED) if line.strip()}
    m = m[m["case_id"].isin(indexed)]
    print(f"Indexed judgments in manifest: {len(m)}")

    cite_index, name_index = {}, defaultdict(list)
    info = {}
    for row in m.itertuples():
        cid = row.case_id
        info[cid] = {
            "case_id": cid,
            "title": str(row.title) if isinstance(row.title, str) else "",
            "citation": str(row.citation) if isinstance(row.citation, str) else "",
            "year": int(row.year) if pd.notna(row.year) else None,
            "date": str(row.decision_date) if isinstance(row.decision_date, str) else "",
        }
        if isinstance(row.citation, str):
            for _, key, _, _ in find_citations(row.citation):
                cite_index.setdefault(key, cid)
        key = None
        if isinstance(row.petitioner, str) and isinstance(row.respondent, str) and row.petitioner.strip() and row.respondent.strip():
            key = name_key(row.petitioner, row.respondent)
        if key is None and isinstance(row.title, str):
            parts = re.split(r"\s+(?:vs\.?|v\.|v/s|versus)\s+", row.title, maxsplit=1, flags=re.I)
            if len(parts) == 2:
                key = name_key(parts[0], parts[1])
        if key:
            name_index[key].append(cid)

    cites = defaultdict(set)
    cited_by = defaultdict(set)
    overruled = defaultdict(set)
    read = missing = 0

    for n, row in enumerate(m.itertuples(), 1):
        if not isinstance(row.text_file, str):
            continue
        try:
            with open(row.text_file, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            missing += 1
            continue
        read += 1
        cid = row.case_id
        own = {k for _, k, _, _ in find_citations(row.citation)} if isinstance(row.citation, str) else set()

        targets = {}
        for _, key, _, raw in find_citations(text):
            if key in own:
                continue
            t = cite_index.get(key)
            if t and t != cid:
                targets.setdefault(t, raw)
        for key, raw in find_case_names(text):
            hits = [h for h in name_index.get(key, []) if h != cid]
            if len(hits) == 1:
                targets.setdefault(hits[0], raw)

        for t, raw in targets.items():
            cites[cid].add(t)
            cited_by[t].add(cid)
            # Does the text near a mention of this judgment say it was overruled?
            # Mentions are its citation as written here, or its first party's name.
            probes = [re.escape(raw)]
            party = re.split(r"\s+(?:vs\.?|v\.|v/s|versus)\s+", info[t]["title"], maxsplit=1, flags=re.I)[0]
            words = [w for w in re.findall(r"[A-Za-z]{3,}", party) if w.lower() not in {"the", "and", "ors", "anr", "state", "union", "india", "smt", "shri"}]
            if len(words) >= 2:
                probes.append(r"\b" + r"\W+".join(map(re.escape, words[:2])) + r"\b")
            found = False
            for probe in probes:
                for mm in re.finditer(probe, text, re.I):
                    window = text[max(0, mm.start() - 250): mm.end() + 250]
                    if OVERRULE.search(window) and not NOT_OVERRULE.search(window):
                        overruled[t].add(cid)
                        found = True
                        break
                if found:
                    break

        if n % 2000 == 0:
            print(f"  read {n}...")

    nodes = set(cites) | set(cited_by)
    edges = sum(len(v) for v in cites.values())
    print(f"Read {read} judgments ({missing} files missing locally)")
    print(f"Links: {edges}; judgments with any link: {len(nodes)}")
    print(f"Judgments cited at least once: {len(cited_by)}; mentioned as overruled: {len(overruled)}")
    top = sorted(cited_by.items(), key=lambda kv: -len(kv[1]))[:8]
    print("Most cited:")
    for t, srcs in top:
        print(f"  {len(srcs):4d}  {info[t]['title'][:70]}  [{t}]")

    def brief(c):
        i = info[c]
        return {"case_id": c, "title": i["title"], "citation": i["citation"], "year": i["year"]}

    def by_recent(ids):
        return sorted(ids, key=lambda c: (info[c]["year"] or 0, c), reverse=True)

    if not write:
        print("\nDry run. Re-run with --write to store this in Firestore.")
        return

    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_admin.initialize_app(credentials.Certificate("firebase-service-account.json"))
    db = firestore.client()
    batch, pending, written = db.batch(), 0, 0
    for c in nodes:
        batch.set(db.collection(COLLECTION).document(doc_id(c)), {
            "case_id": c,
            "cites": [brief(x) for x in by_recent(cites.get(c, set()))][:MAX_LIST],
            "cited_by": [brief(x) for x in by_recent(cited_by.get(c, set()))][:MAX_LIST],
            "cites_count": len(cites.get(c, ())),
            "cited_by_count": len(cited_by.get(c, ())),
            "overruled_mentions": [brief(x) for x in by_recent(overruled.get(c, set()))][:10],
        })
        pending += 1
        if pending == 400:
            batch.commit(); written += pending
            batch, pending = db.batch(), 0
            print(f"  wrote {written}")
    if pending:
        batch.commit(); written += pending
    print(f"Wrote {written} documents to {COLLECTION}")


if __name__ == "__main__":
    main(write="--write" in sys.argv)
