"""Batch 4: sharing and growth.

- Visitor counts  POST /hit (public)    page views and share events, only sent by browsers whose
                                        visitor tapped "Allow" on the consent banner. No IDs, no IPs
                                        stored: one counter document per day.
- Trending        GET /trending (public) questions the owner picked in the control room, plus the
                                        most-read answers their makers chose to list publicly.
- Control room    GET /admin/visitors, GET/POST /admin/trending
"""

import datetime
import json
import os
import re
import time
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import guard
from extras import _admin
from guard import IST, log_event, rate_limit

router = APIRouter()

_BOT_RE = re.compile(r"bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp", re.I)
_EVENTS = {"share_link", "friend_wa", "card_saved", "card_shared", "trending_open", "guide_wa",
           "triage", "triage_open", "wa_daily_join", "wa_notice", "answers_open", "case_added", "explainer_open", "moot_share",
           "template_word", "legal_aid_check", "embed_view", "embed_lookup", "how_long_open", "widget_copy"}
_REF_RE = re.compile(r"^[a-z0-9_-]{1,20}$")
_HOST_RE = re.compile(r"^[a-z0-9.-]{3,80}$")
OWN_HOSTS = ("asknyaya.in", "www.asknyaya.in", "localhost", "127.0.0.1")
MAX_TRENDING = 12


def _day(dt=None):
    return (dt or datetime.datetime.now(datetime.timezone.utc)).astimezone(IST).strftime("%Y-%m-%d")


def _clean_path(p):
    """Group pages so one person's share link or Act section doesn't become its own row."""
    p = (p or "/").split("?")[0].split("#")[0][:120] or "/"
    if not p.startswith("/"):
        return None
    p = re.sub(r"^/a/[^/]+$", "/a/:shared", p)
    p = re.sub(r"^/acts/[^/]+/.+$", "/acts/:section", p)
    p = re.sub(r"^/lawyers/(?!join$)[^/]+$", "/lawyers/:profile", p)
    p = re.sub(r"[^A-Za-z0-9/_:-]", "", p).rstrip("/") or "/"
    return p[:60]


def _key(s):
    # Firestore map keys: keep them plain. "." would read as nesting in some calls.
    return s.replace(".", "_")


@router.post("/hit")
async def hit(req: Request):
    """One page view or share event. Body is text/plain JSON so browsers can send it with
    sendBeacon without a CORS preflight."""
    rate_limit(req, "search", shared=False)
    if _BOT_RE.search(req.headers.get("user-agent", "")):
        return {"ok": True}
    try:
        body = json.loads((await req.body())[:2000] or b"{}")
        if not isinstance(body, dict):
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="Bad request.")
    if guard._db is None or guard.Increment is None:
        return {"ok": True}
    inc = guard.Increment(1)
    doc = {}
    event = str(body.get("event") or "")
    if event:
        if event not in _EVENTS:
            raise HTTPException(status_code=400, detail="Bad request.")
        doc["events"] = {event: inc}
    else:
        path = _clean_path(str(body.get("path") or "/"))
        if not path:
            raise HTTPException(status_code=400, detail="Bad request.")
        doc["views"] = inc
        doc["paths"] = {_key(path): inc}
        doc["devices"] = {"mobile" if body.get("mobile") else "desktop": inc}
        ref = str(body.get("ref") or "").lower()
        host = str(body.get("from") or "").lower().removeprefix("www.")
        if ref and _REF_RE.match(ref):
            doc["refs"] = {_key("tag:" + ref): inc}
        elif host and _HOST_RE.match(host) and host not in OWN_HOSTS:
            doc["refs"] = {_key(host): inc}
        elif body.get("landing"):
            doc["refs"] = {"direct": inc}
        if body.get("landing"):
            doc["visits"] = inc
    try:
        guard._col("analytics").document(_day()).set(doc, merge=True)
    except Exception as e:
        log_event("hit_store_error", severity="WARNING", error=str(e)[:200])
    return {"ok": True}


def _merge(into, part):
    for k, v in (part or {}).items():
        into[k] = into.get(k, 0) + (v or 0)


@router.get("/admin/visitors")
def visitors(days: int = 30, claims=Depends(_admin)):
    days = max(1, min(days, 90))
    today = datetime.datetime.now(datetime.timezone.utc)
    names = [_day(today - datetime.timedelta(days=i)) for i in range(days - 1, -1, -1)]
    snaps = {s.id: (s.to_dict() or {}) for s in guard._db.get_all([guard._col("analytics").document(n) for n in names])} \
        if guard._db is not None else {}
    per_day, paths, refs, devices, events = [], {}, {}, {}, {}
    for n in names:
        d = snaps.get(n, {})
        per_day.append({"day": n, "views": d.get("views", 0), "visits": d.get("visits", 0)})
        _merge(paths, d.get("paths")); _merge(refs, d.get("refs"))
        _merge(devices, d.get("devices")); _merge(events, d.get("events"))

    def top(m, n=15):
        return [{"name": k, "count": v} for k, v in sorted(m.items(), key=lambda kv: -kv[1])[:n]]

    return {"days": per_day, "paths": top(paths), "refs": top(refs), "devices": devices, "events": events,
            "views": sum(x["views"] for x in per_day), "visits": sum(x["visits"] for x in per_day)}


