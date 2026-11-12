"""
import_criminal_codes.py

Adds the new criminal laws and the codes they replaced to the statute corpus,
one document per section, in the same format fetch_statutes.py writes:

  New (in force from 1 July 2024), parsed from the Gazette of India PDFs
  (as hosted by PRS Legislative Research):
    The Bharatiya Nyaya Sanhita, 2023            (replaces the IPC)
    The Bharatiya Nagarik Suraksha Sanhita, 2023 (replaces the CrPC)
    The Bharatiya Sakshya Adhiniyam, 2023        (replaces the Evidence Act)

  Older codes, from civictech-India/Indian-Law-Penal-Code-Json:
    The Indian Penal Code, 1860, The Code of Criminal Procedure, 1973,
    The Indian Evidence Act, 1872 (repealed 1 July 2024, still applied to
    earlier offences and pending cases), The Code of Civil Procedure, 1908,
    The Divorce Act, 1869.

Reproducing Acts is permitted under s.52(1)(q) of the Copyright Act, 1957.
Writes corpus_statutes/manifest_codes.csv; build_index.py picks it up.

    python3 import_criminal_codes.py            # download, parse, write
    python3 import_criminal_codes.py --check    # parse only, print counts
"""
import io
import json
import os
import re
import sys
import urllib.parse

import pandas as pd
import pdfplumber
import requests

OUT_DIR = "corpus_statutes"
TEXT_DIR = f"{OUT_DIR}/text"
MANIFEST = f"{OUT_DIR}/manifest_codes.csv"
UA = {"User-Agent": "NyayaCorpusBuilder/1.0 (asknyaya.in)"}

PRS = "https://prsindia.org/files/bills_acts/"
GAZETTE = [
    # (slug, act title, short name, PDF url, expected number of sections)
    ("bns", "The Bharatiya Nyaya Sanhita, 2023", "BNS",
     PRS + "bills_parliament/2023/" + urllib.parse.quote("The Bharatiya Nyaya Sanhita, 2023.pdf"), 358),
    ("bnss", "The Bharatiya Nagarik Suraksha Sanhita, 2023", "BNSS",
     PRS + "bills_parliament/2023/" + urllib.parse.quote("The Bharatiya Nagarik Suraksha Sanhita, 2023.pdf"), 531),
    ("bsa", "The Bharatiya Sakshya Adhiniyam, 2023", "BSA",
     PRS + "acts_parliament/2023/" + urllib.parse.quote("The Bharatiya Sakshya Bill, 2023.pdf"), 170),
]

GH = "https://raw.githubusercontent.com/civictech-India/Indian-Law-Penal-Code-Json/main/"
OLD_CODES = [
    ("ipc", "The Indian Penal Code, 1860", "IPC", GH + "ipc.json",
     "Repealed and replaced by the Bharatiya Nyaya Sanhita, 2023 from 1 July 2024; still applies to offences committed before that date."),
    ("crpc", "The Code of Criminal Procedure, 1973", "CrPC", GH + "crpc.json",
     "Repealed and replaced by the Bharatiya Nagarik Suraksha Sanhita, 2023 from 1 July 2024; still governs proceedings pending on that date."),
    ("iea", "The Indian Evidence Act, 1872", "Evidence Act", GH + "iea.json",
     "Repealed and replaced by the Bharatiya Sakshya Adhiniyam, 2023 from 1 July 2024; still applies to proceedings begun before that date."),
    ("cpc", "The Code of Civil Procedure, 1908", "CPC", GH + "cpc.json", ""),
    ("divorce-act", "The Divorce Act, 1869", "Divorce Act", GH + "ida.json", ""),
]

BODY_X = (112, 482)      # Gazette body column; side-notes (section headings) sit outside it
HEADER_Y = 58            # running header and rule above this
NOISE = re.compile(r"^(?:Sec\. \d+\]|\d+\s*THE GAZETTE|THE GAZETTE OF INDIA|_{5,}|\d{1,3}\s*$)")
SECTION_START = re.compile(r"^(\d{1,3})\.\s*(?=[(A-Z\"'“])")


def _lines(words):
    """Groups pdfplumber words into text lines by vertical position."""
    rows = []
    for w in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
        if rows and abs(rows[-1]["top"] - w["top"]) < 3.5:
            rows[-1]["words"].append(w)
        else:
            rows.append({"top": w["top"], "words": [w]})
    for r in rows:
        r["text"] = " ".join(w["text"] for w in sorted(r["words"], key=lambda w: w["x0"]))
    return rows


