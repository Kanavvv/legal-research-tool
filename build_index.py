"""
build_index.py (v8 -- honest progress: chunk-based speed and time left)

What's new in v8: the progress line shows speed in chunks/second over the last 5 minutes,
an estimate of the time left and the clock time it should finish (the old figure treated a
one-paragraph statute and a 100-page judgment as equal).

What was new in v7: skips duplicate manifest rows and indexes newest year first.

What was new in v6:
  * Encodes several documents at once (bigger batches), not one at a time.
  * Uploads to Qdrant in a background thread while the next documents are
    being encoded, so your Mac isn't idle while waiting on the network.
  * Uses your Mac's GPU chip (Apple "MPS") when available and tells you which
    device it is using.  To force the CPU instead:  export EMBED_DEVICE=cpu
  * Prints a time split (read / encode / waiting on uploads) so we can see
    where the time actually goes.
  * Point IDs are derived from the document and chunk number, so re-running
    can never create duplicate chunks in Qdrant.

Still true from v5: a document is only marked "done" AFTER its upload
succeeds, so it is safe to stop (Control+C) and re-run at any time.

Optional year cutoff (index only documents from this year onward):
  export MIN_YEAR=2010

Requires QDRANT_URL and QDRANT_API_KEY environment variables.
"""

import math
import pandas as pd
import os
import time
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor

import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

CORPUS_MANIFESTS = [
    "corpus/manifest.csv",
    "corpus_statutes/manifest.csv",
    "corpus_hc/manifest.csv",
]

COLLECTION_NAME = "supreme_court_judgments"
CHUNK_SIZE_WORDS = 350
CHUNK_OVERLAP_WORDS = 50
TRACKING_FILE = "indexed_case_ids.txt"

GROUP_CHUNKS = 192            # chunks encoded and uploaded together
ENCODE_BATCH = int(os.environ.get("ENCODE_BATCH", "32"))
MAX_UPLOADS_IN_FLIGHT = 2     # how far encoding may run ahead of uploading

UPLOAD_WAITS = (5, 15, 30, 60, 120)   # seconds to wait between upload attempts
READ_WAITS = (5, 20, 60)              # seconds to wait between file-read attempts

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
if not QDRANT_URL or not QDRANT_API_KEY:
    raise SystemExit("Set QDRANT_URL and QDRANT_API_KEY environment variables first.")

print("Connecting to Qdrant Cloud...")
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

if not client.collection_exists(COLLECTION_NAME):
    print(f"Creating collection '{COLLECTION_NAME}'...")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=768, distance=Distance.DOT),
    )


def pick_device():
    forced = os.environ.get("EMBED_DEVICE")
    if forced:
        return forced
    if torch.cuda.is_available():
        return "cuda"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return "mps"
    return "cpu"


DEVICE = pick_device()
print(f"Loading the embedding model on: {DEVICE}")
if DEVICE == "cpu":
    print("  (Running on the CPU -- this is the slow path.)")
model = SentenceTransformer("multi-qa-mpnet-base-dot-v1", device=DEVICE)

manifests = []
for path in CORPUS_MANIFESTS:
    if os.path.exists(path):
        df = pd.read_csv(path)
        print(f"Found {len(df)} documents in {path}")
        manifests.append(df)
    else:
        print(f"(skipping {path} -- not found yet)")

if not manifests:
    raise SystemExit("No manifests found. Run the fetch scripts first.")

manifest = pd.concat(manifests, ignore_index=True)
rows_before = len(manifest)
manifest = manifest.drop_duplicates(subset="case_id", keep="first")
dupes = rows_before - len(manifest)
print(f"Total documents across all sources: {len(manifest)}"
      + (f" ({dupes} duplicate rows ignored)" if dupes else ""))

if os.path.exists(TRACKING_FILE):
    with open(TRACKING_FILE, "r") as f:
        already_indexed = set(line.strip() for line in f if line.strip())
    print(f"{len(already_indexed)} documents already indexed previously -- skipping those.")
else:
    already_indexed = set()

to_process = manifest[~manifest["case_id"].astype(str).isin(already_indexed)]

MIN_YEAR = int(os.environ.get("MIN_YEAR", "0"))
if MIN_YEAR:
    year_numbers = pd.to_numeric(to_process["year"], errors="coerce")
    to_process = to_process[year_numbers.isna() | (year_numbers >= MIN_YEAR)]
    print(f"MIN_YEAR={MIN_YEAR}: only indexing documents from {MIN_YEAR} onward.")

