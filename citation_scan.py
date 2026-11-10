"""
citation_scan.py -- is a "precedent graph" feasible with our data?

Reads a sample of your Supreme Court judgments (read-only) and measures:
  1. How judgments cite other cases (SCC, SCR, AIR, neutral "INSC" ...).
  2. How many of those citations point to a judgment that is actually in
     your corpus, so a link could be drawn on a graph.
  3. As a rougher fallback, how many "X v. Y" case-name mentions match a
     judgment in your corpus by party names.

It writes every candidate link to citation_scan_edges.csv so you can open it
and check a few rows by eye. Nothing is uploaded and Qdrant is not touched.

Usage (from your legal-research-tool folder):
    python3 citation_scan.py
Optional settings (put them before the command):
    SAMPLE_SIZE=1000   how many judgments to read (default 400)
    MIN_YEAR=2010      only consider judgments from this year onward, to
                       mirror what is actually indexed in Qdrant
"""

import os
import re
import sys
from collections import Counter, defaultdict

import pandas as pd

MANIFEST = "corpus/manifest.csv"
EDGES_OUT = "citation_scan_edges.csv"
SAMPLE_SIZE = int(os.environ.get("SAMPLE_SIZE", "400"))
SEED = int(os.environ.get("SEED", "1"))
MIN_YEAR = int(os.environ.get("MIN_YEAR", "0"))

Y = r"((?:18|19|20)\d{2})"

RE_INSC = re.compile(rf"\b{Y}\s+INSC\s+(\d{{1,4}})\b")
RE_SCR = re.compile(
    rf"\[\s*{Y}\s*\]\s*(Supp?l?\.?)?\s*(\d{{1,2}})?\s*S\.?\s*C\.?\s*R\.?\s*(\d{{1,4}})", re.I)
RE_SCC = re.compile(
    rf"\(\s*{Y}\s*\)\s*(Supp?l?\.?)?\s*(?:\(\s*)?(\d{{1,2}})(?:\s*\))?\s*SCC\s*(?:\(\s*[A-Za-z]+\s*\)\s*)?(\d{{1,4}})", re.I)
RE_SCC_SUPP = re.compile(rf"\b{Y}\s+Supp\.?\s*\(\s*(\d{{1,2}})\s*\)\s*SCC\s*(\d{{1,4}})", re.I)
RE_AIR = re.compile(rf"\bA\.?\s*I\.?\s*R\.?\s*{Y}\s*(?:SC|S\.\s*C\.)\s*(\d{{1,4}})", re.I)
RE_SCCOL = re.compile(rf"\b{Y}\s+SCC\s+OnLine\s+SC\s+(\d{{1,5}})", re.I)
RE_SCALE = re.compile(
    rf"(?:\(\s*{Y}\s*\)\s*\d{{1,2}}\s*SCALE\s*\d+|\b{Y}\s*\(\s*\d+\s*\)\s*SCALE\s*\d+)", re.I)
RE_JT = re.compile(rf"\bJT\s*{Y}\s*\(\s*\d+\s*\)\s*SC\s*\d+", re.I)


def find_citations(text):
    """Return unique citations as (family, key, cited_year, raw_text)."""
    found = {}

    def add(family, key, year, raw):
        found.setdefault((family, key), (family, key, int(year), " ".join(raw.split())))

    for m in RE_INSC.finditer(text):
        add("INSC", f"INSC|{m.group(1)}|{m.group(2)}", m.group(1), m.group(0))
    for m in RE_SCR.finditer(text):
        supp, vol = ("S" if m.group(2) else ""), (m.group(3) or "")
        add("SCR", f"SCR|{m.group(1)}|{supp}{vol}|{m.group(4)}", m.group(1), m.group(0))
    for m in RE_SCC.finditer(text):
        supp, vol = ("S" if m.group(2) else ""), m.group(3)
        add("SCC", f"SCC|{m.group(1)}|{supp}{vol}|{m.group(4)}", m.group(1), m.group(0))
    for m in RE_SCC_SUPP.finditer(text):
        add("SCC", f"SCC|{m.group(1)}|S{m.group(2)}|{m.group(3)}", m.group(1), m.group(0))
    for m in RE_AIR.finditer(text):
        add("AIR", f"AIR|{m.group(1)}|{m.group(2)}", m.group(1), m.group(0))
    for m in RE_SCCOL.finditer(text):
        add("SCC OnLine", f"SCCOL|{m.group(1)}|{m.group(2)}", m.group(1), m.group(0))
    for m in RE_SCALE.finditer(text):
        year = next(g for g in m.groups() if g)
        add("SCALE", "SCALE|" + re.sub(r"\W+", "", m.group(0).lower()), year, m.group(0))
    for m in RE_JT.finditer(text):
        add("JT", "JT|" + re.sub(r"\W+", "", m.group(0).lower()), m.group(1), m.group(0))
    return list(found.values())


