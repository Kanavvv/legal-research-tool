"""
weekly_pipeline.py

The recurring "freshness" job for Nyaya. Meant to run on a schedule
(Cloud Run Job + Cloud Scheduler), not on your Mac. Each run:

  1. Checks the last 2 years for judgments that exist in the AWS dataset
     but aren't in Qdrant yet (checked by querying Qdrant DIRECTLY --
     this script never touches your local corpus/manifest.csv, since a
     cloud job has no access to your Mac's files).
  2. Downloads, extracts, chunks, embeds, and indexes any new ones.
  3. If any were found, asks Claude to write a short "This Week in the
     Supreme Court" digest in Nyaya's voice, and sends it via Resend to
     everyone in the Audience.
  4. If nothing new was found, logs that and sends nothing -- no empty
     newsletters.

Caps how many new judgments it processes per run (MAX_NEW_PER_RUN) to
keep each run's cost and time bounded, since this runs repeatedly.

Requires: QDRANT_URL, QDRANT_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY,
RESEND_AUDIENCE_ID
"""

import os
import io
import time
import uuid
import datetime
import requests
import pandas as pd
import pdfplumber
import anthropic
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue, MatchAny
from sentence_transformers import SentenceTransformer

BASE_URL = "https://indian-supreme-court-judgments.s3.amazonaws.com"
COLLECTION_NAME = "supreme_court_judgments"
CHUNK_SIZE_WORDS = 350
CHUNK_OVERLAP_WORDS = 50
MAX_NEW_PER_RUN = int(os.environ.get("MAX_NEW_PER_RUN", "50"))
DIGEST_MAX_ITEMS = 8          # how many judgments to actually feature in the email
DRY_RUN = os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")

QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
RESEND_AUDIENCE_ID = os.environ["RESEND_AUDIENCE_ID"]
FROM_ADDRESS = os.environ.get("DIGEST_FROM_ADDRESS", "Nyaya <digest@asknyaya.in>")

qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

print("Loading the embedding model...")
model = SentenceTransformer("multi-qa-mpnet-base-dot-v1")


def chunk_text(text, chunk_size=CHUNK_SIZE_WORDS, overlap=CHUNK_OVERLAP_WORDS):
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        chunks.append(" ".join(words[start:start + chunk_size]))
        start += chunk_size - overlap
    return chunks


def point_id(case_id, chunk_index):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"nyaya:{case_id}:{chunk_index}"))


def existing_case_ids_for_year(year):
    """What's already in Qdrant for this year -- read directly, not from a local file."""
    ids = set()
    offset = None
    while True:
        points, offset = qdrant.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(must=[FieldCondition(key="year", match=MatchValue(value=year))]),
            limit=1000, offset=offset, with_payload=["case_id"], with_vectors=False,
        )
        ids.update(p.payload.get("case_id") for p in points)
        if offset is None:
            break
    return ids


def fetch_year_metadata(year):
    url = f"{BASE_URL}/metadata/parquet/year={year}/metadata.parquet"
    resp = requests.get(url, timeout=60)
    if resp.status_code != 200:
        return None
    tmp = f"/tmp/_meta_{year}.parquet"
    with open(tmp, "wb") as f:
        f.write(resp.content)
    try:
        return pd.read_parquet(tmp, engine="pyarrow")
    except Exception:
        return pd.read_parquet(tmp, engine="fastparquet")


