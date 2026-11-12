"""
search.py (v4 -- hybrid: meaning + exact references)

Two-stage retrieval against Qdrant, now with optional filters:
  - year: only judgments from this year
  - court: only this court (e.g. "Supreme Court", "Bombay High Court")
  - doc_type: "judgment" or "statute" (once statutes are indexed)

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import os
import re
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchText
from sentence_transformers import SentenceTransformer, CrossEncoder

COLLECTION_NAME = "supreme_court_judgments"
BI_ENCODER_MODEL = "multi-qa-mpnet-base-dot-v1"
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
CANDIDATES = 12
TOP_K = 5

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")

print("Loading models...")
bi_encoder = SentenceTransformer(BI_ENCODER_MODEL)
cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def build_filter(year=None, court=None, doc_type=None):
    conditions = []
    if year:
        conditions.append(FieldCondition(key="year", match=MatchValue(value=int(year))))
    if court:
        conditions.append(FieldCondition(key="court", match=MatchValue(value=court)))
    if doc_type:
        conditions.append(FieldCondition(key="doc_type", match=MatchValue(value=doc_type)))
    return Filter(must=conditions) if conditions else None


def search_by_title(query, doc_type="judgment", limit=8):
    """Finds cases by actually matching their title text, rather than semantic
    meaning -- reliable for 'find this specific case by name' lookups, where
    the Q&A-style search in search() can miss exact names. Requires the title
    field to have a text index (see create_title_index.py)."""
    conditions = [FieldCondition(key="title", match=MatchText(text=query))]
    if doc_type:
        conditions.append(FieldCondition(key="doc_type", match=MatchValue(value=doc_type)))

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(must=conditions),
        limit=100,
        with_payload=True,
        with_vectors=False,
    )

    seen = set()
    cases = []
    for p in points:
        cid = p.payload.get("case_id")
        if cid in seen:
            continue
        seen.add(cid)
        cases.append({"case_id": cid, "title": p.payload.get("title", ""), "citation": p.payload.get("citation", "")})
        if len(cases) >= limit:
            break
    return cases


def search_titles_fast(query, doc_type="judgment", limit=8):
    """A quick fallback for the case picker when the exact-text title match
    finds nothing (e.g. the query doesn't match how the title is actually
    spelled). Skips the slow cross-encoder re-ranking step entirely -- for
    an autocomplete list, "good enough, fast" beats "perfectly ranked, slow"."""
    query_embedding = bi_encoder.encode([query]).tolist()[0]
    query_filter = build_filter(doc_type=doc_type)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=40,  # over-fetch chunks since many belong to the same case
        query_filter=query_filter,
        with_payload=True,
    ).points

    seen = set()
    cases = []
    for p in results:
        cid = p.payload.get("case_id")
        if cid in seen:
            continue
        seen.add(cid)
        cases.append({"case_id": cid, "title": p.payload.get("title", ""), "citation": p.payload.get("citation", "")})
        if len(cases) >= limit:
            break
    return cases


def get_case_by_id(case_id, max_chunks=14):
    """Reconstructs a judgment's text from its stored chunks, ordered correctly,
    for features (like Compare Cases) that need a case's actual content rather
    than a semantic search result. Returns None if the case_id isn't found."""
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(must=[FieldCondition(key="case_id", match=MatchValue(value=case_id))]),
        limit=200,
        with_payload=True,
        with_vectors=False,
    )
    if not points:
        return None

    points.sort(key=lambda p: p.payload.get("chunk_index", 0))
    points = points[:max_chunks]
    text = "\n\n".join(p.payload.get("text", "") for p in points)
    meta = points[0].payload
    return {
        "case_id": case_id,
        "title": meta.get("title", ""),
        "citation": meta.get("citation", ""),
        "source_url": meta.get("source_url", ""),
        "text": text,
    }


# Statute titles look like "The Indian Contract Act, 1872, Section 2: Interpretation-clause"
# (see fetch_statutes.py), so the Act name and section number come straight out of the title.
STATUTE_TITLE_PATTERN = re.compile(r"^(.*?), Section ([^:]+): (.*)$")
CHUNK_OVERLAP_WORDS = 50  # must match build_index.py


def parse_statute_title(title):
    m = STATUTE_TITLE_PATTERN.match(title)
    if not m:
        return None
    return {"act": m.group(1).strip(), "number": m.group(2).strip(), "heading": m.group(3).strip()}