# Newest first: statutes (no year) go first, then 2026 -> 2010. If you stop early,
# the years left out are the oldest ones.
if "year" in to_process.columns:
    to_process = (to_process.assign(_year=pd.to_numeric(to_process["year"], errors="coerce"))
                  .sort_values("_year", ascending=False, na_position="first", kind="stable")
                  .drop(columns="_year"))

total_docs = len(to_process)
print(f"{total_docs} NEW documents to index this run (statutes first, then newest year to oldest).")


def est_chunks_for(path):
    """Rough number of chunks a file will produce, from its size (about 6 bytes per word)."""
    try:
        words = os.path.getsize(path) / 6.2
    except OSError:
        return 1
    return max(1, math.ceil(words / (CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS)))


est_by_case = {str(r["case_id"]): est_chunks_for(r["text_file"]) for _, r in to_process.iterrows()}
est_total_chunks = sum(est_by_case.values())
print(f"Estimated work: about {est_total_chunks:,} chunks (rough guess from file sizes)")
print(f"(encoding in groups of ~{GROUP_CHUNKS} chunks, batch size {ENCODE_BATCH})\n")


def chunk_text(text, chunk_size=CHUNK_SIZE_WORDS, overlap=CHUNK_OVERLAP_WORDS):
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        chunks.append(" ".join(words[start:start + chunk_size]))
        start += chunk_size - overlap
    return chunks


def read_text_with_retry(path):
    for i in range(len(READ_WAITS) + 1):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError as e:
            if i < len(READ_WAITS):
                print(f"    Couldn't read {path} ({e}); retrying in {READ_WAITS[i]}s...")
                time.sleep(READ_WAITS[i])
            else:
                print(f"    Skipping {path} for now ({e}); it will be retried on the next run.")
    return None


def upsert_with_retry(points):
    for attempt in range(len(UPLOAD_WAITS) + 1):
        try:
            client.upsert(collection_name=COLLECTION_NAME, points=points)
            return True
        except Exception as e:
            if attempt < len(UPLOAD_WAITS):
                wait = UPLOAD_WAITS[attempt]
                print(f"    Upload failed ({e}); retrying in {wait}s "
                      f"(attempt {attempt + 2}/{len(UPLOAD_WAITS) + 1})...")
                time.sleep(wait)
            else:
                print(f"    Upload still failing after {len(UPLOAD_WAITS) + 1} attempts: {e}")
    return False


def point_id(case_id, chunk_index):
    """Same document + chunk number -> same ID, so re-uploads overwrite, never duplicate."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"nyaya:{case_id}:{chunk_index}"))


def make_points(row, chunks, vectors):
    doc_type = row.get("doc_type", "judgment")
    if pd.isna(doc_type) or not doc_type:
        doc_type = "judgment"
    year_val = row.get("year")
    year_int = int(year_val) if pd.notna(year_val) and str(year_val).strip().replace(".0", "").isdigit() else None

    points = []
    for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
        points.append(PointStruct(
            id=point_id(row["case_id"], i),
            vector=vec,
            payload={
                "case_id": str(row["case_id"]), "title": str(row["title"]),
                "citation": str(row["citation"]), "court": str(row.get("court", "")),
                "decision_date": str(row.get("decision_date", "")), "chunk_index": i,
                "text": chunk, "source_url": str(row.get("source_url", "")),
                "year": year_int, "doc_type": str(doc_type),
            },
        ))
    return points


tracking_f = open(TRACKING_FILE, "a")
executor = ThreadPoolExecutor(max_workers=1)   # one background uploader
pending = deque()                              # (future, case_ids) waiting to be confirmed
group_docs = []                                # (row, chunks) waiting to be encoded
group_chunk_count = 0
done_docs = 0                                  # documents whose upload has been confirmed
examined = 0
t_read = t_encode = t_wait = 0.0
chunks_done = 0            # chunks actually encoded so far
est_done_chunks = 0        # the size-based estimate for those same documents
speed_samples = deque()    # (time, chunks_done) after each encoded group
last_print = 0.0
REPORT_EVERY = 60          # seconds between progress lines
start_time = time.time()


def mark_done(case_ids):
    global done_docs
    for cid in case_ids:
        tracking_f.write(f"{cid}\n")
    tracking_f.flush()
    done_docs += len(case_ids)


def settle(item):
    """Wait for one upload to finish. Only on success are its documents marked done."""
    global t_wait
    future, case_ids = item
    t0 = time.time()
    ok = future.result()
    t_wait += time.time() - t0
    if not ok:
        tracking_f.close()
        raise SystemExit(
            "\nStopping: Qdrant can't be reached (is your internet connection working?).\n"
            "Nothing was lost -- run the same command again once you're back online."
        )
    mark_done(case_ids)


def flush_group():
    global group_docs, group_chunk_count, t_encode, chunks_done, est_done_chunks
    if not group_docs:
        return
    all_chunks = [c for _, chunks in group_docs for c in chunks]

    t0 = time.time()
    vectors = model.encode(all_chunks, batch_size=ENCODE_BATCH, convert_to_numpy=True).tolist() if all_chunks else []
    t_encode += time.time() - t0
    chunks_done += len(all_chunks)
    est_done_chunks += sum(est_by_case.get(str(r["case_id"]), 1) for r, _ in group_docs)
    speed_samples.append((time.time(), chunks_done))

    points, case_ids, pos = [], [], 0
    for row, chunks in group_docs:
        points.extend(make_points(row, chunks, vectors[pos:pos + len(chunks)]))
        pos += len(chunks)
        case_ids.append(row["case_id"])
    group_docs, group_chunk_count = [], 0

    while len(pending) >= MAX_UPLOADS_IN_FLIGHT:      # don't let encoding run too far ahead
        settle(pending.popleft())
    if points:
        pending.append((executor.submit(upsert_with_retry, points), case_ids))
    else:
        mark_done(case_ids)                             # documents with no text: nothing to upload
    while pending and pending[0][0].done():             # collect uploads that already finished
        settle(pending.popleft())


def clock(ts):
    """HH:MM, with the weekday added if it isn't today."""
    same_day = time.strftime("%Y%m%d", time.localtime(ts)) == time.strftime("%Y%m%d")
    return time.strftime("%H:%M" if same_day else "%a %H:%M", time.localtime(ts))


