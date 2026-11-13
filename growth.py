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
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
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
    asked = [{"question": sample[k], "count": c} for k, c in sorted(counts.items(), key=lambda kv: -kv[1])[:30]]
    return {"featured": _featured(), "asked": asked, "most_read": _top_shares(15)}


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
                      "share_id": sid, "topic": it.topic.strip()[:40]})
    _trend_doc().set({"items": items, "updated": datetime.datetime.now(datetime.timezone.utc),
                      "by": claims.get("email", "")})
    _drop_cache()
    log_event("trending_saved", count=len(items))
    return {"featured": items}