def section_sort_key(number):
    """Natural order for section numbers: 2 < 2A < 10 < 51A < 243ZP."""
    m = re.match(r"^(\d+)(.*)$", number)
    return (int(m.group(1)), m.group(2)) if m else (float("inf"), number)


def list_statutes():
    """Every indexed statute section, grouped by Act and in section order --
    for the Statute Browser, which lists sections without a search query.
    Only the first chunk of each section is needed, and its text is skipped,
    so this stays light even across all ~1,700 sections."""
    sections = {}
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(must=[FieldCondition(key="doc_type", match=MatchValue(value="statute"))]),
            limit=1000,
            offset=offset,
            with_payload=["case_id", "title", "citation", "source_url"],
            with_vectors=False,
        )
        for p in points:
            cid = p.payload.get("case_id")
            if cid in sections:
                continue
            parsed = parse_statute_title(p.payload.get("title", ""))
            if not parsed:
                continue
            sections[cid] = {
                "case_id": cid, **parsed,
                "citation": p.payload.get("citation", ""),
                "source_url": p.payload.get("source_url", ""),
            }
        if offset is None:
            break

    acts = {}
    for s in sections.values():
        acts.setdefault(s["act"], []).append(s)

    result = []
    for act_name in sorted(acts):
        act_sections = sorted(acts[act_name], key=lambda s: section_sort_key(s["number"]))
        result.append({
            "name": act_name,
            # The Constitution's provisions are Articles, even though the source labels them sections
            "unit": "Article" if "Constitution" in act_name else "Section",
            "sections": [{k: v for k, v in s.items() if k != "act"} for s in act_sections],
        })
    return result


def get_statute_section(case_id):
    """One statute section's full text. Unlike get_case_by_id, this stitches
    the chunks back together without their overlapping words, and drops the
    "Act - Section N: heading" line fetch_statutes.py put at the top, since the
    page already shows it. Returns None if the section isn't found."""
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(must=[
            FieldCondition(key="case_id", match=MatchValue(value=case_id)),
            FieldCondition(key="doc_type", match=MatchValue(value="statute")),
        ]),
        limit=200,
        with_payload=True,
        with_vectors=False,
    )
    if not points:
        return None

    points.sort(key=lambda p: p.payload.get("chunk_index", 0))
    words = []
    for i, p in enumerate(points):
        chunk_words = p.payload.get("text", "").split()
        words.extend(chunk_words if i == 0 else chunk_words[CHUNK_OVERLAP_WORDS:])

    meta = points[0].payload
    parsed = parse_statute_title(meta.get("title", "")) or {"act": "", "number": "", "heading": meta.get("title", "")}
    header = f"{parsed['act']} - Section {parsed['number']}: {parsed['heading']}".split()
    if words[:len(header)] == header:
        words = words[len(header):]

    # Chunking flattened the line breaks; put paragraph breaks back before
    # numbered clauses, Explanations, Illustrations and provisos.
    text = " ".join(words)
    text = re.sub(r"([.;:—])\s+(?=(\(\w{1,4}\)|Explanation|Illustrations?|Provided that)\s)", r"\1\n\n", text)

    return {
        "case_id": case_id, **parsed,
        "citation": meta.get("citation", ""),
        "source_url": meta.get("source_url", ""),
        "text": text,
    }


# ---------------- exact references (the "keyword" half of hybrid search) ----------------
# Meaning-based search is good at "can a landlord evict without notice" and bad
# at "Section 138 NI Act" or "Kesavananda Bharati v. State of Kerala": numbers
# and names carry little meaning for an embedding. These are spotted directly
# and looked up by title, then added to the candidates and kept in the results.