# ---------------- trending ----------------

class TrendItem(BaseModel):
    title: str
    question: str = ""
    share_id: str = ""
    topic: str = ""
    auto: bool = False  # picked by the weekly job; replaced next week


class TrendList(BaseModel):
    items: list[TrendItem]


def _trend_doc():
    return guard._col("settings").document("trending")


def _featured():
    snap = _trend_doc().get()
    return (snap.to_dict() or {}).get("items", []) if snap.exists else []


def _top_shares(n=8):
    """Most-read answers whose makers chose to list them publicly."""
    rows = []
    for snap in admin_db().collection("shares").where("public", "==", True).limit(500).stream():
        d = snap.to_dict() or {}
        rows.append({"share_id": snap.id, "title": (d.get("question") or "")[:140], "views": d.get("views", 0)})
    rows.sort(key=lambda r: -r["views"])
    return rows[:n]


def admin_db():
    import admin
    return admin._db()


_trend_cache = {"at": 0, "out": None}   # per instance, 10 minutes


@router.get("/trending")
def trending(req: Request):
    rate_limit(req, "search", shared=False)
    if _trend_cache["out"] is not None and time.time() - _trend_cache["at"] < 600:
        return _trend_cache["out"]
    out = {"featured": [], "most_read": []}
    try:
        out["featured"] = _featured()
        out["most_read"] = _top_shares()
    except Exception as e:
        log_event("trending_error", severity="WARNING", error=str(e)[:200])
    _trend_cache.update(at=time.time(), out=out)
    return out


def _drop_cache():
    _trend_cache.update(at=0, out=None)


@router.get("/admin/trending")
def admin_trending(claims=Depends(_admin)):
    """What's featured now, plus the questions asked most this week to pick from."""
    return {"featured": _featured(), "asked": _asked_this_week(30), "most_read": _top_shares(15)}


def _asked_this_week(n=30, days=7):
    """The questions asked most in the last week (website, WhatsApp, Is this legal?), repeats grouped."""
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    counts, sample = {}, {}
    for snap in guard._col("questions").where("created", ">=", since).limit(3000).stream():
        d = snap.to_dict() or {}
        text = (d.get("text") or "").strip()
        if not text or d.get("route") not in ("ask", "whatsapp", "check"):
            continue
        k = re.sub(r"[^a-z0-9ऀ-ॿ ]", "", text.lower())
        k = re.sub(r"\s+", " ", k)[:200]
        counts[k] = counts.get(k, 0) + 1
        sample.setdefault(k, text[:300])
    return [{"question": sample[k], "count": c} for k, c in sorted(counts.items(), key=lambda kv: -kv[1])[:n]]


@router.post("/admin/trending")
def save_trending(body: TrendList, claims=Depends(_admin)):
    items = []
    for it in body.items[:MAX_TRENDING]:
        title = it.title.strip()[:140]
        if not title:
            continue
        sid = it.share_id.strip()
        m = re.search(r"/a/([A-Za-z0-9_-]{6,20})", sid)
        sid = m.group(1) if m else sid
        if sid and not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", sid):
            raise HTTPException(status_code=400, detail=f"That share link for \"{title}\" doesn't look right.")
        items.append({"title": title, "question": (it.question.strip() or title)[:600],
                      "share_id": sid, "topic": it.topic.strip()[:40], "auto": bool(it.auto)})
    _trend_doc().set({"items": items, "updated": datetime.datetime.now(datetime.timezone.utc),
                      "by": claims.get("email", "")})
    _drop_cache()
    log_event("trending_saved", count=len(items))
    return {"featured": items}


# ---------------- weekly pick ----------------
# Every Monday Cloud Scheduler calls /trending/weekly. It takes the questions
# asked most last week, has Claude choose up to 5 that are useful to anyone and
# rewrite each as a general question with nothing personal in it, swaps them in
# for last week's automatic picks (items the admin added by hand stay, on top),
# and emails the admins the new list so they can remove anything.

WEEKLY_AUDIENCE = os.environ.get("TRENDING_AUDIENCE", "https://api.asknyaya.in/trending/weekly")
WEEKLY_PICKS = 5
MIN_TIMES_ASKED = 2  # never feature a question only one person asked
_PERSONAL = re.compile(r"\d{4,}|@|https?://|www\.|\b(?:mr|mrs|ms|shri|smt)\.?\s+[a-z]", re.I)

