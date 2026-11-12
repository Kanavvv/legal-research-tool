"""
guard.py

Everything that protects the API's wallet and tells us what it's doing:

  - client_ip():        the visitor's real IP behind Cloud Run's front end
  - rate_limit():       per-visitor limits shared across every server instance
  - shared cache:       answers survive restarts and are shared across instances
  - daily spend cap:    stops calling Claude once today's budget is used up
  - log_event():        one JSON line per event, which Cloud Logging indexes

Shared state lives in Firestore (already used for accounts), so nothing new
has to be signed up for. If Firestore is unavailable, each piece falls back
to per-instance memory rather than failing the request.
"""

import datetime
import hashlib
import json
import os
import sys
import threading
import time
from collections import OrderedDict

from fastapi import HTTPException, Request

try:
    from google.cloud.firestore_v1 import transactional, Increment
except Exception:  # firebase-admin not installed in some local setups
    transactional = None
    Increment = None

PREFIX = os.environ.get("GUARD_COLLECTION_PREFIX", "")  # lets tests use separate collections
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

_db = None


def init(db):
    """Called once from main.py with the Firestore client (or None)."""
    global _db
    _db = db


def _col(name):
    return _db.collection(PREFIX + name)


def _hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


# ---------------- logging ----------------

def log_event(event, **fields):
    """One structured line on stdout; Cloud Logging turns it into jsonPayload."""
    severity = fields.pop("severity", "INFO")
    line = {"severity": severity, "event": event, **fields}
    print(json.dumps(line, default=str), file=sys.stdout, flush=True)


# ---------------- client IP ----------------

def client_ip(req: Request) -> str:
    """Cloud Run puts the caller's address in X-Forwarded-For, appended after
    anything the caller sent themselves, so the last entry is the trustworthy
    one. req.client.host is Google's front end, shared by many visitors."""
    forwarded = req.headers.get("x-forwarded-for", "")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return req.client.host if req.client else "unknown"


# ---------------- rate limiting ----------------

# bucket -> (per minute, per day). Searches are cheap, Claude calls are not.
# Daily allowances per plan live in plans.py; the per-day numbers here are
# only a backstop per network address (several people can share one).
LIMITS = {
    "ask": (10, 1000),
    "compare": (5, 300),
    "argument": (5, 300),
    "search": (60, 1500),
    "share": (10, 100),
}

_mem_counts = {}
_mem_lock = threading.Lock()


def _mem_hit(key, limit, window_seconds):
    now = time.time()
    with _mem_lock:
        stamps = [t for t in _mem_counts.get(key, []) if now - t < window_seconds]
        if len(stamps) >= limit:
            _mem_counts[key] = stamps
            return False
        stamps.append(now)
        _mem_counts[key] = stamps
        if len(_mem_counts) > 20000:  # keep memory bounded
            for k in list(_mem_counts)[:5000]:
                _mem_counts.pop(k, None)
        return True


def _firestore_hit(bucket, ip_key, per_minute, per_day):
    now = datetime.datetime.now(IST)
    minute_id = f"{bucket}_{ip_key}_{now:%Y%m%d%H%M}"
    day_id = f"{bucket}_{ip_key}_{now:%Y%m%d}"
    minute_ref = _col("rate_limits").document(minute_id)
    day_ref = _col("rate_limits").document(day_id)
    expires = now + datetime.timedelta(days=2)  # for a Firestore TTL policy on `expires`

    @transactional
    def bump(tx):
        m = minute_ref.get(transaction=tx)
        d = day_ref.get(transaction=tx)
        m_n = (m.to_dict() or {}).get("n", 0) if m.exists else 0
        d_n = (d.to_dict() or {}).get("n", 0) if d.exists else 0
        if m_n >= per_minute:
            return "minute"
        if d_n >= per_day:
            return "day"
        tx.set(minute_ref, {"n": m_n + 1, "expires": expires})
        tx.set(day_ref, {"n": d_n + 1, "expires": expires})
        return None

    return bump(_db.transaction())


def rate_limit(req: Request, bucket: str, shared: bool = True):
    """Raises 429 when this visitor is over the bucket's per-minute or per-day limit."""
    per_minute, per_day = LIMITS[bucket]
    ip = client_ip(req)
    ip_key = _hash(ip)

    blocked = None
    if shared and _db is not None and transactional is not None:
        try:
            blocked = _firestore_hit(bucket, ip_key, per_minute, per_day)
        except Exception as e:
            log_event("rate_limit_store_error", severity="WARNING", bucket=bucket, error=str(e)[:200])
            shared = False
    if not shared or _db is None or transactional is None:
        if not _mem_hit(f"{bucket}|m|{ip_key}", per_minute, 60):
            blocked = "minute"
        elif not _mem_hit(f"{bucket}|d|{ip_key}", per_day, 86400):
            blocked = "day"

    if blocked:
        log_event("rate_limited", severity="WARNING", bucket=bucket, ip=ip_key, window=blocked)
        detail = (
            "Too many requests. Please wait a minute and try again."
            if blocked == "minute"
            else "You've reached today's limit for this feature. It resets at midnight IST."
        )
        raise HTTPException(status_code=429, detail=detail)


