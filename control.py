"""The owner's control room, on top of admin.py.

- Hidden access: /admin shows a plain "not found" page unless you're signed in as an admin,
  or you arrive with a fresh one-time key from WhatsApp.
- WhatsApp: link your number once from the dashboard ("admin CODE"), then text "admin" any
  time for today's numbers and a 10-minute sign-in link. Numbers are stored hashed.
- Live activity, feature switches and an ideas board.
"""

import datetime
import re
import secrets
import time
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import admin
import guard
from extras import _admin, _wa_send
from guard import IST, _hash, cache_delete, cache_get, cache_set, log_event, rate_limit

router = APIRouter()

SITE = "https://asknyaya.in"
LINK_SECONDS = 600
_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I/L
_LINK_RE = re.compile(r"^\s*admin\s+([A-Za-z0-9]{6})\s*$", re.I)
_CMD_RE = re.compile(r"^\s*(admin|control)\s*$", re.I)
_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{20,64}$")


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _fresh(rec):
    return isinstance(rec, dict) and time.time() - float(rec.get("at", 0)) < LINK_SECONDS


def _wa_doc():
    return guard._col("settings").document("admin_wa")


def _phones():
    try:
        snap = _wa_doc().get()
        return set((snap.to_dict() or {}).get("phones", [])) if snap.exists else set()
    except Exception as e:
        log_event("control_error", severity="WARNING", part="phones", error=str(e)[:200])
        return set()


def new_key():
    key = secrets.token_urlsafe(24)
    cache_set(f"adm_tok|{key}", {"at": time.time()}, days=1)
    return key


# ---------------- WhatsApp: the owner's commands ----------------

def _today_summary():
    today = datetime.datetime.now(IST).date()
    start = datetime.datetime.combine(today, datetime.time(), IST).astimezone(datetime.timezone.utc)
    questions = guard._col("questions").where("created", ">=", start)
    db = admin._db()
    with ThreadPoolExecutor(max_workers=6) as pool:
        f = {
            "q": pool.submit(admin._count, questions),
            "wa": pool.submit(admin._count, questions.where("route", "==", "whatsapp")),
            "down": pool.submit(admin._count, db.collection("feedback").where("created", ">=", start).where("helpful", "==", False)),
            "lp": pool.submit(admin._count, db.collection("lawyers").where("status", "==", "pending")),
            "spend": pool.submit(lambda: (guard._col("spend").document(today.isoformat()).get().to_dict() or {})),
        }
        r = {k: v.result() for k, v in f.items()}
    s = guard.get_settings()
    usd = float(r["spend"].get("usd", 0) or 0)
    lines = [
        f"*Nyaya today* ({today.strftime('%d %b')})",
        f"❓ Questions: {r['q']} ({r['wa']} on WhatsApp)",
        f"💸 AI spend: ${usd:.2f} of ${guard.budget_usd():.0f} budget",
        f"👎 Unhelpful answers: {r['down']}",
    ]
    if r["lp"]:
        lines.append(f"⚖️ Lawyers waiting for review: {r['lp']}")
    off = s.get("features_off") or []
    if off:
        lines.append("⏸️ Switched off: " + ", ".join(off))
    if s.get("whatsapp_paused"):
        lines.append("⏸️ WhatsApp answers are paused")
    return "\n".join(lines)


def wa_admin(sender, text):
    """Handles the owner's WhatsApp commands. Returns True if the message was one."""
    m = _LINK_RE.match(text or "")
    if m:
        key = f"adm_code|{m.group(1).upper()}"
        rec = cache_get(key)
        if not _fresh(rec):
            return False
        cache_delete(key)
        phones = _phones() | {_hash(sender)}
        _wa_doc().set({"phones": sorted(phones), "updated": _now(), "by": rec.get("email", "")}, merge=True)
        log_event("control_wa_linked", by=rec.get("email", ""))
        _wa_send(sender, "✅ This number is now linked to the Nyaya control room.\n\n"
                         "Text *admin* any time for today's numbers and a sign-in link.")
        return True
    if _CMD_RE.match(text or "") and _hash(sender) in _phones():
        try:
            summary = _today_summary()
        except Exception as e:
            log_event("control_error", severity="WARNING", part="summary", error=str(e)[:200])
            summary = "*Nyaya today*\n(couldn't load the numbers just now)"
        _wa_send(sender, f"{summary}\n\n🔐 Control room (link works for 10 minutes, then sign in with Google):\n"
                         f"{SITE}/admin?k={new_key()}")
        log_event("control_wa_link_sent")
        return True
    return False