def process_new_judgment(year, row):
    """Download, extract, chunk, embed, and upload one judgment. Returns a
    summary dict for the digest on success, or None if it couldn't be used."""
    case_id = str(row.get("case_id", ""))
    pdf_path = row.get("path", "")
    if not case_id or not pdf_path:
        return None

    pdf_url = f"{BASE_URL}/data/pdf/year={year}/english/{os.path.basename(pdf_path)}_EN.pdf"
    try:
        pdf_resp = requests.get(pdf_url, timeout=30)
        if pdf_resp.status_code != 200:
            return None
        with pdfplumber.open(io.BytesIO(pdf_resp.content)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return None

    if len(text.strip()) < 200:
        return None

    chunks = chunk_text(text)
    embeddings = model.encode(chunks).tolist()

    title = str(row.get("title", ""))
    citation = str(row.get("citation", "")) or case_id
    decision_date = str(row.get("decision_date", ""))

    points = [
        PointStruct(
            id=point_id(case_id, i),
            vector=emb,
            payload={
                "case_id": case_id, "title": title, "citation": citation,
                "court": "Supreme Court of India", "decision_date": decision_date,
                "chunk_index": i, "text": chunk, "source_url": pdf_url,
                "year": year, "doc_type": "judgment",
            },
        )
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]

    if not DRY_RUN:
        qdrant.upsert(collection_name=COLLECTION_NAME, points=points)

    return {
        "case_id": case_id, "title": title, "citation": citation,
        "decision_date": decision_date, "source_url": pdf_url,
        "excerpt": text[:600],
    }


def build_digest(new_judgments):
    items_text = "\n\n".join(
        f"- {j['title']} ({j['citation']}), decided {j['decision_date'] or 'recently'}\n  {j['excerpt'][:300]}"
        for j in new_judgments[:DIGEST_MAX_ITEMS]
    )
    system_prompt = (
        "You write 'This Week in the Supreme Court', a short, engaging weekly digest for "
        "Nyaya, an Indian legal research gazette read mostly by law students. Given a list "
        "of newly-added judgments, pick the most genuinely interesting few and write a short, "
        "warm, editorially-voiced HTML email body (use simple <p>, <h2>, <strong> tags only, "
        "no external CSS). Keep it skimmable -- a short intro line, then 3-6 short items, each "
        "with the case name, a one-sentence plain-English takeaway, and why it might matter. "
        "Sign off briefly. This is a factual digest, not legal advice -- keep that spirit."
    )
    message = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=system_prompt,
        messages=[{"role": "user", "content": f"New judgments this run:\n\n{items_text}"}],
    )
    return "".join(b.text for b in message.content if hasattr(b, "text"))


def save_digest(html_body, new_judgments):
    """Keeps a copy for the site's /digest page. A failure here never stops the email."""
    if DRY_RUN:
        print("[DRY RUN] Would save the digest for the site.")
        return
    try:
        db = _firestore()
        today = datetime.date.today().isoformat()
        db.collection("digests").document(today).set({
            "date": today,
            "title": f"This week in the Supreme Court, {datetime.date.today().strftime('%d %b %Y')}",
            "html": html_body,
            "count": len(new_judgments),
            "cases": [{"title": j["title"], "citation": j["citation"], "case_id": j["case_id"],
                       "decision_date": j.get("decision_date"), "source_url": j.get("source_url", "")}
                      for j in new_judgments[:DIGEST_MAX_ITEMS]],
        })
        print(f"Digest saved for the site ({today}).")
    except Exception as e:
        print(f"Saving the digest for the site failed: {e}")


def send_digest(html_body):
    if DRY_RUN:
        print("\n[DRY RUN] Would send this digest:\n")
        print(html_body)
        return

    create_resp = requests.post(
        "https://api.resend.com/broadcasts",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "audience_id": RESEND_AUDIENCE_ID,
            "from": FROM_ADDRESS,
            "subject": f"This Week in the Supreme Court -- {datetime.date.today().strftime('%d %b %Y')}",
            "html": html_body,
        },
        timeout=30,
    )
    if create_resp.status_code not in (200, 201):
        print(f"Failed to create broadcast: {create_resp.status_code} {create_resp.text}")
        return

    broadcast_id = create_resp.json().get("id")
    send_resp = requests.post(
        f"https://api.resend.com/broadcasts/{broadcast_id}/send",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        timeout=30,
    )
    if send_resp.status_code in (200, 201):
        print(f"Digest sent (broadcast {broadcast_id}).")
    else:
        print(f"Broadcast created but failed to send: {send_resp.status_code} {send_resp.text}")


# ---------------- Pro case alerts ----------------
# Users follow topics on the site (stored in Firestore under users/{uid}/alerts).
# After new judgments are indexed, each Pro user with alerts gets one email
# listing the new judgments that match their topics. Needs
# FIREBASE_SERVICE_ACCOUNT_B64; without it, alerts are skipped.

ALERT_MIN_SCORE = float(os.environ.get("ALERT_MIN_SCORE", "20"))  # dot-product score; unrelated text scores ~12
ALERTS_FROM = os.environ.get("ALERTS_FROM_ADDRESS", FROM_ADDRESS)


def _firestore():
    # On Cloud Run the job's own service account reaches Firestore (same project), so no key is needed.
    # A base64 service-account key still works for local runs.
    import base64, json
    import firebase_admin
    from firebase_admin import credentials, firestore
    if not firebase_admin._apps:
        b64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64", "")
        if b64:
            firebase_admin.initialize_app(credentials.Certificate(json.loads(base64.b64decode(b64))))
        else:
            firebase_admin.initialize_app(options={"projectId": os.environ.get("GOOGLE_CLOUD_PROJECT", "legal-research-tool-509320")})
    return firestore.client()


