"""Admin dashboard API (/admin/*): the numbers, the health of every service Nyaya
depends on, a list of issues with fixes, and settings that change without a deploy.

Only accounts in ADMIN_EMAILS (with a verified email) can call these.
"""

import collections
import datetime
import os
import re
import time

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import features
import guard
import plans
from extras import _admin, WA_ON, WA_PHONE_ID, WA_TOKEN, WA_PER_DAY, DAILY_INVOKER
from guard import log_event

router = APIRouter()
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "legal-research-tool-509320")
REGION = "us-central1"
SERVICE = "legal-research-backend"
WABA_ID = os.environ.get("WHATSAPP_WABA_ID", "1021902343589464")
DAILY_JOB = "nyaya-law-of-the-day"
IST = guard.IST


def _db():
    if features._db is None:
        raise HTTPException(status_code=503, detail="The database isn't connected.")
    return features._db


def _col(name):
    return _db().collection(guard.PREFIX + name) if name in ("spend", "questions", "settings", "answer_cache", "user_costs") \
        else _db().collection(name)


def _count(query):
    try:
        return int(query.count().get()[0][0].value)
    except Exception:
        return None


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(v):
    return v.isoformat() if isinstance(v, datetime.datetime) else v


_gsession = {"s": None}


def _google():
    """An authorised session for Google Cloud APIs (logs, scheduler) as the service's own account."""
    if _gsession["s"] is None:
        import google.auth
        from google.auth.transport.requests import AuthorizedSession
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        _gsession["s"] = AuthorizedSession(creds)
    return _gsession["s"]


def _graph(path, **params):
    r = requests.get(f"https://graph.facebook.com/v21.0/{path}", params=params,
                     headers={"Authorization": f"Bearer {WA_TOKEN}"}, timeout=10)
    r.raise_for_status()
    return r.json()


# ---------------- public: site banner ----------------

@router.get("/site-config")
def site_config():
    s = guard.get_settings()
    banner = {"text": s.get("banner_text", ""), "link": s.get("banner_link", "")} if s.get("banner_on") and s.get("banner_text") else None
    return {"banner": banner, "features_off": s.get("features_off") or []}


# ---------------- overview ----------------

def _signups(dates):
    signups = {d: 0 for d in dates}
    total, active = 0, 0
    week_ago_ms = (time.time() - 7 * 86400) * 1000
    try:
        from firebase_admin import auth
        for u in auth.list_users().iterate_all():
            total += 1
            created = u.user_metadata.creation_timestamp or 0
            day = datetime.datetime.fromtimestamp(created / 1000, IST).date().isoformat()
            if day in signups:
                signups[day] += 1
            if (u.user_metadata.last_sign_in_timestamp or 0) >= week_ago_ms or \
                    (getattr(u.user_metadata, "last_refresh_timestamp", None) or 0) >= week_ago_ms:
                active += 1
    except Exception as e:
        log_event("admin_error", severity="WARNING", part="users", error=str(e)[:200])
    return signups, total, active


def _spend(dates):
    spend = {d: {"usd": 0.0, "calls": 0} for d in dates}
    by_route = collections.defaultdict(lambda: {"usd": 0.0, "calls": 0})
    for snap in _col("spend").where("__name__", ">=", _col("spend").document(dates[0])).stream():
        if snap.id not in spend:
            continue
        d = snap.to_dict() or {}
        spend[snap.id] = {"usd": round(float(d.get("usd", 0)), 4), "calls": int(d.get("calls", 0))}
        for r, usd in (d.get("by_route") or {}).items():
            by_route[r]["usd"] += float(usd or 0)
        for r, n in (d.get("calls_by_route") or {}).items():
            by_route[r]["calls"] += int(n or 0)
    return spend, by_route


def _pro_now():
    n = 0
    for snap in _db().collection("users").where("plan", "==", "pro").stream():
        until = (snap.to_dict() or {}).get("pro_until")
        if until and until > _now():
            n += 1
    return n


def _revenue():
    total, last30, count = 0, 0, 0
    month_ago = _now() - datetime.timedelta(days=30)
    for snap in _db().collection("payments").stream():
        p = snap.to_dict() or {}
        count += 1
        total += int(p.get("amount") or 0)
        if p.get("created") and p["created"] >= month_ago:
            last30 += int(p.get("amount") or 0)
    return total, last30, count