# ---------------- cache ----------------

_mem_cache = OrderedDict()
MEM_CACHE_MAX = 500
CACHE_DAYS = int(os.environ.get("ANSWER_CACHE_DAYS", "14"))


def cache_get(key):
    if key in _mem_cache:
        _mem_cache.move_to_end(key)
        return _mem_cache[key]
    if _db is None:
        return None
    try:
        snap = _col("answer_cache").document(_hash(key)).get()
        if not snap.exists:
            return None
        data = snap.to_dict() or {}
        expires = data.get("expires")
        if expires and expires < datetime.datetime.now(datetime.timezone.utc):
            return None
        value = data.get("value")
        if value is not None:
            _mem_set(key, value)
        return value
    except Exception as e:
        log_event("cache_store_error", severity="WARNING", op="get", error=str(e)[:200])
        return None


def cache_delete(key):
    """Forgets one cached answer (this instance's memory and the shared store)."""
    _mem_cache.pop(key, None)
    if _db is None:
        return
    try:
        _col("answer_cache").document(_hash(key)).delete()
    except Exception as e:
        log_event("cache_store_error", severity="WARNING", op="delete", error=str(e)[:200])


def log_question(route, text, lang="en", cached=False, cache_key=None, **extra):
    """questions/: the text of what people ask, without who asked, kept 30 days.
    Feeds the admin dashboard and the trending page."""
    if _db is None:
        return
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        _col("questions").add({
            "text": (text or "")[:1000], "route": route, "lang": lang, "cached": bool(cached),
            "cache_key": cache_key, "created": now, "expires": now + datetime.timedelta(days=30), **extra,
        })
    except Exception as e:
        log_event("question_log_error", severity="WARNING", error=str(e)[:200])


# ---------------- admin settings ----------------

SETTINGS_DEFAULTS = {
    "daily_budget_usd": None,          # None: use the DAILY_BUDGET_USD env var
    "whatsapp_per_day": None,          # None: use WHATSAPP_PER_DAY
    "whatsapp_paused": False,
    "whatsapp_pause_message": "Nyaya on WhatsApp is taking a short break. Please use https://asknyaya.in for now.",
    "daily_law_on": True,
    "banner_on": False,
    "banner_text": "",
    "banner_link": "",
    "blocked_uids": [],
}
_settings_cache = {"at": 0.0, "value": None}


def get_settings():
    """Settings the admin dashboard can change without a deploy, cached for 30 seconds."""
    if _settings_cache["value"] is not None and time.time() - _settings_cache["at"] < 30:
        return _settings_cache["value"]
    value = dict(SETTINGS_DEFAULTS)
    if _db is not None:
        try:
            snap = _col("settings").document("app").get()
            if snap.exists:
                value.update({k: v for k, v in (snap.to_dict() or {}).items() if k in SETTINGS_DEFAULTS})
        except Exception as e:
            log_event("settings_error", severity="WARNING", error=str(e)[:200])
    _settings_cache.update(at=time.time(), value=value)
    return value


def save_settings(changes, who=""):
    if _db is None:
        raise HTTPException(status_code=503, detail="Settings need the database.")
    clean = {k: v for k, v in changes.items() if k in SETTINGS_DEFAULTS}
    _col("settings").document("app").set({**clean, "updated": datetime.datetime.now(datetime.timezone.utc),
                                          "updated_by": who}, merge=True)
    _settings_cache["value"] = None
    log_event("settings_changed", keys=sorted(clean), by=who)
    return get_settings()


def _mem_set(key, value):
    _mem_cache[key] = value
    _mem_cache.move_to_end(key)
    if len(_mem_cache) > MEM_CACHE_MAX:
        _mem_cache.popitem(last=False)


def cache_set(key, value, shared=True, days=CACHE_DAYS):
    _mem_set(key, value)
    if not shared or _db is None:
        return
    try:
        _col("answer_cache").document(_hash(key)).set({
            "value": value,
            "created": datetime.datetime.now(datetime.timezone.utc),
            "expires": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days),
        })
    except Exception as e:
        log_event("cache_store_error", severity="WARNING", op="set", error=str(e)[:200])