ACT_ALIASES = {
    "arbitration": "The Arbitration and Conciliation Act, 1996",
    "constitution": "The Constitution of India",
    "consumer protection": "The Consumer Protection Act, 2019",
    "cpa": "The Consumer Protection Act, 2019",
    "hindu marriage": "The Hindu Marriage Act, 1955",
    "hma": "The Hindu Marriage Act, 1955",
    "contract": "The Indian Contract Act, 1872",
    "ica": "The Indian Contract Act, 1872",
    "motor vehicles": "The Motor Vehicles Act, 1988",
    "mv": "The Motor Vehicles Act, 1988",
    "negotiable instruments": "The Negotiable Instruments Act, 1881",
    "ni": "The Negotiable Instruments Act, 1881",
    "sale of goods": "The Sale of Goods Act, 1930",
    "specific relief": "The Specific Relief Act, 1963",
    "transfer of property": "The Transfer of Property Act, 1882",
    "tpa": "The Transfer of Property Act, 1882",
    "bharatiya nyaya sanhita": "The Bharatiya Nyaya Sanhita, 2023",
    "bharatiya nagarik suraksha sanhita": "The Bharatiya Nagarik Suraksha Sanhita, 2023",
    "bharatiya sakshya adhiniyam": "The Bharatiya Sakshya Adhiniyam, 2023",
    "penal code": "The Indian Penal Code, 1860",
    "code of criminal procedure": "The Code of Criminal Procedure, 1973",
    "criminal procedure": "The Code of Criminal Procedure, 1973",
    "evidence act": "The Indian Evidence Act, 1872",
    "evidence": "The Indian Evidence Act, 1872",
    "code of civil procedure": "The Code of Civil Procedure, 1908",
    "civil procedure": "The Code of Civil Procedure, 1908",
    "divorce act": "The Divorce Act, 1869",
}

# Short forms people write after a section number ("318 BNS", "u/s 438 CrPC").
# Matched exactly, so BNS never swallows BNSS.
CODE_ABBREVIATIONS = {
    "bns": "The Bharatiya Nyaya Sanhita, 2023",
    "bnss": "The Bharatiya Nagarik Suraksha Sanhita, 2023",
    "bsa": "The Bharatiya Sakshya Adhiniyam, 2023",
    "ipc": "The Indian Penal Code, 1860",
    "crpc": "The Code of Criminal Procedure, 1973",
    "iea": "The Indian Evidence Act, 1872",
    "cpc": "The Code of Civil Procedure, 1908",
}
CODE_REF = re.compile(
    r"\b(?:(?:section|sec\.?|s\.|u/s\.?)\s*)?(\d+[A-Z]{0,3})\s*(?:\(\w+\)\s*)*(?:of\s+(?:the\s+)?)?"
    r"(BNSS|BNS|BSA|IPC|Cr\.?\s?P\.?\s?C\.?|C\.?P\.?C\.?|IEA)\b",
    re.IGNORECASE,
)

SECTION_REF = re.compile(
    r"\b(?:section|sec\.?|s\.|u/s\.?)\s*(\d+[A-Z]{0,3})\b(?:\s*(?:\(\w+\)\s*)*)?(?:\s*(?:of|under|,)?\s*(?:the\s+)?([A-Za-z][A-Za-z .]{1,40}?)\s+act\b)?",
    re.IGNORECASE,
)
ARTICLE_REF = re.compile(r"\b(?:article|art\.)\s*(\d+[A-Z]{0,2})\b", re.IGNORECASE)
CASE_NAME = re.compile(
    r"([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,5})\s+(?:v\.|vs\.?|versus)\s+([A-Z][\w.&'-]*(?:\s+(?:of\s+)?[A-Z][\w.&'-]*){0,5})"
)
STOP_TITLE_WORDS = {"the", "of", "and", "ors", "anr", "others", "another", "state", "union", "india", "mr", "mrs", "dr", "m/s"}


def _resolve_act(name):
    if not name:
        return None
    n = name.lower().replace(".", "").strip()
    if n.replace(" ", "") in CODE_ABBREVIATIONS:
        return CODE_ABBREVIATIONS[n.replace(" ", "")]
    n = re.sub(r"^(the|indian)\s+", "", n)
    for alias, act in ACT_ALIASES.items():
        if n == alias or n.startswith(alias) or alias.startswith(n) and len(n) >= 4:
            return act
    return None


def find_references(query):
    """Returns (statute section refs, case-name refs) spotted in the query.
    A section with no Act named is only used if exactly one Act is mentioned
    elsewhere in the query."""
    sections = []
    lone_acts = [act for alias, act in ACT_ALIASES.items()
                 if re.search(rf"\b{re.escape(alias)}\b(\s+act)?", query, re.IGNORECASE) and len(alias) > 3]
    for m in SECTION_REF.finditer(query):
        act = _resolve_act(m.group(2)) or (lone_acts[0] if len(set(lone_acts)) == 1 else None)
        if act:
            sections.append((act, m.group(1).upper()))
    for m in CODE_REF.finditer(query):
        code = re.sub(r"[\s.]", "", m.group(2)).lower()
        if code in CODE_ABBREVIATIONS:
            sections.append((CODE_ABBREVIATIONS[code], m.group(1).upper()))
    for m in ARTICLE_REF.finditer(query):
        sections.append(("The Constitution of India", m.group(1).upper()))
    cases = [(a.strip(), b.strip()) for a, b in CASE_NAME.findall(query)]
    return list(dict.fromkeys(sections)), cases[:2]