# ---------------- access ----------------

class Key(BaseModel):
    k: str


@router.post("/control/key")
def check_key(body: Key, req: Request):
    """Public: is this one-time key from WhatsApp still fresh? It only unlocks the sign-in
    screen; the dashboard itself still needs a Google sign-in on an admin account."""
    rate_limit(req, "share")
    ok = bool(_KEY_RE.match(body.k or "")) and _fresh(cache_get(f"adm_tok|{body.k}"))
    return {"ok": ok}


@router.get("/admin/me")
def me(claims=Depends(_admin)):
    return {"email": claims.get("email", "")}


@router.get("/admin/wa")
def wa_link_status(claims=Depends(_admin)):
    return {"linked": len(_phones())}


@router.post("/admin/wa/code")
def wa_link_code(claims=Depends(_admin)):
    code = "".join(secrets.choice(_CODE_CHARS) for _ in range(6))
    cache_set(f"adm_code|{code}", {"at": time.time(), "email": claims.get("email", "")}, days=1)
    return {"code": code, "expires_in": LINK_SECONDS}


@router.post("/admin/wa/unlink")
def wa_unlink(claims=Depends(_admin)):
    _wa_doc().set({"phones": [], "updated": _now(), "by": claims.get("email", "")}, merge=True)
    log_event("control_wa_unlinked", by=claims.get("email", ""))
    return {"linked": 0}


# ---------------- live activity ----------------

def _iso(v):
    return v.isoformat() if hasattr(v, "isoformat") else v


def _latest(query, n):
    try:
        return [(s.id, s.to_dict() or {}) for s in query.order_by("created", direction="DESCENDING").limit(n).stream()]
    except Exception as e:
        log_event("control_error", severity="WARNING", part="activity", error=str(e)[:200])
        return []


@router.get("/admin/activity")
def activity(claims=Depends(_admin)):
    db = admin._db()
    with ThreadPoolExecutor(max_workers=4) as pool:
        q = pool.submit(_latest, guard._col("questions"), 40)
        fb = pool.submit(_latest, db.collection("feedback"), 12)
        pay = pool.submit(_latest, db.collection("payments"), 5)
        q, fb, pay = q.result(), fb.result(), pay.result()
    items = [{"kind": "question", "at": _iso(d.get("created")), "route": d.get("route"), "text": (d.get("text") or "")[:240],
              "lang": d.get("lang"), "cached": bool(d.get("cached"))} for _, d in q]
    items += [{"kind": "feedback", "at": _iso(d.get("created")), "route": d.get("route"), "helpful": bool(d.get("helpful")),
               "text": (d.get("question") or "")[:240], "reason": (d.get("reason") or "")[:240]} for _, d in fb]
    items += [{"kind": "payment", "at": _iso(d.get("created")), "amount_inr": int(d.get("amount") or 0) / 100} for _, d in pay]
    items.sort(key=lambda x: x["at"] or "", reverse=True)
    return {"items": items[:50], "now": _now().isoformat()}


# ---------------- feature switches ----------------

class FeatureSwitch(BaseModel):
    name: str
    on: bool


def _routes_for(name):
    return {"assist": ("assist_rti", "assist_consumer")}.get(name, (name,))