def maybe_report():
    """Print one progress line per REPORT_EVERY seconds. Speed and time left are based on
    chunks (which take the same effort whatever the document), over the last 5 minutes."""
    global last_print
    now = time.time()
    if now - last_print < REPORT_EVERY:
        return
    last_print = now
    while len(speed_samples) > 2 and now - speed_samples[0][0] > 300:
        speed_samples.popleft()

    speed_text = "measuring speed..."
    if len(speed_samples) >= 2 and speed_samples[-1][0] - speed_samples[0][0] >= 60:
        dt = speed_samples[-1][0] - speed_samples[0][0]
        rate = (speed_samples[-1][1] - speed_samples[0][1]) / dt          # chunks per second
        if rate > 0:
            bias = min(max(chunks_done / max(est_done_chunks, 1), 0.5), 2.0)   # correct the size-based guess
            seconds_left = max(est_total_chunks - est_done_chunks, 0) * bias / rate
            speed_text = (f"{rate:.1f} chunks/s (last 5 min) | about {seconds_left / 3600:.1f} h left, "
                          f"done around {clock(now + seconds_left)}")

    total_t = max(now - start_time, 1e-9)
    print(f"  [{time.strftime('%H:%M')}] read {examined}/{total_docs} docs | confirmed uploaded {done_docs} | "
          f"{speed_text} | time split: encode {t_encode / total_t:.0%}, "
          f"waiting on uploads {t_wait / total_t:.0%}, read {t_read / total_t:.0%}")


try:
    for _, row in to_process.iterrows():
        text_file = row["text_file"]
        if not os.path.exists(text_file):
            continue

        t0 = time.time()
        text = read_text_with_retry(text_file)
        read_seconds = time.time() - t0
        t_read += read_seconds
        if read_seconds > 15:
            print(f"    (slow read: {read_seconds:.0f}s for {text_file} -- probably being downloaded from the cloud)")
        if text is None:
            continue

        chunks = chunk_text(text)
        group_docs.append((row, chunks))
        group_chunk_count += len(chunks)
        examined += 1

        if group_chunk_count >= GROUP_CHUNKS:
            flush_group()

        maybe_report()

    flush_group()
    while pending:
        settle(pending.popleft())
    tracking_f.close()
    executor.shutdown(wait=True)

except KeyboardInterrupt:
    print("\nStopping -- finishing the uploads already in progress (press Control+C again to force quit)...")
    try:
        while pending:
            settle(pending.popleft())
    except SystemExit:
        pass
    tracking_f.close()
    executor.shutdown(wait=True)
    raise SystemExit("Stopped safely. Run the same command again to continue.")

print(f"\nDone. Indexed {done_docs} new documents this run.")
try:
    print(f"Total chunks now in Qdrant: {client.count(COLLECTION_NAME).count}")
except Exception as e:
    print(f"(Couldn't fetch the final chunk count: {e})")