# ---------------- spend tracking and daily cap ----------------

# USD per million tokens (input, output). Override with MODEL_PRICES_JSON if prices change.
PRICES = {
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-haiku-5-5": (0.10, 0.50),
}
try:
    PRICES.update({k: tuple(v) for k, v in json.loads(os.environ.get("MODEL_PRICES_JSON", "{}")).items()})
except Exception:
    pass

DAILY_BUDGET_USD = float(os.environ.get("DAILY_BUDGET_USD", "10"))

_spend_cache = {"day": None, "usd": 0.0, "at": 0.0}
_mem_spend = {}


def _today():
    return datetime.datetime.now(IST).strftime("%Y-%m-%d")


def cost_usd(model, usage):
    p_in, p_out = PRICES.get(model, (3.00, 15.00))
    in_tokens = (getattr(usage, "input_tokens", 0) or 0) \
        + (getattr(usage, "cache_creation_input_tokens", 0) or 0) * 1.25 \
        + (getattr(usage, "cache_read_input_tokens", 0) or 0) * 0.1
    out_tokens = getattr(usage, "output_tokens", 0) or 0
    return (in_tokens * p_in + out_tokens * p_out) / 1_000_000


def spent_today():
    day = _today()
    if _spend_cache["day"] == day and time.time() - _spend_cache["at"] < 30:
        return _spend_cache["usd"]
    usd = _mem_spend.get(day, 0.0)
    if _db is not None:
        try:
            snap = _col("spend").document(day).get()
            if snap.exists:
                usd = float((snap.to_dict() or {}).get("usd", 0.0))
        except Exception as e:
            log_event("spend_store_error", severity="WARNING", op="get", error=str(e)[:200])
    _spend_cache.update(day=day, usd=usd, at=time.time())
    return usd


def budget_usd():
    """Today's spending cap: the admin setting if there is one, else DAILY_BUDGET_USD."""
    b = get_settings().get("daily_budget_usd")
    return float(b) if b else DAILY_BUDGET_USD


def check_budget():
    """Raises 503 once today's Claude spend has reached the daily budget."""
    cap = budget_usd()
    if cap <= 0:
        return
    usd = spent_today()
    if usd >= cap:
        log_event("budget_exhausted", severity="ERROR", spent_usd=round(usd, 4), budget_usd=cap)
        raise HTTPException(
            status_code=503,
            detail="Nyaya has answered as many questions as it can today. Please come back tomorrow.",
        )


def _record_user_cost(user, route, usd, usage):
    """user_costs/{uid}_{YYYYMM}: what each account actually costs us, per month and per feature.
    Feeds pricing decisions (see usage_report.py)."""
    if _db is None or Increment is None:
        return
    who = user or "anon"
    month = datetime.datetime.now(IST).strftime("%Y%m")
    try:
        _col("user_costs").document(f"{who}_{month}").set({
            "uid": who, "month": month,
            "usd": Increment(usd), "calls": Increment(1),
            "input_tokens": Increment(getattr(usage, "input_tokens", 0) or 0),
            "output_tokens": Increment(getattr(usage, "output_tokens", 0) or 0),
            "by_route": {route: {"usd": Increment(usd), "calls": Increment(1)}},
            "updated": datetime.datetime.now(datetime.timezone.utc),
        }, merge=True)
    except Exception as e:
        log_event("user_cost_store_error", severity="WARNING", error=str(e)[:200])


def record_usage(route, model, usage, started_at=None, user=None, **extra):
    """Adds this call's cost to today's total and to the caller's monthly cost row, and logs it.
    `user` is the Firebase uid; signed-out use is pooled under "anon"."""
    usd = cost_usd(model, usage)
    day = _today()
    _record_user_cost(user, route, usd, usage)
    _mem_spend[day] = _mem_spend.get(day, 0.0) + usd
    if _spend_cache["day"] == day:
        _spend_cache["usd"] += usd
    if _db is not None and Increment is not None:
        try:
            _col("spend").document(day).set(
                {"usd": Increment(usd), "calls": Increment(1),
                 "by_route": {route: Increment(usd)}, "calls_by_route": {route: Increment(1)}},
                merge=True,
            )
        except Exception as e:
            log_event("spend_store_error", severity="WARNING", op="add", error=str(e)[:200])
    log_event(
        "claude_call", route=route, model=model,
        input_tokens=getattr(usage, "input_tokens", 0),
        output_tokens=getattr(usage, "output_tokens", 0),
        cost_usd=round(usd, 6),
        latency_ms=round((time.time() - started_at) * 1000) if started_at else None,
        **extra,
    )
    return usd