def _feedback_counts(since):
    up = down = 0
    for snap in _db().collection("feedback").where("created", ">=", since).limit(5000).stream():
        if (snap.to_dict() or {}).get("helpful"):
            up += 1
        else:
            down += 1
    return up, down


@router.get("/admin/overview")
def overview(days: int = 30, claims=Depends(_admin)):
    from concurrent.futures import ThreadPoolExecutor
    days = max(7, min(days, 90))
    today = datetime.datetime.now(IST).date()
    dates = [(today - datetime.timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    since = _now() - datetime.timedelta(days=days)
    questions = _col("questions")
    lawyers = _db().collection("lawyers")
    with ThreadPoolExecutor(max_workers=12) as pool:  # independent reads, so the page loads in one round trip
        f = {
            "spend": pool.submit(_spend, dates), "users": pool.submit(_signups, dates), "pro": pool.submit(_pro_now),
            "rev": pool.submit(_revenue), "fb": pool.submit(_feedback_counts, since),
            "q": pool.submit(_count, questions), "wa_q": pool.submit(_count, questions.where("route", "==", "whatsapp")),
            "subs": pool.submit(_count, _db().collection("wa_daily")),
            "lp": pool.submit(_count, lawyers.where("status", "==", "pending")),
            "ll": pool.submit(_count, lawyers.where("status", "==", "approved")),
            "shares": pool.submit(_count, _db().collection("shares")),
        }
        r = {k: v.result() for k, v in f.items()}
    spend, by_route = r["spend"]
    signups, users_total, active_7d = r["users"]
    revenue_paise, revenue_30d, payments = r["rev"]
    total_usd = sum(v["usd"] for v in spend.values())
    total_calls = sum(v["calls"] for v in spend.values())
    usd_inr = float(os.environ.get("USD_INR", "88"))
    return {
        "days": dates,
        "spend": [spend[d] for d in dates],
        "signups": [signups[d] for d in dates],
        "totals": {
            "usd": round(total_usd, 2), "inr": round(total_usd * usd_inr), "calls": total_calls,
            "usd_today": round(spend[dates[-1]]["usd"], 2), "budget_usd": guard.budget_usd(),
            "cost_per_call_inr": round(total_usd * usd_inr / total_calls, 2) if total_calls else None,
            "users": users_total, "active_7d": active_7d, "pro_now": r["pro"],
            "revenue_inr": revenue_paise / 100, "revenue_30d_inr": revenue_30d / 100, "payments": payments,
            "questions_30d": r["q"], "whatsapp_questions_30d": r["wa_q"],
            "feedback_up": r["fb"][0], "feedback_down": r["fb"][1],
            "whatsapp_subscribers": r["subs"], "lawyers_pending": r["lp"], "lawyers_live": r["ll"], "shares": r["shares"],
        },
        "by_route": sorted(({"route": k, "usd": round(v["usd"], 3), "calls": v["calls"]} for k, v in by_route.items()),
                           key=lambda x: -x["usd"]),
        "pro_enabled": plans.PRO_ENABLED,
        "usd_inr": usd_inr,
    }


# ---------------- what people ask ----------------

@router.get("/admin/questions")
def recent_questions(route: str = "", limit: int = 100, claims=Depends(_admin)):
    since = _now() - datetime.timedelta(days=7)
    q = _col("questions").where("created", ">=", since)
    rows = []
    for snap in q.limit(3000).stream():
        d = snap.to_dict() or {}
        if route and d.get("route") != route:
            continue
        rows.append(d)
    rows.sort(key=lambda d: d.get("created") or since, reverse=True)
    top = collections.Counter(" ".join((d.get("text") or "").lower().split())[:160] for d in rows)
    return {
        "recent": [{"text": d.get("text"), "route": d.get("route"), "lang": d.get("lang"), "cached": d.get("cached"),
                    "emergency": d.get("emergency") or [], "follow_up": d.get("follow_up"), "voice": d.get("voice"),
                    "created": _iso(d.get("created"))} for d in rows[:max(1, min(limit, 300))]],
        "top": [{"text": t, "count": n} for t, n in top.most_common(25) if t],
        "total_7d": len(rows),
        "cache_rate": round(sum(1 for d in rows if d.get("cached")) / len(rows), 3) if rows else None,
        "emergencies_7d": sum(1 for d in rows if d.get("emergency")),
    }


# ---------------- feedback ----------------

class FeedbackUpdate(BaseModel):
    status: str  # "open" or "resolved"
    note: str = ""


@router.get("/admin/feedback")
def list_feedback(helpful: str = "no", status: str = "open", limit: int = 100, claims=Depends(_admin)):
    q = _db().collection("feedback").where("created", ">=", _now() - datetime.timedelta(days=90))
    out = []
    for snap in q.limit(2000).stream():
        d = snap.to_dict() or {}
        if helpful == "no" and d.get("helpful") is not False:
            continue
        if helpful == "yes" and d.get("helpful") is not True:
            continue
        st = d.get("status", "open")
        if status != "all" and st != status:
            continue
        out.append({"id": snap.id, "question": d.get("question", ""), "answer": d.get("answer", ""),
                    "reason": d.get("reason", ""), "route": d.get("route", "ask"), "helpful": d.get("helpful"),
                    "status": st, "note": d.get("note", ""), "created": _iso(d.get("created"))})
    out.sort(key=lambda x: x["created"] or "", reverse=True)
    return {"feedback": out[:max(1, min(limit, 500))]}


@router.post("/admin/feedback/{fid}")
def update_feedback(fid: str, body: FeedbackUpdate, claims=Depends(_admin)):
    if body.status not in ("open", "resolved"):
        raise HTTPException(status_code=400, detail="Status must be open or resolved.")
    ref = _db().collection("feedback").document(fid)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Not found.")
    ref.set({"status": body.status, "note": body.note[:500], "resolved_by": claims.get("email", "")}, merge=True)
    return {"ok": True}


def _cache_keys_for(question):
    """Every cached answer for this question: the keys logged when it was asked, plus the
    standard ones for a fresh question in either language."""
    keys = set()
    for snap in _col("questions").where("text", "==", question[:1000]).limit(50).stream():
        k = (snap.to_dict() or {}).get("cache_key")
        if k:
            keys.add(k)
    low = question.strip().lower()
    for lang in ("en", "hi"):
        for level in ("standard", "simple"):
            keys.add(f"ask|{low}|None|None|None|{level}||{lang}")
        keys.add(f"wa_ans|{lang}|" + " ".join(low.split())[:300])
    return keys


@router.post("/admin/feedback/{fid}/clear-cache")
def clear_feedback_cache(fid: str, claims=Depends(_admin)):
    """The fix for a wrong cached answer: forget it, so the next person gets a fresh one."""
    snap = _db().collection("feedback").document(fid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Not found.")
    question = (snap.to_dict() or {}).get("question", "")
    keys = _cache_keys_for(question)
    for k in keys:
        guard.cache_delete(k)
    snap.reference.set({"cache_cleared": _now()}, merge=True)
    log_event("admin_cache_cleared", keys=len(keys), by=claims.get("email", ""))
    return {"cleared": len(keys)}


class QuestionText(BaseModel):
    question: str


@router.post("/admin/cache/clear")
def clear_question_cache(body: QuestionText, claims=Depends(_admin)):
    keys = _cache_keys_for(body.question)
    for k in keys:
        guard.cache_delete(k)
    return {"cleared": len(keys)}


# ---------------- accounts ----------------

class BlockRequest(BaseModel):
    blocked: bool


@router.get("/admin/users")
def list_users(claims=Depends(_admin)):
    from firebase_admin import auth
    month = datetime.datetime.now(IST).strftime("%Y%m")
    costs = {}
    for snap in _col("user_costs").where("month", "==", month).stream():
        d = snap.to_dict() or {}
        costs[d.get("uid")] = {"usd": round(float(d.get("usd", 0)), 3), "calls": int(d.get("calls", 0))}
    pro = {}
    for snap in _db().collection("users").where("plan", "==", "pro").stream():
        until = (snap.to_dict() or {}).get("pro_until")
        pro[snap.id] = _iso(until) if until and until > _now() else None
    blocked = set(guard.get_settings().get("blocked_uids") or [])
    rows = []
    for u in auth.list_users().iterate_all():
        rows.append({
            "uid": u.uid, "email": u.email or "", "name": u.display_name or "",
            "created": u.user_metadata.creation_timestamp, "last_seen": u.user_metadata.last_sign_in_timestamp,
            "pro_until": pro.get(u.uid), "cost_month": costs.get(u.uid, {"usd": 0, "calls": 0}),
            "blocked": u.uid in blocked,
        })
    rows.sort(key=lambda r: -(r["created"] or 0))
    anon = costs.get("anon", {"usd": 0, "calls": 0})
    return {"users": rows, "anon_cost_month": anon}


@router.post("/admin/users/{uid}/block")
def block_user(uid: str, body: BlockRequest, claims=Depends(_admin)):
    if uid == claims.get("uid"):
        raise HTTPException(status_code=400, detail="You can't block yourself.")
    blocked = set(guard.get_settings().get("blocked_uids") or [])
    (blocked.add if body.blocked else blocked.discard)(uid)
    guard.save_settings({"blocked_uids": sorted(blocked)}, who=claims.get("email", ""))
    return {"blocked": body.blocked}


# ---------------- settings ----------------

class SettingsUpdate(BaseModel):
    daily_budget_usd: float | None = None
    whatsapp_per_day: int | None = None
    whatsapp_paused: bool | None = None
    whatsapp_pause_message: str | None = None
    daily_law_on: bool | None = None
    banner_on: bool | None = None
    banner_text: str | None = None
    banner_link: str | None = None


@router.get("/admin/settings")
def get_settings(claims=Depends(_admin)):
    s = guard.get_settings()
    return {"settings": {k: v for k, v in s.items() if k != "blocked_uids"},
            "defaults": {"daily_budget_usd": guard.DAILY_BUDGET_USD, "whatsapp_per_day": WA_PER_DAY}}


@router.post("/admin/settings")
def update_settings(body: SettingsUpdate, claims=Depends(_admin)):
    changes = body.model_dump(exclude_unset=True)
    if "daily_budget_usd" in changes and changes["daily_budget_usd"] is not None and not 0.5 <= changes["daily_budget_usd"] <= 200:
        raise HTTPException(status_code=400, detail="Daily budget must be between $0.50 and $200.")
    if "whatsapp_per_day" in changes and changes["whatsapp_per_day"] is not None and not 1 <= changes["whatsapp_per_day"] <= 100:
        raise HTTPException(status_code=400, detail="WhatsApp questions per person must be between 1 and 100.")
    for k, n in (("banner_text", 200), ("whatsapp_pause_message", 300), ("banner_link", 300)):
        if changes.get(k):
            changes[k] = changes[k].strip()[:n]
    if changes.get("banner_link") and not re.match(r"^(https://|/)", changes["banner_link"]):
        raise HTTPException(status_code=400, detail="The banner link must start with https:// or /.")
    s = guard.save_settings(changes, who=claims.get("email", ""))
    return {"settings": {k: v for k, v in s.items() if k != "blocked_uids"}}


# ---------------- WhatsApp ----------------

def _scheduler_job():
    r = _google().get(f"https://cloudscheduler.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/jobs/{DAILY_JOB}", timeout=10)
    r.raise_for_status()
    return r.json()


@router.get("/admin/whatsapp")
def whatsapp_status(claims=Depends(_admin)):
    out = {"on": WA_ON, "per_day": guard.get_settings().get("whatsapp_per_day") or WA_PER_DAY,
           "subscribers": _count(_db().collection("wa_daily"))}
    if not WA_ON:
        return out
    try:
        out["phone"] = _graph(WA_PHONE_ID, fields="display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,status")
    except Exception as e:
        out["phone_error"] = str(e)[:200]
    try:
        out["templates"] = _graph(f"{WABA_ID}/message_templates", fields="name,language,status,category,rejected_reason", limit=50).get("data", [])
    except Exception as e:
        out["templates_error"] = str(e)[:200]
    try:
        job = _scheduler_job()
        out["daily_job"] = {"state": job.get("state"), "schedule": job.get("schedule"), "time_zone": job.get("timeZone"),
                            "last_run": job.get("lastAttemptTime"), "next_run": job.get("scheduleTime"),
                            "last_status": (job.get("status") or {}).get("code", 0)}
    except Exception as e:
        out["daily_job_error"] = str(e)[:200]
    out["delivery_failures"] = _logs('jsonPayload.event="whatsapp_delivery_failed"', hours=72, limit=20)
    return out


@router.post("/admin/whatsapp/run-daily")
def run_daily_now(claims=Depends(_admin)):
    if not DAILY_INVOKER:
        raise HTTPException(status_code=400, detail="Law of the day isn't set up yet.")
    r = _google().post(f"https://cloudscheduler.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/jobs/{DAILY_JOB}:run", timeout=15)
    if r.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"Couldn't start it: {r.text[:200]}")
    log_event("admin_run_daily", by=claims.get("email", ""))
    return {"started": True}


# ---------------- logs ----------------

def _logs(extra_filter, hours=24, limit=50):
    """Recent backend log entries from Cloud Logging, newest first. [] if logs can't be read."""
    since = (_now() - datetime.timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    filt = (f'resource.type="cloud_run_revision" AND resource.labels.service_name="{SERVICE}" '
            f'AND timestamp>="{since}" AND ({extra_filter})')
    try:
        r = _google().post("https://logging.googleapis.com/v2/entries:list", timeout=15, json={
            "resourceNames": [f"projects/{PROJECT}"], "filter": filt, "orderBy": "timestamp desc", "pageSize": limit})
        r.raise_for_status()
    except Exception as e:
        return [{"error": f"Couldn't read logs: {str(e)[:150]}"}]
    rows = []
    for e in r.json().get("entries", []):
        p = e.get("jsonPayload") or {}
        text = p.get("error") or p.get("detail") or p.get("message") or e.get("textPayload") or ""
        tb = p.get("traceback") or ""
        if tb and not text:
            text = tb.strip().splitlines()[-1]
        rows.append({"time": e.get("timestamp"), "severity": e.get("severity"), "event": p.get("event") or "",
                     "route": p.get("route") or p.get("path") or p.get("kind") or "", "status": p.get("status"),
                     "text": str(text)[:300], "errors": p.get("errors"), "traceback": tb[-1500:] if tb else ""})
    return rows


@router.get("/admin/errors")
def recent_errors(hours: int = 24, claims=Depends(_admin)):
    hours = max(1, min(hours, 168))
    return {"errors": _logs('severity>=ERROR OR (httpRequest.status>=500)', hours=hours, limit=60),
            "warnings": _logs('severity=WARNING', hours=hours, limit=60)}


# ---------------- health and issues ----------------

PLAIN_SECRET_NAMES = ("ANTHROPIC_API_KEY", "QDRANT_API_KEY", "RESEND_API_KEY", "RAZORPAY_KEY_SECRET",
                      "RAZORPAY_WEBHOOK_SECRET", "CASHFREE_SECRET_KEY", "FIREBASE_SERVICE_ACCOUNT_B64")


def _check(name, fn):
    started = time.time()
    try:
        status, detail = fn()
    except Exception as e:
        status, detail = "fail", str(e)[:200]
    return {"name": name, "status": status, "detail": detail, "ms": int((time.time() - started) * 1000)}


def _check_firestore():
    _col("settings").document("app").get()
    return "ok", "Reading and writing"


def _check_search():
    import search
    info = search.client.get_collection(search.COLLECTION_NAME)
    return "ok", f"{info.points_count:,} passages indexed"


def _check_claude():
    features._client.models.list(limit=1)
    return "ok", "API key works"


def _check_whatsapp():
    if not WA_ON:
        return "warn", "Not configured"
    p = _graph(WA_PHONE_ID, fields="quality_rating,messaging_limit_tier,status")
    q = p.get("quality_rating", "UNKNOWN")
    status = "ok" if q in ("GREEN", "UNKNOWN") else "warn" if q == "YELLOW" else "fail"
    return status, f"Quality {q.lower()}, limit {p.get('messaging_limit_tier', '?')}, {str(p.get('status', '')).lower()}"


def _check_budget():
    cap, used = guard.budget_usd(), guard.spent_today()
    pct = used / cap if cap else 0
    status = "ok" if pct < 0.7 else "warn" if pct < 1 else "fail"
    return status, f"${used:.2f} of ${cap:.2f} used today ({pct:.0%})"


def _check_email():
    if not os.environ.get("RESEND_API_KEY"):
        return "warn", "RESEND_API_KEY not set: digest and lawyer emails won't send"
    return "ok", "Resend key set"


def _check_payments():
    if not plans.PRO_ENABLED:
        return "warn", "Nyaya Pro is paused (PRO_ENABLED is off)"
    which = plans.provider()
    if which == "cashfree":
        return ("ok" if plans.CF_ENV == "production" else "warn",
                "Cashfree keys set" + ("" if plans.CF_ENV == "production" else " (test mode: no real money)"))
    if which == "razorpay":
        return "ok", "Razorpay keys set"
    return "fail", "Pro is on but no payment keys are set"


def _check_daily():
    if not DAILY_INVOKER:
        return "warn", "Not set up"
    if not guard.get_settings().get("daily_law_on", True):
        return "warn", "Turned off in settings"
    job = _scheduler_job()
    code = (job.get("status") or {}).get("code", 0)
    last = job.get("lastAttemptTime", "never")
    return ("ok" if not code else "fail"), f"{job.get('state', '?').lower()}, last run {last[:16].replace('T', ' ')} UTC" + (f", failed (code {code})" if code else "")


@router.get("/admin/health")
def health(claims=Depends(_admin)):
    from concurrent.futures import ThreadPoolExecutor
    named = [("Database (Firestore)", _check_firestore), ("Search index (Qdrant)", _check_search),
             ("Claude API", _check_claude), ("Daily spend", _check_budget), ("WhatsApp number", _check_whatsapp),
             ("Law of the day", _check_daily), ("Email (Resend)", _check_email), ("Payments", _check_payments)]
    with ThreadPoolExecutor(max_workers=8) as pool:
        checks = list(pool.map(lambda nf: _check(*nf), named))
    issues = []

    def issue(severity, title, detail, action=None, tab=None):
        issues.append({"severity": severity, "title": title, "detail": detail, "action": action, "tab": tab})

    for c in checks:
        if c["status"] == "fail":
            issue("high", f"{c['name']} is failing", c["detail"],
                  action="raise_budget" if c["name"] == "Daily spend" else "run_daily" if c["name"] == "Law of the day" else None,
                  tab="settings" if c["name"] == "Daily spend" else None)
        elif c["status"] == "warn" and c["name"] == "Daily spend":
            issue("medium", "Daily budget is running low", c["detail"], action="raise_budget", tab="settings")
        elif c["status"] == "warn" and c["name"] == "WhatsApp number" and c["detail"].startswith("Quality"):
            issue("medium", "WhatsApp quality dropped", c["detail"] + ". Too many blocks or reports lower it; check recent answers.", tab="whatsapp")

    errors = [e for e in _logs('severity>=ERROR', hours=24, limit=50) if not e.get("error")]
    if errors:
        top = collections.Counter(e["text"] or e["event"] for e in errors).most_common(1)[0]
        issue("high" if len(errors) >= 10 else "medium", f"{len(errors)} errors in the last 24 hours",
              f"Most common: {top[0][:160]} ({top[1]}×)", tab="errors")
    fails = [e for e in _logs('jsonPayload.event="whatsapp_delivery_failed" OR jsonPayload.event="whatsapp_send_failed"', hours=24, limit=50) if not e.get("error")]
    if fails:
        issue("medium", f"{len(fails)} WhatsApp messages didn't go through (24 h)",
              "See the WhatsApp tab for Meta's reasons.", tab="whatsapp")

    open_bad = [f for f in list_feedback(helpful="no", status="open", limit=500, claims=claims)["feedback"]]
    if open_bad:
        issue("medium", f"{len(open_bad)} answers marked not helpful",
              "Read what went wrong; clear the cached answer if it was wrong, then mark it resolved.", tab="feedback")
    pending = _count(_db().collection("lawyers").where("status", "==", "pending"))
    if pending:
        issue("low", f"{pending} lawyer listing{'s' if pending != 1 else ''} waiting for review", "Approve or reject them.", tab="lawyers")
    if WA_ON:
        try:
            for t in _graph(f"{WABA_ID}/message_templates", fields="name,language,status,rejected_reason", limit=50).get("data", []):
                if t.get("status") == "REJECTED":
                    issue("high", f"Template {t['name']} ({t['language']}) was rejected",
                          f"Reason: {t.get('rejected_reason')}. Law of the day can't reach people who haven't written in 24 hours.", tab="whatsapp")
                elif t.get("status") in ("PENDING", "IN_APPEAL"):
                    issue("low", f"Template {t['name']} ({t['language']}) is waiting for Meta",
                          "Until it's approved, Law of the day only reaches people who wrote in the last 24 hours.", tab="whatsapp")
                elif t.get("status") in ("PAUSED", "DISABLED"):
                    issue("high", f"Template {t['name']} ({t['language']}) is {t['status'].lower()}",
                          "Meta paused it after negative feedback. Review the daily messages.", tab="whatsapp")
        except Exception:
            pass
    plain = [n for n in PLAIN_SECRET_NAMES if os.environ.get(n)]
    if plain:
        issue("low", f"{len(plain)} keys are stored as plain settings, not in Secret Manager",
              "Anyone with access to the Cloud Run settings can read them: " + ", ".join(plain)
              + ". Move them to Secret Manager when convenient (the WhatsApp ones already are).")
    order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda i: order[i["severity"]])
    return {"checks": checks, "issues": issues, "checked_at": _iso(_now())}