def _statute_case_ids(act, number):
    """case_ids of statute sections whose parsed title is exactly this Act and number."""
    act_words = " ".join(w for w in re.findall(r"[A-Za-z]+", act) if w.lower() not in {"the", "of", "and"})
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(must=[
            FieldCondition(key="title", match=MatchText(text=f"{act_words} {number}")),
            FieldCondition(key="doc_type", match=MatchValue(value="statute")),
        ]),
        limit=60, with_payload=["case_id", "title"], with_vectors=False,
    )
    ids = []
    for p in points:
        parsed = parse_statute_title(p.payload.get("title", ""))
        if parsed and parsed["act"] == act and parsed["number"].upper() == number and p.payload["case_id"] not in ids:
            ids.append(p.payload["case_id"])
    return ids


def _case_name_ids(party_a, party_b, limit=3):
    words = [w for w in re.findall(r"[A-Za-z]{3,}", f"{party_a} {party_b}") if w.lower() not in STOP_TITLE_WORDS]
    if len(words) < 1:
        return []
    found = search_by_title(" ".join(words[:6]), doc_type="judgment", limit=limit)
    if not found and len(words) > 2:
        found = search_by_title(" ".join(words[:2]), doc_type="judgment", limit=limit)
    return [c["case_id"] for c in found]


def _best_chunk(case_id, query_embedding):
    """The chunk of this document that is closest in meaning to the question."""
    pts = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=1,
        query_filter=Filter(must=[FieldCondition(key="case_id", match=MatchValue(value=case_id))]),
        with_payload=True,
    ).points
    return pts[0] if pts else None


def search(query, top_k=TOP_K, candidates=CANDIDATES, year=None, court=None, doc_type=None, context=""):
    """Hybrid retrieval: meaning-based candidates plus any statute sections or
    cases the question names outright, all re-ranked by the cross-encoder.
    Named references are always kept, since the reader asked about them.
    `context` (earlier turns of a conversation) widens the meaning search
    without changing what the cross-encoder scores against."""
    embed_text = f"{context}\n{query}".strip() if context else query
    query_embedding = bi_encoder.encode([embed_text]).tolist()[0]
    query_filter = build_filter(year, court, doc_type)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=candidates,
        query_filter=query_filter,
    ).points

    pinned_ids = []
    try:
        section_refs, case_refs = find_references(query)
        if doc_type in (None, "statute"):
            for act, number in section_refs[:3]:
                pinned_ids += _statute_case_ids(act, number)[:1]
        if doc_type in (None, "judgment"):
            for a, b in case_refs:
                pinned_ids += _case_name_ids(a, b, limit=1)
    except Exception as e:  # never let the extra lookups break the main search
        print(f"reference lookup failed: {e}")

    have = {(r.payload.get("case_id"), r.payload.get("chunk_index")) for r in results}
    for cid in dict.fromkeys(pinned_ids):
        p = _best_chunk(cid, query_embedding)
        if p and (p.payload.get("case_id"), p.payload.get("chunk_index")) not in have:
            results.append(p)
            have.add((p.payload.get("case_id"), p.payload.get("chunk_index")))

    if not results:
        return []

    docs = [r.payload["text"] for r in results]
    metas = [r.payload for r in results]

    pairs = [[query, doc] for doc in docs]
    scores = cross_encoder.predict(pairs)

    reranked = sorted(zip(scores, docs, metas), key=lambda x: x[0], reverse=True)
    pinned = set(pinned_ids)
    top = reranked[:top_k]
    # Make sure each named reference made it in, replacing the weakest others
    for item in reranked[top_k:]:
        if item[2].get("case_id") in pinned and not any(t[2].get("case_id") == item[2].get("case_id") for t in top):
            for i in range(len(top) - 1, -1, -1):
                if top[i][2].get("case_id") not in pinned:
                    top[i] = item
                    break
    top.sort(key=lambda x: x[0], reverse=True)
    return top


if __name__ == "__main__":
    query = input("Enter a legal search query: ")
    results = search(query)
    print(f"\nTop {len(results)} results after re-ranking:\n")
    for i, (score, doc, meta) in enumerate(results):
        print(f"{i+1}. [score={score:.2f}] {meta['title'][:60]}")
        print(f"   {meta['citation']} | {meta['case_id']}")
        print(f"   {doc[:200]}...\n")
