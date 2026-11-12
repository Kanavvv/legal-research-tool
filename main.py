"""
main.py

STAGE 3 of the Legal Research Tool project: the backend API.

Endpoints:
  - GET  /search?q=...   -> raw re-ranked search results
  - POST /ask            -> the full RAG pipeline (search + Claude answer)
  - POST /feedback       -> lightweight thumbs up/down logging

Cost and abuse controls (shared rate limits, shared answer cache, a daily
spend cap and structured logs) live in guard.py.

Run it with: uvicorn main:app --reload
"""

import os
import re
import time
import json
import base64
import traceback
import hashlib
from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import requests
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore

import guard
from guard import cache_get, cache_set, rate_limit, check_budget, record_usage, log_event

import plans
import features
import extras
import safety
from plans import optional_user, use_quota

from search import search, get_case_by_id, search_by_title, search_titles_fast, list_statutes, get_statute_section

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    print("WARNING: ANTHROPIC_API_KEY environment variable is not set. /ask will fail until it is.")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_AUDIENCE_ID = os.environ.get("RESEND_AUDIENCE_ID", "")
if not RESEND_API_KEY or not RESEND_AUDIENCE_ID:
    print("WARNING: RESEND_API_KEY / RESEND_AUDIENCE_ID not set. /subscribe will fail until they are.")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

client = anthropic.Anthropic(api_key=API_KEY)

# ---------------- Firebase Admin (login + saved history/favorites) ----------------
# The service account key is passed in as a base64-encoded environment variable,
# since Cloud Run env vars are just text, not files.
FIREBASE_SA_B64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64", "")
db = None
if FIREBASE_SA_B64:
    try:
        cert_dict = json.loads(base64.b64decode(FIREBASE_SA_B64))
        firebase_admin.initialize_app(credentials.Certificate(cert_dict))
        db = firestore.client()
    except Exception as e:
        print(f"WARNING: Failed to initialize Firebase Admin: {e}")
else:
    print("WARNING: FIREBASE_SERVICE_ACCOUNT_B64 not set. Login-based features will fail until it is.")

guard.init(db)

ANSWER_MODEL = "claude-sonnet-4-6"
plans.init(db, firebase_auth if db is not None else None)
BLURB_MODEL = os.environ.get("BLURB_MODEL", "claude-haiku-5-5")