WEEKLY_SYSTEM = (
    "You choose questions for the public 'Trending this week' page of Nyaya, a free Indian legal "
    "information website. You get last week's most-asked questions, numbered, with how many times each "
    "was asked. Pick up to 5 that ordinary people in India would find useful, with variety across topics.\n"
    "Rewrite each as a short general question (at most 90 characters) that any stranger could have asked: "
    "remove every name, phone number, address, place smaller than a state, date, amount tied to one person, "
    "and any case detail. Keep the language of the original (English, Hindi or Hinglish).\n"
    "Never pick a question about a specific identifiable person, a crime the asker seems to be planning, "
    "self-harm, sexual content, or anything that cannot be made general. If fewer than 5 qualify, return fewer.\n"
    "topic: one or two words, e.g. Tenants, Consumer, Police, Family, Work, Money, Property, Cyber, Traffic.\n"
    'Reply with JSON only: {"picks": [{"n": <number of the source question>, "title": "...", "topic": "..."}]}'
)


def _clean_picks(asked, raw, n=WEEKLY_PICKS):
    """Keeps only safe, well-formed picks drawn from questions asked at least MIN_TIMES_ASKED times."""
    out, seen = [], set()
    for p in (raw or [])[: n * 2]:
        if not isinstance(p, dict):
            continue
        try:
            i = int(p.get("n")) - 1
        except (TypeError, ValueError):
            continue
        title = re.sub(r"\s+", " ", str(p.get("title") or "")).strip()
        topic = re.sub(r"\s+", " ", str(p.get("topic") or "")).strip()[:40]
        if not (0 <= i < len(asked)) or asked[i]["count"] < MIN_TIMES_ASKED:
            continue
        if not (10 <= len(title) <= 140) or _PERSONAL.search(title) or title.lower() in seen:
            continue
        seen.add(title.lower())
        out.append({"title": title, "question": title, "share_id": "", "topic": topic, "auto": True})
        if len(out) == n:
            break
    return out


def _merge_weekly(current, picks, n=WEEKLY_PICKS):
    """Hand-picked items first, then this week's picks, topped up from last week's if there are few."""
    manual = [it for it in current if not it.get("auto")]
    old_auto = [it for it in current if it.get("auto")]
    have = {it["title"].lower() for it in manual + picks}
    fill = [it for it in old_auto if it["title"].lower() not in have][: max(0, n - len(picks))]
    return (manual + picks + fill)[:MAX_TRENDING]


def _ask_claude_for_picks(asked):
    import features
    from guard import record_usage
    listing = "\n".join(f"{i + 1}. ({a['count']}x) {a['question'][:300]}" for i, a in enumerate(asked))
    model = features._helpers["model"]
    started = time.time()
    msg = features._client.messages.create(model=model, max_tokens=800, system=WEEKLY_SYSTEM,
                                           messages=[{"role": "user", "content": listing}])
    record_usage("trending_weekly", model, msg.usage, started)
    text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()
    m = re.search(r"\{.*\}", text, re.S)
    try:
        return (json.loads(m.group(0) if m else text) or {}).get("picks", [])
    except (ValueError, AttributeError):
        log_event("trending_weekly_bad_json", severity="WARNING", text=text[:300])
        return []


def _verify_cron(req: Request, audience: str):
    from extras import DAILY_INVOKER
    if not DAILY_INVOKER:
        raise HTTPException(status_code=404)
    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token
    token = req.headers.get("authorization", "").removeprefix("Bearer ").strip()
    try:
        claims = id_token.verify_oauth2_token(token, g_requests.Request(), audience=audience)
    except Exception:
        raise HTTPException(status_code=403)
    if claims.get("email") != DAILY_INVOKER or not claims.get("email_verified"):
        raise HTTPException(status_code=403)


def _weekly_email(items, picks):
    esc = lambda x: str(x or "").replace("&", "&amp;").replace("<", "&lt;")  # noqa: E731
    rows = "".join(f"<li>{esc(it['title'])} <span style=\"color:#666\">({esc(it.get('topic'))})</span>"
                   f"{' <strong>new</strong>' if it in picks else ''}</li>" for it in items)
    return ("Nyaya trending page: this week's questions",
            f"<p>This week's trending questions are live on "
            f"<a href=\"https://asknyaya.in/trending\">asknyaya.in/trending</a>:</p><ol>{rows}</ol>"
            "<p>Each was rewritten so nothing personal shows. To remove or reword one, open "
            "<a href=\"https://asknyaya.in/admin#trending\">Trending in the admin page</a>.</p>")


@router.post("/trending/weekly")
def trending_weekly(req: Request):
    """Called every Monday by Cloud Scheduler with a Google-signed token."""
    _verify_cron(req, WEEKLY_AUDIENCE)
    asked = [a for a in _asked_this_week(40) if a["count"] >= MIN_TIMES_ASKED]
    picks = _clean_picks(asked, _ask_claude_for_picks(asked)) if asked else []
    current = _featured()
    items = _merge_weekly(current, picks)
    if items != current:
        _trend_doc().set({"items": items, "updated": datetime.datetime.now(datetime.timezone.utc), "by": "weekly pick"})
        _drop_cache()
    emailed = None
    if picks:
        import admin
        emailed = admin._email_admins(*_weekly_email(items, picks))
    log_event("trending_weekly", candidates=len(asked), picked=len(picks), total=len(items), emailed=emailed)
    return {"candidates": len(asked), "picked": len(picks), "featured": items}