@router.get("/admin/features")
def list_features(claims=Depends(_admin)):
    today = datetime.datetime.now(IST).date()
    dates = [(today - datetime.timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
    _, by_route = admin._spend(dates)
    off = set(guard.get_settings().get("features_off") or [])
    out = []
    for name, label in guard.FEATURES.items():
        routes = _routes_for(name)
        out.append({"name": name, "label": label, "on": name not in off,
                    "calls_30d": sum(by_route[r]["calls"] for r in routes if r in by_route),
                    "usd_30d": round(sum(by_route[r]["usd"] for r in routes if r in by_route), 3)})
    return {"features": out}


@router.post("/admin/features")
def switch_feature(body: FeatureSwitch, claims=Depends(_admin)):
    if body.name not in guard.FEATURES:
        raise HTTPException(status_code=400, detail="Unknown tool.")
    off = set(guard.get_settings().get("features_off") or [])
    off.discard(body.name) if body.on else off.add(body.name)
    guard.save_settings({"features_off": sorted(off)}, who=claims.get("email", ""))
    return list_features(claims)


# ---------------- ideas board ----------------

STATUSES = ("idea", "next", "building", "live", "parked")
SEED = [
    ("Answer cards to share", "A clean image of any answer, sized for WhatsApp and Instagram, with the Nyaya mark.", "Growth", "next"),
    ("Ask a friend", "Send a question to a friend with one tap; they open it already answered.", "Growth", "next"),
    ("Trending questions page", "What people asked most this week (no names), each opening its answer.", "Growth", "next"),
    ("Flashcards and mock tests", "For law students: spaced repetition on the new codes and landmark cases.", "Students", "idea"),
    ("Judgment simplifier", "Paste or pick a judgment; get it in plain words with the holding first.", "Students", "idea"),
    ("Citation checker", "Paste a draft; every citation is checked against the index and flagged if wrong.", "Lawyers", "idea"),
    ("Precedent finder", "Describe your facts; get the closest judgments, ranked, with why they match.", "Lawyers", "idea"),
    ("Hindi SEO pages", "Every rights guide and section page in Hindi at its own address, with FAQ markup.", "SEO", "idea"),
    ("More languages", "Marathi, Bengali, Tamil and Telugu answers and pages.", "Languages", "idea"),
    ("Court-fee and stamp-duty calculator", "Needs official state tables before it's safe to build.", "Tools", "parked"),
    ("Lawyer-verified badge", "Needs a lawyer to review answers on a schedule.", "Trust", "parked"),
    ("Own Razorpay account", "Apply with Udyam, then switch Pro back on.", "Business", "parked"),
]


class Idea(BaseModel):
    title: str
    detail: str = ""
    area: str = ""
    status: str = "idea"


class IdeaUpdate(BaseModel):
    title: str | None = None
    detail: str | None = None
    area: str | None = None
    status: str | None = None
    delete: bool = False


def _idea_out(snap):
    d = snap.to_dict() or {}
    return {"id": snap.id, "title": d.get("title", ""), "detail": d.get("detail", ""), "area": d.get("area", ""),
            "status": d.get("status", "idea"), "created": _iso(d.get("created")), "updated": _iso(d.get("updated"))}


@router.get("/admin/ideas")
def list_ideas(claims=Depends(_admin)):
    col = guard._col("ideas")
    snaps = list(col.limit(300).stream())
    if not snaps:
        for n, (title, detail, area, status) in enumerate(SEED):
            col.add({"title": title, "detail": detail, "area": area, "status": status,
                     "created": _now() + datetime.timedelta(microseconds=n), "updated": _now(), "by": "seed"})
        snaps = list(col.limit(300).stream())
    ideas = sorted((_idea_out(s) for s in snaps), key=lambda i: (STATUSES.index(i["status"]) if i["status"] in STATUSES else 9, i["created"] or ""))
    return {"ideas": ideas, "statuses": STATUSES}


@router.post("/admin/ideas")
def add_idea(body: Idea, claims=Depends(_admin)):
    title = body.title.strip()
    if not 3 <= len(title) <= 140:
        raise HTTPException(status_code=400, detail="Give the idea a title of 3 to 140 characters.")
    if body.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Unknown status.")
    guard._col("ideas").add({"title": title, "detail": body.detail.strip()[:2000], "area": body.area.strip()[:40],
                             "status": body.status, "created": _now(), "updated": _now(), "by": claims.get("email", "")})
    return list_ideas(claims)


@router.post("/admin/ideas/{idea_id}")
def update_idea(idea_id: str, body: IdeaUpdate, claims=Depends(_admin)):
    ref = guard._col("ideas").document(idea_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="No such idea.")
    if body.delete:
        ref.delete()
        return list_ideas(claims)
    changes = {k: v.strip() if isinstance(v, str) else v for k, v in body.model_dump(exclude={"delete"}).items() if v is not None}
    if "status" in changes and changes["status"] not in STATUSES:
        raise HTTPException(status_code=400, detail="Unknown status.")
    if "title" in changes and not 3 <= len(changes["title"]) <= 140:
        raise HTTPException(status_code=400, detail="Give the idea a title of 3 to 140 characters.")
    ref.set({**changes, "updated": _now()}, merge=True)
    return list_ideas(claims)