def require_user(authorization: str = Header(None)):
    """Verifies the Firebase ID token sent as 'Authorization: Bearer <token>'.
    Raises 401 if missing or invalid. Returns the user's Firebase UID."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    token = authorization.split(" ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Your session has expired -- please sign in again.")

app = FastAPI(title="Legal Research Tool API")

# Only our own site may call the API from a browser. (Scripts ignore CORS,
# which is what the rate limits and spend cap are for.)
ALLOWED_ORIGINS = [
    "https://asknyaya.in",
    "https://www.asknyaya.in",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + [o.strip() for o in os.environ.get("EXTRA_ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Vercel preview deployments of this project
    allow_origin_regex=r"https://legal-research-tool[a-z0-9-]*\.vercel\.app",
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=86400,
)


@app.middleware("http")
async def request_log(request: Request, call_next):
    """One log line per request: route, status, latency. Uncaught errors are
    logged with their traceback, which Cloud Error Reporting picks up."""
    started = time.time()
    try:
        response = await call_next(request)
    except Exception:
        log_event("unhandled_error", severity="ERROR", path=request.url.path,
                  method=request.method, traceback=traceback.format_exc()[-4000:])
        raise
    if request.method != "OPTIONS":
        log_event("request", path=request.url.path, method=request.method,
                  status=response.status_code, latency_ms=round((time.time() - started) * 1000))
    return response


class Turn(BaseModel):
    question: str
    answer: str


class AskRequest(BaseModel):
    question: str
    year: int | None = None
    court: str | None = None
    doc_type: str | None = None
    level: str | None = "standard"
    history: list[Turn] = []   # earlier turns of this conversation, oldest first
    lang: str = "en"           # "en" or a code in LANGUAGES: the language the answer is written in


MAX_TURNS = 3
FOLLOW_UP_NOTE = (
    " This may be a follow-up in an ongoing conversation: use the earlier turns to "
    "understand what is being asked, but cite only the case excerpts provided with "
    "the latest question, numbered as given."
)

CRIMINAL_LAW_NOTE = (
    " Indian criminal law changed on 1 July 2024: the Bharatiya Nyaya Sanhita (BNS) replaced the "
    "Indian Penal Code, the Bharatiya Nagarik Suraksha Sanhita (BNSS) replaced the Code of Criminal "
    "Procedure, and the Bharatiya Sakshya Adhiniyam (BSA) replaced the Indian Evidence Act. The old "
    "codes still govern offences committed, and proceedings begun, before that date. When a question "
    "touches criminal law, say which code applies and, where the excerpts show it, give the matching "
    "section in the other code."
)
# Answer languages. English is the default; the rest are written for plain reading.
LANGUAGES = {
    "hi": ("Hindi", "Devanagari"),
    "mr": ("Marathi", "Devanagari"),
    "bn": ("Bengali", "Bengali"),
    "ta": ("Tamil", "Tamil"),
    "te": ("Telugu", "Telugu"),
    "kn": ("Kannada", "Kannada"),
    "gu": ("Gujarati", "Gujarati"),
}


def language_note(lang):
    """The instruction that makes Claude write an answer in one of LANGUAGES."""
    if lang not in LANGUAGES:
        return ""
    name, script = LANGUAGES[lang]
    return (
        f" Write the whole answer in simple, clear {name} ({script} script), as a person would speak it, "
        "not stiff officialese. Keep case names, citations, Act names with section numbers, and the "
        "[Source N] markers exactly as given, in English."
    )


HINDI_NOTE = language_note("hi")


def answer_notes(lang="en"):
    """Extra instructions every answer prompt gets: the 2024 criminal-law switch, and the answer language."""
    return CRIMINAL_LAW_NOTE + language_note(lang)


def clean_lang(lang):
    code = (lang or "").lower()[:2]
    return code if code in LANGUAGES else "en"


CITE_REF = re.compile(r"\[Source\s+(\d+)\]", re.IGNORECASE)
NAMED_CASE = re.compile(
    r"([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,5})\s+(?:v\.|vs\.?|versus)\s+([A-Z][\w.&'-]*(?:\s+(?:of\s+)?[A-Z][\w.&'-]*){0,5})"
)
_NAME_STOP = {"the", "of", "and", "ors", "anr", "state", "union", "india", "others", "another"}
_LEAD_WORDS = {"In", "See", "Compare", "Also", "Cf", "As", "The", "Per", "Following", "Unlike", "Like",
               "And", "But", "Under", "Similarly", "Thus", "However", "Here", "Then", "While", "Whereas"}


def _name_words(text):
    return {w.lower() for w in re.findall(r"[A-Za-z]{3,}", text)} - _NAME_STOP


def check_citations(answer, sources):
    """Checks the finished answer against the sources it was given:
    [Source N] numbers must exist, and any case named in the text should be
    one of the sources. Returns what the page shows under the answer."""
    numbers = sorted({int(n) for n in CITE_REF.findall(answer)})
    invalid = [n for n in numbers if n < 1 or n > len(sources)]
    titles = [_name_words(s.get("title", "")) for s in sources]
    unverified = []
    for a, b in NAMED_CASE.findall(answer):
        words = _name_words(f"{a} {b}")
        if len(words) < 2:
            continue
        if not any(len(words & t) >= min(2, len(words)) for t in titles):
            lead = a.split()
            while lead and lead[0] in _LEAD_WORDS:
                lead = lead[1:]
            name = f"{' '.join(lead)} v. {b}".strip().rstrip(".,;:")
            if lead and name not in unverified:
                unverified.append(name)
    return {
        "type": "check",
        "cited": [n for n in numbers if n not in invalid],
        "invalid": invalid,
        "unverified": unverified[:5],
    }


def group_by_case(results):
    """Several excerpts can come from one judgment. Merge them so each judgment
    is one numbered source, which keeps [Source N] and the page in step."""
    grouped = {}
    for score, doc, meta in results:
        cid = meta.get("case_id")
        if cid not in grouped:
            grouped[cid] = [score, [doc], meta]
        else:
            grouped[cid][1].append(doc)
            grouped[cid][0] = max(grouped[cid][0], score)
    return [(score, "\n[...]\n".join(docs), meta) for score, docs, meta in grouped.values()]


class FeedbackRequest(BaseModel):
    question: str
    helpful: bool
    reason: str = ""      # optional "what was wrong?"
    answer: str = ""      # the answer being rated, so a reviewer can see it
    route: str = "ask"


@app.get("/")
def root():
    return {"status": "ok", "message": "Legal Research Tool API is running."}


@app.get("/search")
def search_endpoint(q: str, req: Request):
    rate_limit(req, "search", shared=False)
    results = search(q[:500])
    return {
        "query": q,
        "results": [
            {
                "score": float(score),
                "title": meta["title"],
                "citation": meta["citation"],
                "case_id": meta["case_id"],
                "excerpt": doc[:300],
            }
            for score, doc, meta in results
        ],
    }


@app.post("/ask")
def ask_endpoint(request: AskRequest, req: Request, claims=Depends(optional_user)):
    guard.require_feature("ask")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Server is missing ANTHROPIC_API_KEY.")

    question = request.question.strip()
    if not question or len(question) > 1000:
        raise HTTPException(status_code=400, detail="Questions need to be between 1 and 1000 characters.")

    rate_limit(req, "ask")
    use_quota(req, "ask", claims)

    lang = clean_lang(request.lang)
    emergency = safety.emergency_lines(question)
    if emergency:
        log_event("emergency_lines", keys=[e["key"] for e in emergency], route="ask")
    history = [t for t in request.history if t.question.strip()][-MAX_TURNS:]
    history_key = hashlib.sha256(json.dumps([[t.question, t.answer[:200]] for t in history]).encode()).hexdigest()[:16] if history else ""
    cache_key = f"ask|{question.lower()}|{request.year}|{request.court}|{request.doc_type}|{request.level}|{history_key}|{lang}"
    cached = cache_get(cache_key)

    def stream_cached(payload):
        if emergency:
            yield json.dumps({"type": "emergency", "lines": emergency}) + "\n"
        yield json.dumps({"type": "sources", "sources": payload["sources"]}) + "\n"
        yield json.dumps({"type": "delta", "text": payload["answer"]}) + "\n"
        if payload.get("check"):
            yield json.dumps(payload["check"]) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    guard.log_question("ask", question, lang=lang, cached=cached is not None, cache_key=cache_key,
                       follow_up=bool(history), emergency=[e["key"] for e in emergency])
    if cached is not None:
        log_event("cache_hit", route="ask")
        return StreamingResponse(stream_cached(cached), media_type="application/x-ndjson")

    check_budget()
    context = " ".join(t.question for t in history)
    results = group_by_case(search(question, top_k=6, year=request.year, court=request.court,
                                   doc_type=request.doc_type, context=context))

    # The cross-encoder's score tells us whether what we found is actually
    # relevant, not just the closest thing available. Below this, treat the
    # retrieval as a miss rather than force-feeding Claude irrelevant excerpts.
    RELEVANCE_THRESHOLD = float(os.environ.get("RELEVANCE_THRESHOLD", "-3"))
    top_score = results[0][0] if results else None
    is_relevant = top_score is not None and top_score >= RELEVANCE_THRESHOLD

    if not is_relevant:
        # Nothing genuinely relevant in the corpus -- answer from general legal
        # knowledge instead, clearly labeled as such, with no invented sources.
        sources_payload = []
        if request.level == "simple":
            system_prompt = (
                "You are a legal assistant talking to someone with NO legal background. A search "
                "of an Indian case-law database turned up nothing genuinely relevant to this "
                "question, so you're answering from your own general knowledge instead -- make "
                "that explicit at the start of your answer (e.g. 'I couldn't find this in the "
                "indexed judgments, but here's a general answer:'). Avoid jargon; explain any "
                "legal term you must use, in plain words, right there. Do not invent, cite, or "
                "reference any specific case name or citation -- if you're not certain of a "
                "specific detail, say so rather than guessing. This is general educational "
                "information, not legal advice."
            )
        else:
            system_prompt = (
                "You are a legal research assistant for a law student. A search of an Indian "
                "case-law database turned up nothing genuinely relevant to this question, so "
                "you're answering from your own general knowledge instead -- make that explicit "
                "at the start of your answer (e.g. 'Nothing relevant turned up in the indexed "
                "judgments, but here's a general answer:'). Do not invent, cite, or reference "
                "any specific case name or citation you are not certain is accurate. This is "
                "general educational information, not legal advice."
            )
        user_content = f"Question: {question}"
    else:
        context_blocks = []
        for i, (score, doc, meta) in enumerate(results):
            context_blocks.append(
                f"[Source {i+1}] {meta['title']} ({meta['citation']})\n{doc}"
            )
        context_text = "\n\n---\n\n".join(context_blocks)

        if request.level == "simple":
            system_prompt = (
                "You are a legal research assistant explaining law to someone with NO legal background "
                "-- a curious layperson or a first-year law student on their very first day. Answer the "
                "question primarily using the provided case excerpts below, citing them by their [Source N] "
                "number and case name. Avoid legal jargon where possible; when you must use a legal term, "
                "briefly explain it in plain words right there. Use short sentences and everyday analogies "
                "where helpful. If the excerpts touch on the topic but don't fully answer the specific "
                "question, you may add clearly-labeled general knowledge to round out the answer -- "
                "introduce it with something like 'More generally:' and never attach a [Source N] citation "
                "or invent a case name for it. If the excerpts are entirely unrelated to the question, say "
                "so plainly rather than stretching them to fit. This is for educational research, not legal advice."
            )
        else:
            system_prompt = (
                "You are a legal research assistant helping a law student. Answer the question primarily "
                "using the provided case excerpts below, citing them by their [Source N] number and case "
                "name. If the excerpts touch on the topic but don't fully answer the specific question, you "
                "may add clearly-labeled general knowledge to round out the answer -- introduce it with "
                "something like 'More generally:' and never attach a [Source N] citation or invent a case "
                "name for it. If the excerpts are entirely unrelated to the question, say so plainly rather "
                "than stretching them to fit. This is for educational research, not legal advice."
            )
        user_content = f"Question: {question}\n\nCase excerpts:\n\n{context_text}"

        sources_payload = [
            {
                "title": meta["title"],
                "citation": meta["citation"],
                "case_id": meta["case_id"],
                "source_url": meta.get("source_url", ""),
                # Extra fields for the frontend's depth view; all optional there
                "score": round(float(score), 4),
                "court": meta.get("court", ""),
                "year": meta.get("year"),
                "doc_type": meta.get("doc_type", "judgment"),
            }
            for score, _, meta in results
        ]
        annotate_with_graph(sources_payload)

    messages = []
    for t in history:
        messages.append({"role": "user", "content": f"Question: {t.question[:1000]}"})
        messages.append({"role": "assistant", "content": t.answer[:2500] or "(no answer)"})
    messages.append({"role": "user", "content": user_content})
    system_prompt += answer_notes(lang)
    if history:
        system_prompt += FOLLOW_UP_NOTE

    def generate():
        if emergency:
            yield json.dumps({"type": "emergency", "lines": emergency}) + "\n"
        yield json.dumps({"type": "sources", "sources": sources_payload}) + "\n"
        full_text = ""
        started = time.time()
        try:
            with client.messages.stream(
                model=ANSWER_MODEL,
                max_tokens=900 if lang == "en" else 1600,  # Indian scripts take more tokens per word
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    full_text += text
                    yield json.dumps({"type": "delta", "text": text}) + "\n"
                final = stream.get_final_message()
        except Exception:
            log_event("claude_error", severity="ERROR", route="ask", traceback=traceback.format_exc()[-2000:])
            yield json.dumps({"type": "error", "detail": "The answer got interrupted -- please try again."}) + "\n"
            return

        record_usage("ask", ANSWER_MODEL, final.usage, started, user=(claims or {}).get("uid"), relevant=is_relevant,
                     level=request.level, follow_up=bool(history))
        check = check_citations(full_text, sources_payload)
        if check["invalid"] or check["unverified"]:
            log_event("citation_check_flag", severity="WARNING", invalid=check["invalid"], unverified=check["unverified"])
        yield json.dumps(check) + "\n"
        if final.stop_reason in ("end_turn", "max_tokens"):
            cache_set(cache_key, {"answer": full_text, "sources": sources_payload, "check": check})
        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


class ArgumentRequest(BaseModel):
    position: str
    lang: str = "en"


@app.get("/case-search")
def case_search(q: str, req: Request):
    """A lighter search just for picking a case by name -- used by Compare
    Cases' two search boxes. Tries a real text match on the title first
    (reliable for exact/partial names), falling back to semantic search
    only if that finds nothing (e.g. for a looser, topic-style query)."""
    rate_limit(req, "search", shared=False)
    q = q[:200]
    try:
        cases = search_by_title(q, doc_type="judgment", limit=8)
    except Exception:
        cases = []  # title index may not exist yet -- fall through gracefully

    if cases:
        return {"cases": cases}

    return {"cases": search_titles_fast(q, doc_type="judgment", limit=8)}


class CompareRequest(BaseModel):
    case_id_a: str
    case_id_b: str
    lang: str = "en"


@app.post("/compare")
def compare_endpoint(request: CompareRequest, req: Request, claims=Depends(optional_user)):
    guard.require_feature("compare")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Server is missing ANTHROPIC_API_KEY.")

    rate_limit(req, "compare")
    use_quota(req, "compare", claims)
    check_budget()

    case_a = get_case_by_id(request.case_id_a)
    case_b = get_case_by_id(request.case_id_b)
    if not case_a or not case_b:
        raise HTTPException(status_code=404, detail="Couldn't find one of those cases in the corpus.")

    system_prompt = (
        "You are a legal research assistant helping a law student compare two Indian court "
        "judgments. You are given the text of both. Write a clear, structured comparison covering: "
        "(1) a one-line summary of what each case was about, (2) their core holdings/reasoning, "
        "(3) the key similarity or difference between them that a student should understand, and "
        "(4) if relevant, how one might relate to or distinguish from the other. Use headers and "
        "refer to the cases by name, not as 'Case A'/'Case B'. This is for educational research, "
        "not legal advice. If the two cases turn out to be on completely unrelated topics, say so "
        "plainly rather than forcing a comparison that doesn't make sense."
    ) + answer_notes(clean_lang(request.lang))
    user_content = (
        f"CASE 1: {case_a['title']} ({case_a['citation']})\n{case_a['text'][:6000]}\n\n"
        f"---\n\nCASE 2: {case_b['title']} ({case_b['citation']})\n{case_b['text'][:6000]}"
    )

    def generate():
        yield json.dumps({"type": "sources", "sources": [
            {"title": case_a["title"], "citation": case_a["citation"], "case_id": case_a["case_id"], "source_url": case_a.get("source_url", "")},
            {"title": case_b["title"], "citation": case_b["citation"], "case_id": case_b["case_id"], "source_url": case_b.get("source_url", "")},
        ]}) + "\n"
        started = time.time()
        try:
            with client.messages.stream(
                model=ANSWER_MODEL,
                max_tokens=1200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_content}],
            ) as stream:
                for text in stream.text_stream:
                    yield json.dumps({"type": "delta", "text": text}) + "\n"
                final = stream.get_final_message()
        except Exception:
            log_event("claude_error", severity="ERROR", route="compare", traceback=traceback.format_exc()[-2000:])
            yield json.dumps({"type": "error", "detail": "The comparison got interrupted -- please try again."}) + "\n"
            return
        record_usage("compare", ANSWER_MODEL, final.usage, started, user=(claims or {}).get("uid"))
        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@app.post("/argument")
def argument_endpoint(request: ArgumentRequest, req: Request, claims=Depends(optional_user)):
    """Builds a two-sided argument brief: supporting precedents AND counterarguments to address."""
    guard.require_feature("argument")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Server is missing ANTHROPIC_API_KEY.")

    position = request.position.strip()
    if not position or len(position) > 2000:
        raise HTTPException(status_code=400, detail="Describe your position in 1 to 2000 characters.")

    rate_limit(req, "argument")
    use_quota(req, "argument", claims)

    cache_key = f"argument|{position.lower()}|{clean_lang(request.lang)}"
    cached = cache_get(cache_key)
    if cached is not None:
        log_event("cache_hit", route="argument")
        return cached

    check_budget()
    results = group_by_case(search(position, top_k=10))
    if not results:
        return {"brief": "No relevant judgments were found for this scenario.", "sources": []}

    context_blocks = []
    for i, (score, doc, meta) in enumerate(results):
        context_blocks.append(f"[Source {i+1}] {meta['title']} ({meta['citation']})\n{doc}")
    context_text = "\n\n---\n\n".join(context_blocks)

    system_prompt = (
        "You are a legal research assistant helping a law student prepare for moot court or debate. "
        "The student will describe one side of a legal dispute. Using ONLY the provided case excerpts, "
        "build a structured two-sided argument brief with these exact sections:\n\n"
        "## Arguments Supporting This Position\n"
        "(cite specific excerpts as [Source N], explain how each supports the position)\n\n"
        "## Counterarguments to Prepare For\n"
        "(cite specific excerpts as [Source N] that could be used AGAINST this position, or that "
        "distinguish/limit it -- be genuinely adversarial here, a real opponent would raise these)\n\n"
        "## Overall Assessment\n"
        "(1-2 sentences on how strong the position looks based on these excerpts alone)\n\n"
        "If the excerpts don't clearly support one side or the other, say so honestly rather than "
        "forcing an argument. This is for educational moot court/debate practice, not real legal advice, "
        "and must never be presented to an actual court or client as a real legal opinion."
    ) + answer_notes(clean_lang(request.lang))

    started = time.time()
    try:
        message = client.messages.create(
            model=ANSWER_MODEL,
            max_tokens=1200,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": f"My position: {position}\n\nCase excerpts:\n\n{context_text}",
            }],
        )
    except Exception:
        log_event("claude_error", severity="ERROR", route="argument", traceback=traceback.format_exc()[-2000:])
        raise HTTPException(status_code=502, detail="Couldn't build the brief right now. Please try again.")
    record_usage("argument", ANSWER_MODEL, message.usage, started, user=(claims or {}).get("uid"))

    brief_text = "".join(block.text for block in message.content if hasattr(block, "text"))

    response = {
        "brief": brief_text,
        "sources": [
            {"title": meta["title"], "citation": meta["citation"], "case_id": meta["case_id"], "source_url": meta.get("source_url", "")}
            for _, _, meta in results
        ],
    }
    if message.stop_reason in ("end_turn", "max_tokens"):
        cache_set(cache_key, response)
    return response


@app.get("/on-this-day")
def on_this_day():
    """Returns one real judgment decided on today's calendar date, from any
    year in the corpus, with a short AI-written note on why it's notable.
    Public -- no sign-in needed. Cached for the whole day so it doesn't
    change on every refresh or cost an API call per visitor."""
    import datetime
    import hashlib

    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).date()  # IST
    month_day = today.strftime("%m-%d")

    cache_key = f"on-this-day|{month_day}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    if db is None:
        return {"judgment": None}

    doc = db.collection("on_this_day_index").document(month_day).get()
    if not doc.exists:
        return {"judgment": None}

    judgments = doc.to_dict().get("judgments", [])
    if not judgments:
        return {"judgment": None}

    # Stable pick for the whole day: same judgment for everyone, all day,
    # without needing any extra state beyond today's date itself.
    index = int(hashlib.md5(month_day.encode()).hexdigest(), 16) % len(judgments)
    pick = judgments[index]

    blurb = ""
    if API_KEY and guard.spent_today() < guard.DAILY_BUDGET_USD:
        try:
            started = time.time()
            message = client.messages.create(
                model=BLURB_MODEL,
                max_tokens=150,
                thinking={"type": "disabled"},
                system=(
                    "You write a single short, engaging sentence (max ~30 words) for a legal "
                    "research gazette's 'On This Day' feature, explaining in plain language why "
                    "a judgment is worth knowing about. No citation needed, no preamble -- just "
                    "the one sentence."
                ),
                messages=[{
                    "role": "user",
                    "content": f"Case: {pick['title']} ({pick['citation']}), decided {pick['decision_date']}.",
                }],
            )
            blurb = "".join(b.text for b in message.content if hasattr(b, "text")).strip()
            record_usage("on_this_day", BLURB_MODEL, message.usage, started)
        except Exception:
            log_event("claude_error", severity="WARNING", route="on_this_day", traceback=traceback.format_exc()[-2000:])
            blurb = ""

    response = {"judgment": {**pick, "blurb": blurb}}
    # Shared across instances, so it's one Claude call per day, not one per server
    cache_set(cache_key, response, days=2)
    return response


GAME_NAMES = {"trivia", "latin", "verdict"}


class GameScoreRequest(BaseModel):
    game: str
    score: int
    max_score: int


@app.post("/game-score")
def submit_game_score(request: GameScoreRequest, uid: str = Depends(require_user)):
    import datetime

    if request.game not in GAME_NAMES:
        raise HTTPException(status_code=400, detail="Unknown game.")

    firestore_db = get_db()
    doc_ref = firestore_db.collection("game_scores").document(uid)
    doc = doc_ref.get()
    data = doc.to_dict() if doc.exists else {}

    games = data.get("games", {})
    existing = games.get(request.game, {"best": 0, "plays": 0})
    games[request.game] = {
        "best": max(existing.get("best", 0), request.score),
        "plays": existing.get("plays", 0) + 1,
    }
    is_new_best = request.score > existing.get("best", 0)

    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).date()
    today_str = today.isoformat()
    streak = data.get("streak", {"current": 0, "longest": 0, "lastPlayedDate": ""})
    last_played = streak.get("lastPlayedDate", "")

    if last_played == today_str:
        pass  # already played today, streak doesn't change
    elif last_played == (today - datetime.timedelta(days=1)).isoformat():
        streak["current"] = streak.get("current", 0) + 1
    else:
        streak["current"] = 1
    streak["longest"] = max(streak.get("longest", 0), streak["current"])
    streak["lastPlayedDate"] = today_str

    total_score = sum(g.get("best", 0) for g in games.values())

    # Try to get a real display name from the Firebase auth record for the leaderboard
    try:
        display_name = firebase_auth.get_user(uid).display_name or "A reader"
    except Exception:
        display_name = data.get("displayName", "A reader")

    doc_ref.set({
        "displayName": display_name,
        "games": games,
        "streak": streak,
        "totalScore": total_score,
    })

    return {"is_new_best": is_new_best, "streak": streak, "total_score": total_score}


@app.get("/leaderboard")
def get_leaderboard():
    """Public -- top 10 readers by total score across all games."""
    firestore_db = get_db()
    docs = firestore_db.collection("game_scores").order_by(
        "totalScore", direction=firestore.Query.DESCENDING
    ).limit(10).stream()
    return {"leaderboard": [
        {
            "displayName": d.to_dict().get("displayName", "A reader"),
            "totalScore": d.to_dict().get("totalScore", 0),
            "streak": d.to_dict().get("streak", {}).get("current", 0),
        }
        for d in docs
    ]}


def graph_doc_id(case_id):
    return case_id.replace("/", "%2F")


def annotate_with_graph(sources):
    """Adds cited_by_count and an overruled hint to each source, from the
    precedent graph (one batched Firestore read). Best effort."""
    if db is None or not sources:
        return sources
    try:
        refs = [db.collection("case_graph").document(graph_doc_id(s["case_id"])) for s in sources]
        found = {snap.id: snap.to_dict() for snap in db.get_all(refs) if snap.exists}
        for s in sources:
            g = found.get(graph_doc_id(s["case_id"]))
            if g:
                s["cited_by_count"] = g.get("cited_by_count", 0)
                s["overruled_hint"] = bool(g.get("overruled_mentions"))
    except Exception as e:
        log_event("graph_lookup_error", severity="WARNING", error=str(e)[:200])
    return sources


@app.get("/graph/{case_id:path}")
def get_graph(case_id: str, req: Request):
    """The precedent graph around one judgment: what it relies on, what later
    judgments cite it, and any later judgment that mentions it as overruled."""
    rate_limit(req, "search", shared=False)
    empty = {"case_id": case_id, "cites": [], "cited_by": [], "cites_count": 0,
             "cited_by_count": 0, "overruled_mentions": []}
    if db is None:
        return empty
    cached = cache_get(f"graph|{case_id}")
    if cached is not None:
        return cached
    snap = db.collection("case_graph").document(graph_doc_id(case_id)).get()
    data = {**empty, **(snap.to_dict() or {})} if snap.exists else empty
    cache_set(f"graph|{case_id}", data, shared=False)
    return data


@app.get("/related/{case_id}")
def get_related(case_id: str):
    """Returns other corpus judgments that cite, or are cited by, this one.
    Public -- no sign-in needed, same as search itself."""
    if db is None:
        return {"related": []}
    doc = db.collection("case_relations").document(case_id).get()
    if not doc.exists:
        return {"related": []}
    return {"related": doc.to_dict().get("related", [])}


@app.get("/statutes")
def statutes_endpoint():
    """Every indexed statute section, grouped by Act -- powers the Statute
    Browser. Public, and cached, since the list only changes on re-index."""
    cached = cache_get("statutes")
    if cached is not None:
        return cached
    response = {"acts": list_statutes()}
    cache_set("statutes", response, shared=False)
    return response


@app.get("/statutes/{case_id}")
def statute_section_endpoint(case_id: str):
    """One statute section's full text, for reading it in the Statute Browser."""
    cache_key = f"statute|{case_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    section = get_statute_section(case_id)
    if not section:
        raise HTTPException(status_code=404, detail="Couldn't find that section in the corpus.")
    cache_set(cache_key, section, shared=False)
    return section