NAME_WORD = r"[A-Z][A-Za-z.&'\-]*"
NAME = rf"{NAME_WORD}(?:\s+(?:of|and|the|&|for|to|{NAME_WORD})){{0,6}}"
RE_V = re.compile(rf"({NAME})\s+(?:v\.|vs\.?|v/s|versus)\s+({NAME})")
STOP = {"the", "of", "and", "for", "to", "in", "ors", "anr", "another", "others", "etc",
        "vs", "v", "a", "an", "shri", "smt", "sri", "ms", "mr", "mrs", "dr", "m", "s"}


def name_tokens(s):
    s = re.sub(r"[^a-z0-9 ]", " ", str(s).lower())
    return [t for t in s.split() if t not in STOP]


def name_key(a, b):
    ta, tb = name_tokens(a)[:2], name_tokens(b)[:2]
    return (" ".join(ta), " ".join(tb)) if ta and tb else None


def find_case_names(text):
    """Return unique "X v. Y" mentions as (key, raw_text)."""
    found = {}
    for m in RE_V.finditer(text):
        key = name_key(m.group(1), m.group(2))
        if key:
            found.setdefault(key, " ".join(m.group(0).split()))
    return list(found.items())


def main():
    if not os.path.exists(MANIFEST):
        sys.exit(f"Can't find {MANIFEST}. Run this from your legal-research-tool folder.")

    m = pd.read_csv(MANIFEST)
    m["case_id"] = m["case_id"].astype(str)
    for col in ("citation", "petitioner", "respondent", "title"):
        if col not in m.columns:
            m[col] = ""
    m["year_num"] = pd.to_numeric(m["year"] if "year" in m.columns else pd.Series([None] * len(m)),
                                  errors="coerce")
    if MIN_YEAR:
        m = m[m["year_num"] >= MIN_YEAR]
    if m.empty:
        sys.exit("No judgments left after applying MIN_YEAR.")

    first_year = int(m["year_num"].min()) if m["year_num"].notna().any() else 0
    last_year = int(m["year_num"].max()) if m["year_num"].notna().any() else 0
    print(f"Judgments considered: {len(m)} (years {first_year}-{last_year})\n")

    # What do the manifest's own citation values look like?
    cite_values = m["citation"].dropna().astype(str)
    cite_values = cite_values[cite_values.str.strip() != ""]
    print("A few citation values from your manifest:")
    for v in cite_values.head(5):
        print("   ", v)
    recognised = sum(1 for v in cite_values if find_citations(v))
    print(f"Recognised citation format in {recognised} of {len(cite_values)} manifest citations\n")

    cite_index, name_index = {}, defaultdict(list)
    for cid, cit, pet, res, title in zip(m.case_id, m.citation, m.petitioner, m.respondent, m.title):
        if isinstance(cit, str):
            for _, key, _, _ in find_citations(cit):
                cite_index.setdefault(key, cid)
        key = None
        if isinstance(pet, str) and isinstance(res, str) and pet.strip() and res.strip():
            key = name_key(pet, res)
        if key is None and isinstance(title, str):
            parts = re.split(r"\s+(?:vs\.?|v\.|v/s|versus)\s+", title, maxsplit=1, flags=re.I)
            if len(parts) == 2:
                key = name_key(parts[0], parts[1])
        if key:
            name_index[key].append(cid)
    title_of = dict(zip(m.case_id, m.title.fillna("").astype(str)))

    readable = m[m["text_file"].notna()]
    dated = readable.dropna(subset=["year_num"])
    if len(dated):
        per_year = max(3, SAMPLE_SIZE // dated["year_num"].nunique())
        sample = pd.concat([g.sample(min(len(g), per_year), random_state=SEED)
                            for _, g in dated.groupby("year_num")])
    else:
        sample = readable.sample(min(len(readable), SAMPLE_SIZE), random_state=SEED)
    print(f"Reading {len(sample)} judgments (spread evenly across years)...")

    fam_total, fam_linked, fam_old = Counter(), Counter(), Counter()
    per_year_stats = defaultdict(lambda: [0, 0, 0, 0])   # docs, citations, linked, name mentions
    cited_by = Counter()
    edges = []
    docs = unreadable = name_mentions = name_linked = name_ambiguous = 0

    for _, row in sample.iterrows():
        try:
            with open(row["text_file"], "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            unreadable += 1
            continue
        docs += 1
        cid, yr = row["case_id"], int(row["year_num"]) if pd.notna(row["year_num"]) else 0
        own_keys = {k for _, k, _, _ in find_citations(str(row["citation"]))} if isinstance(row["citation"], str) else set()

        stat = per_year_stats[yr]
        stat[0] += 1
        for fam, key, cited_year, raw in find_citations(text):
            if key in own_keys:
                continue
            target = cite_index.get(key)
            if target == cid:
                continue
            fam_total[fam] += 1
            stat[1] += 1
            if target:
                fam_linked[fam] += 1
                stat[2] += 1
                cited_by[target] += 1
            elif first_year and cited_year < first_year:
                fam_old[fam] += 1
            edges.append(dict(source_case_id=cid, source_year=yr, kind="citation", family=fam,
                              raw=raw, cited_year=cited_year, matched_case_id=target or ""))

        for key, raw in find_case_names(text):
            name_mentions += 1
            stat[3] += 1
            hits = [h for h in name_index.get(key, []) if h != cid]
            if 1 <= len(hits) <= 3:
                name_linked += 1
                edges.append(dict(source_case_id=cid, source_year=yr, kind="name", family="v.",
                                  raw=raw, cited_year="", matched_case_id=hits[0]))
            elif len(hits) > 3:
                name_ambiguous += 1

    if docs == 0:
        sys.exit("Couldn't read any judgment files. Are they downloaded to this Mac? (see the iCloud note)")
    if unreadable:
        print(f"(Couldn't read {unreadable} files -- probably still stored only in the cloud.)")

    tot_cit, tot_linked = sum(fam_total.values()), sum(fam_linked.values())
    print(f"\n=== Results from {docs} judgments ===")
    print(f"Distinct citations per judgment:      {tot_cit / docs:5.1f}")
    print(f"   ...that point to a judgment in your corpus: {tot_linked / docs:5.2f} per judgment")
    print(f"Case-name mentions (X v. Y) per judgment: {name_mentions / docs:5.1f}")
    print(f"   ...that match a corpus judgment by party names (rough): {name_linked / docs:5.2f} per judgment")
    print(f"   ...too ambiguous to match (same names, 4+ candidates): {name_ambiguous / docs:5.2f} per judgment\n")

    print("Citation format".ljust(14) + "found".rjust(8) + "linked".rjust(9) + "  older than corpus")
    for fam, n in fam_total.most_common():
        print(fam.ljust(14) + str(n).rjust(8) + str(fam_linked[fam]).rjust(9) + f"  {fam_old[fam]}")

    print("\nYear".ljust(8) + "docs".rjust(6) + "cites/doc".rjust(11) + "linked/doc".rjust(12) + "names/doc".rjust(11))
    for yr in sorted(per_year_stats):
        d, c, l, n = per_year_stats[yr]
        print(str(yr).ljust(8) + str(d).rjust(6) + f"{c / d:11.1f}{l / d:12.2f}{n / d:11.1f}")

    if cited_by:
        print("\nMost-cited corpus judgments in this sample:")
        for target, n in cited_by.most_common(8):
            print(f"  {n:3d}x  {title_of.get(target, '')[:70]}  [{target}]")

    if edges:
        pd.DataFrame(edges).to_csv(EDGES_OUT, index=False)
        print(f"\nWrote {len(edges)} candidate links to {EDGES_OUT} -- open it and check a few rows by eye.")

    linked_pd = tot_linked / docs
    name_pd = name_linked / docs
    print("\n=== Reading the result ===")
    if linked_pd >= 1.0:
        print("Citation links resolve well inside your corpus: a precedent graph looks feasible.")
    elif linked_pd + name_pd >= 1.0:
        print("Few citations resolve, but name matching adds links. A graph is possible but will be noisy.")
    else:
        print("Very few links resolve inside your corpus, so a full graph would look sparse.")
        print("A smaller feature ('cases cited in this judgment') may be a better first step.")
    print("Note: this is a sample. Links will increase as more years are added to the corpus.")


if __name__ == "__main__":
    main()
