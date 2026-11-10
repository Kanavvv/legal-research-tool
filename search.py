"""
search.py (v3 -- filters added)

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


def search(query, top_k=TOP_K, candidates=CANDIDATES, year=None, court=None, doc_type=None):
    query_embedding = bi_encoder.encode([query]).tolist()[0]
    query_filter = build_filter(year, court, doc_type)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=candidates,
        query_filter=query_filter,
    ).points

    if not results:
        return []

    docs = [r.payload["text"] for r in results]
    metas = [r.payload for r in results]

    pairs = [[query, doc] for doc in docs]
    scores = cross_encoder.predict(pairs)

    reranked = sorted(zip(scores, docs, metas), key=lambda x: x[0], reverse=True)
    return reranked[:top_k]


if __name__ == "__main__":
    query = input("Enter a legal search query: ")
    results = search(query)
    print(f"\nTop {len(results)} results after re-ranking:\n")
    for i, (score, doc, meta) in enumerate(results):
        print(f"{i+1}. [score={score:.2f}] {meta['title'][:60]}")
        print(f"   {meta['citation']} | {meta['case_id']}")
        print(f"   {doc[:200]}...\n")