@app.post("/feedback")
def feedback_endpoint(request: FeedbackRequest, req: Request):
    """Thumbs up/down on an answer. Kept in Firestore (feedback/) for the admin
    dashboard and for building the answer test set; also logged."""
    rate_limit(req, "search", shared=False)
    log_event("feedback", helpful=request.helpful, route=request.route[:20], question=request.question[:500],
              reason=request.reason[:500])
    save_feedback(request.question, request.helpful, request.reason, request.answer, request.route)
    return {"status": "received"}


def save_feedback(question, helpful, reason="", answer="", route="ask"):
    if db is None:
        return
    try:
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        db.collection("feedback").add({
            "question": question[:1000], "helpful": bool(helpful), "reason": (reason or "")[:1000],
            "answer": (answer or "")[:4000], "route": (route or "ask")[:20],
            "created": now, "expires": now + datetime.timedelta(days=365),
        })
    except Exception as e:
        log_event("feedback_store_error", severity="WARNING", error=str(e)[:200])


class SubscribeRequest(BaseModel):
    email: str


@app.post("/subscribe")
def subscribe_endpoint(request: SubscribeRequest, req: Request):
    """Adds an email to the Resend Audience used for the weekly digest."""
    rate_limit(req, "compare")  # 5 a minute, 30 a day per visitor is plenty
    email = request.email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="That doesn't look like a valid email address.")

    if not RESEND_API_KEY or not RESEND_AUDIENCE_ID:
        raise HTTPException(status_code=500, detail="Server is missing Resend configuration.")

    try:
        resp = requests.post(
            f"https://api.resend.com/audiences/{RESEND_AUDIENCE_ID}/contacts",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"email": email, "unsubscribed": False},
            timeout=15,
        )
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=502, detail="Couldn't reach the email service. Try again shortly.")

    if resp.status_code in (200, 201):
        return {"status": "subscribed"}

    # A duplicate email is not really an error from the visitor's point of view
    if resp.status_code == 409 or "already exists" in resp.text.lower():
        return {"status": "already_subscribed"}

    raise HTTPException(status_code=502, detail="Couldn't complete the subscription. Try again shortly.")