def _note_blocks(words):
    """Side-note words grouped into blocks (one heading each), with the block's top."""
    blocks = []
    for line in _lines(words):
        if blocks and line["top"] - blocks[-1]["bottom"] < 14:
            blocks[-1]["text"] += " " + line["text"]
            blocks[-1]["bottom"] = line["top"]
        else:
            blocks.append({"top": line["top"], "bottom": line["top"], "text": line["text"]})
    return blocks


def parse_gazette(pdf_bytes, expected):
    sections, current, want = [], None, 1
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            words = [w for w in page.extract_words(keep_blank_chars=False) if w["top"] > HEADER_Y]
            body = [w for w in words if BODY_X[0] <= w["x0"] < BODY_X[1]]
            notes = _note_blocks([w for w in words if not (BODY_X[0] <= w["x0"] < BODY_X[1])])
            for line in _lines(body):
                text = line["text"].strip()
                if not text or NOISE.match(text):
                    continue
                m = SECTION_START.match(text)
                if m and int(m.group(1)) == want and want <= expected:
                    near = [b for b in notes if -8 <= b["top"] - line["top"] <= 24]
                    heading = near[0]["text"] if near else ""
                    heading = re.sub(r"\s+", " ", re.sub(r"\b\d+ of \d{4}\.?", "", heading)).strip(" .;")
                    current = {"number": str(want), "heading": heading, "lines": [text]}
                    sections.append(current)
                    want += 1
                elif current is not None:
                    current["lines"].append(text)
    for s in sections:
        body = "\n".join(s["lines"])
        body = re.sub(r"-\n(?=[a-z])", "", body)            # re-join hyphenated words
        s["text"] = re.sub(r"[ \t]+", " ", body).strip()
        del s["lines"]
    # The last section runs on into the Schedules; keep it to a sane length
    if sections:
        sections[-1]["text"] = sections[-1]["text"][:6000]
    return sections


def parse_json_code(items):
    out = []
    for it in items:
        num = it.get("Section", it.get("section"))
        heading = it.get("section_title") or it.get("title") or ""
        text = it.get("section_desc") or it.get("description") or ""
        if num is None or not str(text).strip():
            continue
        text = re.sub(r"\n\s*\t+", "\n", str(text))
        text = re.sub(r"[ \t]+", " ", text).strip()
        out.append({"number": str(num).strip(), "heading": str(heading).strip(" ."), "text": text})
    return out


def rows_for(slug, act, short, sections, source_url, note=""):
    rows, seen = [], set()
    for s in sections:
        case_id = f"{slug}_s{s['number']}"
        if case_id in seen:
            continue
        seen.add(case_id)
        heading = s["heading"] or f"Section {s['number']}"
        title = f"{act}, Section {s['number']}: {heading[:150]}"
        path = f"{TEXT_DIR}/{case_id}.txt"
        header = f"{act}, Section {s['number']} ({short} s.{s['number']}): {heading}\n"
        if note:
            header += f"[{note}]\n"
        rows.append({"case_id": case_id, "title": title, "citation": f"{act.replace('The ', '')}, S. {s['number']}",
                     "court": "", "decision_date": "", "text_file": path, "year": "",
                     "source_url": source_url, "doc_type": "statute", "_text": header + "\n" + s["text"]})
    return rows


def main(check=False):
    all_rows = []
    for slug, act, short, url, expected in GAZETTE:
        pdf = requests.get(url, headers=UA, timeout=120)
        pdf.raise_for_status()
        secs = parse_gazette(pdf.content, expected)
        named = sum(1 for s in secs if s["heading"])
        print(f"{short}: {len(secs)}/{expected} sections parsed, {named} with headings")
        for probe in ("1", "2", str(min(expected, 103)), str(expected)):
            s = next((x for x in secs if x["number"] == probe), None)
            if s:
                print(f"   s.{probe}: {s['heading'][:70]!r} | {s['text'][:90]!r}")
        all_rows += rows_for(slug, act, short, secs, url)
    for slug, act, short, url, note in OLD_CODES:
        items = requests.get(url, headers=UA, timeout=120).json()
        secs = parse_json_code(items)
        print(f"{short}: {len(secs)} sections")
        all_rows += rows_for(slug, act, short, secs, "https://github.com/civictech-India/Indian-Law-Penal-Code-Json", note)

    if check:
        print(f"\n{len(all_rows)} sections in all (not written: --check)")
        return
    os.makedirs(TEXT_DIR, exist_ok=True)
    for r in all_rows:
        with open(r["text_file"], "w", encoding="utf-8") as f:
            f.write(r.pop("_text"))
    pd.DataFrame(all_rows).to_csv(MANIFEST, index=False)
    print(f"\nWrote {len(all_rows)} sections to {MANIFEST}")


if __name__ == "__main__":
    main(check="--check" in sys.argv)