def match_topic(topic, new_ids, limit=5):
    pts = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=model.encode(topic).tolist(),
        limit=40,
        query_filter=Filter(must=[FieldCondition(key="case_id", match=MatchAny(any=list(new_ids)))]),
        with_payload=["case_id", "title", "citation", "source_url"],
    ).points
    seen, out = set(), []
    for p in pts:
        if p.score < ALERT_MIN_SCORE or p.payload["case_id"] in seen:
            continue
        seen.add(p.payload["case_id"])
        out.append(p.payload)
        if len(out) >= limit:
            break
    return out


def send_alerts(new_judgments):
    db = _firestore()
    if db is None:
        print("Alerts: FIREBASE_SERVICE_ACCOUNT_B64 not set, skipping.")
        return
    new_ids = [j["case_id"] for j in new_judgments]
    now = datetime.datetime.now(datetime.timezone.utc)
    sent = 0
    for user in db.collection("users").where("has_alerts", "==", True).stream():
        data = user.to_dict() or {}
        if not data.get("pro_until") or data["pro_until"] < now or not data.get("alert_email"):
            continue
        sections = []
        for alert in user.reference.collection("alerts").stream():
            topic = alert.get("topic")
            hits = match_topic(topic, new_ids)
            if hits:
                items = "".join(
                    f'<li><a href="{h.get("source_url", "")}">{h["title"]}</a><br><small>{h.get("citation", "")}</small></li>'
                    for h in hits)
                sections.append(f"<h3>{topic}</h3><ul>{items}</ul>")
        if not sections:
            continue
        html = (
            "<p>New Supreme Court judgments matching the topics you follow on Nyaya:</p>"
            + "".join(sections)
            + '<p><a href="https://asknyaya.in/">Ask Nyaya about any of them</a>. '
              'Change or stop these alerts on <a href="https://asknyaya.in/account">your account page</a>.</p>'
        )
        if DRY_RUN:
            print(f"[DRY RUN] Would email alerts to user {user.id}: {len(sections)} topic(s) matched")
            continue
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": ALERTS_FROM, "to": [data["alert_email"]],
                  "subject": "New judgments on topics you follow", "html": html},
            timeout=30,
        )
        if resp.status_code in (200, 201):
            sent += 1
        else:
            print(f"Alert email failed for {user.id}: {resp.status_code} {resp.text[:200]}")
    print(f"Alerts: emailed {sent} user(s).")


def main():
    this_year = datetime.date.today().year
    years_env = os.environ.get("TEST_YEARS", "").strip()
    if years_env:
        years_to_check = [int(y) for y in years_env.split(",") if y.strip()]
        print(f"TEST_YEARS override: checking {years_to_check} instead of the current years.")
    else:
        years_to_check = [this_year, this_year - 1]
    print(f"Checking years: {years_to_check}" + (" [DRY RUN]" if DRY_RUN else ""))

    all_new = []

    for year in years_to_check:
        if len(all_new) >= MAX_NEW_PER_RUN:
            break
        print(f"\n=== {year} ===")
        metadata = fetch_year_metadata(year)
        if metadata is None:
            print("  No metadata available for this year yet.")
            continue

        metadata = metadata[metadata["available_languages"].apply(lambda x: "ENG" in str(x).split(","))]
        existing = existing_case_ids_for_year(year)
        new_rows = metadata[~metadata["case_id"].astype(str).isin(existing)]
        print(f"  {len(metadata)} English judgments total, {len(existing)} already indexed, "
              f"{len(new_rows)} new.")

        for _, row in new_rows.iterrows():
            if len(all_new) >= MAX_NEW_PER_RUN:
                print(f"  Reached MAX_NEW_PER_RUN ({MAX_NEW_PER_RUN}) -- remaining will be picked "
                      f"up on a future run.")
                break
            result = process_new_judgment(year, row)
            if result:
                all_new.append(result)
                print(f"    + {result['title'][:70]}")
            time.sleep(0.15)

    print(f"\nTotal new judgments this run: {len(all_new)}")

    if not all_new:
        print("Nothing new -- no digest sent this run.")
        return

    print("Writing the digest...")
    html_body = build_digest(all_new)
    save_digest(html_body, all_new)
    send_digest(html_body)

    try:
        send_alerts(all_new)
    except Exception as e:  # alerts must never break the digest run
        print(f"Alerts failed: {e}")


if __name__ == "__main__":
    main()