def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Server is missing Firebase configuration.")
    return db


class HistoryRequest(BaseModel):
    question: str


@app.post("/history")
def save_history(request: HistoryRequest, uid: str = Depends(require_user)):
    """Saves a search to the signed-in user's permanent history (most recent 50 kept)."""
    firestore_db = get_db()
    history_ref = firestore_db.collection("users").document(uid).collection("history")
    history_ref.add({"question": request.question, "created_at": firestore.SERVER_TIMESTAMP})

    # Trim to the most recent 50 so this can't grow forever
    docs = list(history_ref.order_by("created_at", direction=firestore.Query.DESCENDING).stream())
    for doc in docs[50:]:
        doc.reference.delete()

    return {"status": "saved"}


@app.get("/history")
def get_history(uid: str = Depends(require_user)):
    firestore_db = get_db()
    history_ref = firestore_db.collection("users").document(uid).collection("history")
    docs = history_ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream()
    return {"history": [d.to_dict().get("question", "") for d in docs]}


class FavoriteRequest(BaseModel):
    case_id: str
    title: str
    citation: str
    source_url: str = ""


@app.post("/favorites")
def add_favorite(request: FavoriteRequest, uid: str = Depends(require_user)):
    firestore_db = get_db()
    doc_ref = firestore_db.collection("users").document(uid).collection("favorites").document(request.case_id)
    doc_ref.set({
        "case_id": request.case_id, "title": request.title,
        "citation": request.citation, "source_url": request.source_url,
        "saved_at": firestore.SERVER_TIMESTAMP,
    })
    return {"status": "saved"}


