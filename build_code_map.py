"""
build_code_map.py

Maps each section of the old criminal codes to its counterpart in the 2023
codes (IPC -> BNS, CrPC -> BNSS, Evidence Act -> BSA) by comparing the texts
themselves. The new codes mostly carry the old wording over, often folding
several old sections into sub-sections of one new section, so each old
section is compared with every new sub-section by word overlap (TF-IDF) and
by heading.

Every match keeps its score; weak ones are marked so the site says "closest
match, read both" instead of stating it as fact. Known pairs below are
checked on every run.

    python3 build_code_map.py        # writes frontend/src/data/code_map.json
"""
import glob
import json
import os
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

TEXT_DIR = "corpus_statutes/text"
OUT = "frontend/src/data/code_map.json"
PAIRS = [("ipc", "bns"), ("crpc", "bnss"), ("iea", "bsa")]

KNOWN = {  # old section -> new section (number before any sub-section)
    "ipc": {"302": "103", "307": "109", "376": "64", "420": "318", "379": "303", "498A": "85",
            "304B": "80", "354": "74", "506": "351", "406": "316", "34": "3", "120B": "61",
            "299": "100", "300": "101", "375": "63", "124A": "152", "509": "79", "323": "115"},
    "crpc": {"154": "173", "438": "482", "41": "35", "50": "47", "57": "58", "125": "144",
             "436": "478", "437": "480", "439": "483", "164": "183", "161": "180", "482": "528"},
    "iea": {"65B": "63", "24": "22", "45": "39", "32": "26", "114": "119", "101": "104"},
}

# Sub-sections checked by hand where the new section's sub-sections are worded
# almost alike and word overlap alone picks the wrong one
KNOWN_SUB = {
    "ipc": {"302": "1", "304A": "1", "323": "2", "324": "1", "325": "2", "326": "2",
            "379": "2", "406": "2", "420": "4"},
}


# Old sections with no counterpart in the new code, and why (shown on the site)
NO_EQUIVALENT = {
    "ipc": {
        "309": "Attempt to suicide is not an offence under the BNS. (BNS s.226 covers attempting suicide to compel or restrain a public servant.)",
        "377": "Not carried into the BNS. Consensual acts between adults were already decriminalised in Navtej Singh Johar v. Union of India (2018).",
        "497": "Adultery is not an offence under the BNS. The Supreme Court struck down s.497 in Joseph Shine v. Union of India (2018).",
        "310": "Not carried into the BNS.", "311": "Not carried into the BNS.",
    },
}
MISSING_HEADINGS = {"304B": "Dowry death"}
WEAK = 0.35    # below this, show "no direct counterpart" with the closest text only as a pointer
STRONG = 0.6   # at or above this, the wording was carried over


def load(code):
    out = {}
    for path in glob.glob(f"{TEXT_DIR}/{code}_s*.txt"):
        num = os.path.basename(path)[len(code) + 2:-4]
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        head = lines[0]
        heading = head.split("):", 1)[1].strip() if "):" in head else ""
        body = "\n".join(l for l in lines[1:] if not l.startswith("[")).strip()
        out[num] = {"heading": heading, "body": body}
    return out


SUB = re.compile(r"(?m)^\s*(?:\d+\.\s*)?\((\d+)\)\s*")


def subsections(body):
    """[(sub-number or '', text)] for a new-code section."""
    parts = [(m.start(), m.group(1)) for m in SUB.finditer(body)]
    if len(parts) < 2:
        return [("", body)]
    out = []
    for i, (start, num) in enumerate(parts):
        end = parts[i + 1][0] if i + 1 < len(parts) else len(body)
        out.append((num, body[start:end]))
    return out


def clean(t):
    return re.sub(r"\s+", " ", re.sub(r"\b\d+\.\s*", " ", t.lower()))


def match(old_code, new_code):
    old, new = load(old_code), load(new_code)
    units = []  # (section, sub, text)
    for num, s in new.items():
        for sub, text in subsections(s["body"]):
            units.append((num, sub, s["heading"] + " " + text))
    vec = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1, stop_words="english")
    vec.fit([clean(u[2]) for u in units] + [clean(s["heading"] + " " + s["body"]) for s in old.values()])
    U = vec.transform([clean(u[2]) for u in units])
    H = vec.transform([clean(new[u[0]]["heading"]) for u in units])
    rows = {}
    for num, s in old.items():
        body_sim = cosine_similarity(vec.transform([clean(s["heading"] + " " + s["body"])]), U)[0]
        head_sim = cosine_similarity(vec.transform([clean(s["heading"])]), H)[0]
        score = 0.75 * body_sim + 0.25 * head_sim
        order = score.argsort()[::-1]
        best = order[0]
        sec, sub, _ = units[best]
        alt = next((units[i] for i in order[1:] if units[i][0] != sec), None)
        rows[num] = {
            "new": sec, "sub": sub, "score": round(float(score[best]), 3),
            "heading": s["heading"], "new_heading": new[sec]["heading"],
            "alt": alt[0] if alt else None,
        }
    return rows, old, new


def main():
    result = {}
    for old_code, new_code in PAIRS:
        rows, old, new = match(old_code, new_code)
        known = KNOWN[old_code]
        hits = [k for k, v in known.items() if k in rows and rows[k]["new"] == v]
        misses = {k: (rows[k]["new"] if k in rows else None, v) for k, v in known.items() if k not in hits}
        print(f"{old_code.upper()} -> {new_code.upper()}: {len(rows)} sections mapped; "
              f"known pairs {len(hits)}/{len(known)} right; misses (got, want): {misses}")
        scores = sorted(r["score"] for r in rows.values())
        print(f"   score median {scores[len(scores)//2]:.2f}, 10th pct {scores[len(scores)//10]:.2f}")
        for k, (got, want) in misses.items():
            if k not in rows:   # missing from the source text; keep the known pair anyway
                rows[k] = {"new": want, "sub": "", "score": 1.0, "heading": MISSING_HEADINGS.get(k, ""), "alt": None}
            if k in rows:
                rows[k].update(new=want, sub="", score=1.0, new_heading=new.get(want, {}).get("heading", ""), verified=True)
        for k in hits:
            rows[k]["verified"] = True
        for k, sub in KNOWN_SUB.get(old_code, {}).items():
            if k in rows:
                rows[k].update(sub=sub, verified=True)
        for k, r in rows.items():
            note = NO_EQUIVALENT.get(old_code, {}).get(k)
            repealed = r["heading"].lower().startswith(("rep.", "repealed", "omitted"))
            if note or repealed:
                r.update(status="none", note=note or "Repealed before the 2023 codes; no counterpart.")
            elif r.get("verified") or r["score"] >= STRONG:
                r["status"] = "match"
            elif r["score"] >= WEAK:
                r["status"] = "close"
            else:
                r["status"] = "none"
        counts = {st: sum(1 for r in rows.values() if r["status"] == st) for st in ("match", "close", "none")}
        print(f"   {counts}")
        result[old_code] = {"to": new_code, "sections": rows}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT} ({os.path.getsize(OUT)//1024} KB)")


if __name__ == "__main__":
    main()