@app.delete("/favorites/{case_id}")
def remove_favorite(case_id: str, uid: str = Depends(require_user)):
    firestore_db = get_db()
    firestore_db.collection("users").document(uid).collection("favorites").document(case_id).delete()
    return {"status": "removed"}


@app.get("/favorites")
def get_favorites(uid: str = Depends(require_user)):
    firestore_db = get_db()
    docs = firestore_db.collection("users").document(uid).collection("favorites") \
        .order_by("saved_at", direction=firestore.Query.DESCENDING).stream()
    return {"favorites": [d.to_dict() for d in docs]}


# ---------------- plans, payments and the newer features ----------------
features.init(db, client, search, check_citations=check_citations,
              group_by_case=group_by_case, model=ANSWER_MODEL,
              answer_notes=answer_notes, clean_lang=clean_lang, languages=LANGUAGES)
app.include_router(plans.router)
app.include_router(features.router)
extras.init(get_case_by_id)
app.include_router(extras.router)
import admin  # noqa: E402  (needs extras and features set up first)
app.include_router(admin.router)
import control  # noqa: E402
app.include_router(control.router)
import growth  # noqa: E402
app.include_router(growth.router)
import tools  # noqa: E402
app.include_router(tools.router)
import library  # noqa: E402
app.include_router(library.router)
import cases  # noqa: E402
app.include_router(cases.router)
