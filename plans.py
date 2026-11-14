"""
plans.py

Free and Pro plans, daily quotas, and Razorpay payments.

  Free (signed in or not): 10 questions, 5 comparisons, 5 argument briefs a day.
  Pro, Rs 199 for 30 days: 200 questions, 50 comparisons, 50 briefs a day,
    plus document upload, drafts and case alerts.

Pro is sold as a 30-day pass paid once through Razorpay Checkout (an Order,
not an auto-renewing subscription), so nobody is charged again without
coming back to pay. Buying again while Pro extends it by 30 days.

Payments go through Cashfree when its keys are set, otherwise Razorpay.
Until one of them is set the payment endpoints answer 503 and everything else
keeps working:
  CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV (sandbox | production)
  RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
"""

import base64
import datetime
import hashlib
import hmac
import json
import os
import time

import requests
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

import guard
from guard import log_event

PLANS = {
    "free": {"ask": 10, "compare": 5, "argument": 5, "document": 0, "draft": 0, "alerts": 0, "notice": 3},
    "pro": {"ask": 200, "compare": 50, "argument": 50, "document": 20, "draft": 20, "alerts": 5, "notice": 30},
}
FEATURE_NAMES = {
    "ask": "questions", "compare": "comparisons", "argument": "argument briefs",
    "document": "document reviews", "draft": "drafts", "alerts": "case alerts", "notice": "notice checks",
}
PRO_PRICE_PAISE = int(os.environ.get("PRO_PRICE_PAISE", "19900"))
PRO_DAYS = 30
# Pro is paused until Razorpay is live: set PRO_ENABLED=1 (and PRO_ON in frontend/src/config.js) to bring it back.
PRO_ENABLED = os.environ.get("PRO_ENABLED", "0") == "1"

RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RZP_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

CF_APP_ID = os.environ.get("CASHFREE_APP_ID", "").strip()
CF_SECRET = os.environ.get("CASHFREE_SECRET_KEY", "").strip()
CF_ENV = "production" if os.environ.get("CASHFREE_ENV", "sandbox").strip() == "production" else "sandbox"
CF_BASE = "https://api.cashfree.com/pg" if CF_ENV == "production" else "https://sandbox.cashfree.com/pg"
CF_API_VERSION = "2026-01-01"
SITE_URL = os.environ.get("SITE_URL", "https://asknyaya.in")
API_PUBLIC_URL = os.environ.get("API_PUBLIC_URL", "https://api.asknyaya.in")
# Cashfree insists on a 10-digit phone; we don't ask for one, and its checkout
# asks the payer directly where a method (UPI, wallets) needs it.
CF_PLACEHOLDER_PHONE = "9999999999"


def provider():
    if CF_APP_ID and CF_SECRET:
        return "cashfree"
    if RZP_KEY_ID and RZP_KEY_SECRET:
        return "razorpay"
    return None

router = APIRouter()
_db = None
_auth = None
_plan_cache = {}


def init(db, firebase_auth):
    global _db, _auth
    _db, _auth = db, firebase_auth


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


# ---------------- who is asking ----------------

def optional_user(authorization: str = Header(None)):
    """The signed-in user's token claims, or None for a visitor. A bad or
    expired token is treated as signed out rather than an error, so an
    expired session never blocks asking a question."""
    if not authorization or not authorization.startswith("Bearer ") or _auth is None:
        return None
    try:
        return _auth.verify_id_token(authorization.split(" ", 1)[1])
    except Exception:
        return None


def required_user(claims=Depends(optional_user)):
    if not claims:
        raise HTTPException(status_code=401, detail="Sign in to use this.")
    return claims


# ---------------- plans ----------------

def get_plan(uid):
    """('pro' or 'free', pro_until or None), cached for a minute."""
    if not uid or _db is None:
        return "free", None
    hit = _plan_cache.get(uid)
    if hit and time.time() - hit[2] < 60:
        return hit[0], hit[1]
    until = None
    try:
        snap = _db.collection("users").document(uid).get()
        until = (snap.to_dict() or {}).get("pro_until") if snap.exists else None
    except Exception as e:
        log_event("plan_lookup_error", severity="WARNING", error=str(e)[:200])
    plan = "pro" if until and until > _now() else "free"
    _plan_cache[uid] = (plan, until, time.time())
    return plan, until


def _usage_key(req, uid):
    return f"u_{uid}" if uid else f"ip_{guard._hash(guard.client_ip(req))}"


def use_quota(req: Request, feature: str, claims=None):
    """Counts one use of a feature against today's plan limit (IST days).
    402 when the feature needs Pro, 429 when today's allowance is used up."""
    uid = claims.get("uid") if claims else None
    if uid and uid in (guard.get_settings().get("blocked_uids") or []):
        raise HTTPException(status_code=403, detail="This account can't use Nyaya. Write to kanavkedia060@gmail.com if you think this is a mistake.")
    plan, _ = get_plan(uid)
    limit = PLANS[plan][feature]
    name = FEATURE_NAMES[feature]
    if limit == 0:
        raise HTTPException(status_code=402, detail=(
            f"{name.capitalize()} are part of Nyaya Pro (Rs 199 for 30 days)." if PRO_ENABLED
            else f"{name.capitalize()} are coming back in a few days."))
    if _db is None:
        return plan
    day = datetime.datetime.now(guard.IST).strftime("%Y%m%d")
    ref = _db.collection(guard.PREFIX + "usage").document(f"{_usage_key(req, uid)}_{day}")

    try:
        from google.cloud.firestore_v1 import transactional

        @transactional
        def bump(tx):
            snap = ref.get(transaction=tx)
            used = (snap.to_dict() or {}).get(feature, 0) if snap.exists else 0
            if used >= limit:
                return False
            tx.set(ref, {feature: used + 1, "expires": _now() + datetime.timedelta(days=3)}, merge=True)
            return True

        ok = bump(_db.transaction())
    except Exception as e:
        log_event("quota_store_error", severity="WARNING", error=str(e)[:200])
        return plan  # fail open: the per-minute limits and spend cap still apply

    if not ok:
        log_event("quota_reached", feature=feature, plan=plan, signed_in=bool(uid))
        if plan == "free" and PRO_ENABLED:
            more = PLANS["pro"][feature]
            raise HTTPException(status_code=429, detail=(
                f"You've used today's {limit} free {name}. They reset at midnight IST, "
                f"or Nyaya Pro gives you {more} a day."))
        raise HTTPException(status_code=429, detail=f"You've used today's {limit} {name}. They reset at midnight IST.")
    return plan


def usage_today(req, uid):
    if _db is None:
        return {}
    day = datetime.datetime.now(guard.IST).strftime("%Y%m%d")
    try:
        snap = _db.collection(guard.PREFIX + "usage").document(f"{_usage_key(req, uid)}_{day}").get()
        data = snap.to_dict() or {} if snap.exists else {}
    except Exception:
        data = {}
    return {k: data.get(k, 0) for k in PLANS["free"]}


@router.get("/me")
def me(req: Request, claims=Depends(required_user)):
    uid = claims["uid"]
    plan, until = get_plan(uid)
    return {
        "plan": plan,
        "pro_until": until.isoformat() if until else None,
        "limits": PLANS[plan],
        "used_today": usage_today(req, uid),
        "price_inr": PRO_PRICE_PAISE // 100,
        "payments_enabled": PRO_ENABLED and provider() is not None,
        "pro_enabled": PRO_ENABLED,
    }


# ---------------- Razorpay ----------------

def _require_payments():
    if not PRO_ENABLED:
        raise HTTPException(status_code=503, detail="Nyaya Pro is paused for a few days. Everything else is free to use.")
    if not provider():
        raise HTTPException(status_code=503, detail="Payments aren't switched on yet. Please check back soon.")


def grant_pro(uid, payment_id, order_id, amount, source):
    """Extends Pro by 30 days for one captured payment. Safe to call twice for
    the same payment (from the checkout callback and the webhook)."""
    from google.cloud.firestore_v1 import transactional
    pay_ref = _db.collection("payments").document(payment_id)
    user_ref = _db.collection("users").document(uid)

    @transactional
    def apply(tx):
        if pay_ref.get(transaction=tx).exists:
            return None
        snap = user_ref.get(transaction=tx)
        current = (snap.to_dict() or {}).get("pro_until") if snap.exists else None
        start = current if current and current > _now() else _now()
        until = start + datetime.timedelta(days=PRO_DAYS)
        tx.set(user_ref, {"pro_until": until, "plan": "pro"}, merge=True)
        tx.set(pay_ref, {"uid": uid, "order_id": order_id, "amount": amount, "source": source,
                         "created": _now(), "pro_until": until})
        return until

    until = apply(_db.transaction())
    _plan_cache.pop(uid, None)
    if until:
        log_event("pro_granted", uid=uid, payment_id=payment_id, source=source, until=until.isoformat())
    return until


@router.post("/billing/order")
def create_order(req: Request, claims=Depends(required_user)):
    _require_payments()
    guard.rate_limit(req, "compare")  # a few a minute is plenty
    uid = claims["uid"]
    if provider() == "cashfree":
        return _cf_create_order(claims)
    try:
        resp = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(RZP_KEY_ID, RZP_KEY_SECRET),
            json={"amount": PRO_PRICE_PAISE, "currency": "INR",
                  "receipt": f"pro_{uid[:20]}_{int(time.time())}",
                  "notes": {"uid": uid, "product": "nyaya_pro_30d"}},
            timeout=20,
        )
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Couldn't reach the payment service. Try again shortly.")
    if resp.status_code not in (200, 201):
        log_event("razorpay_order_error", severity="ERROR", status=resp.status_code, body=resp.text[:300])
        raise HTTPException(status_code=502, detail="Couldn't start the payment. Try again shortly.")
    order = resp.json()
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"],
            "key_id": RZP_KEY_ID, "email": claims.get("email", ""), "name": claims.get("name", "")}


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/billing/verify")
def verify_payment(body: VerifyRequest, claims=Depends(required_user)):
    _require_payments()
    if provider() != "razorpay":
        raise HTTPException(status_code=400, detail="That payment couldn't be verified.")
    expected = hmac.new(RZP_KEY_SECRET.encode(), f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
                        hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        log_event("razorpay_bad_signature", severity="WARNING", uid=claims["uid"])
        raise HTTPException(status_code=400, detail="That payment couldn't be verified.")
    # Confirm the order really is this user's Pro order for the right amount
    try:
        order = requests.get(f"https://api.razorpay.com/v1/orders/{body.razorpay_order_id}",
                             auth=(RZP_KEY_ID, RZP_KEY_SECRET), timeout=20).json()
    except Exception:
        raise HTTPException(status_code=502, detail="Couldn't confirm the payment. If you were charged, Pro will switch on within a few minutes.")
    if order.get("notes", {}).get("uid") != claims["uid"] or order.get("amount") != PRO_PRICE_PAISE:
        raise HTTPException(status_code=400, detail="That payment doesn't match this account.")
    until = grant_pro(claims["uid"], body.razorpay_payment_id, body.razorpay_order_id, order.get("amount"), "checkout")
    plan, until_now = get_plan(claims["uid"])
    return {"plan": plan, "pro_until": (until or until_now).isoformat() if (until or until_now) else None}


@router.post("/billing/webhook")
async def razorpay_webhook(request: Request):
    """Backup path: Razorpay calls this when a payment is captured, so Pro
    still switches on if the browser closed before /billing/verify ran."""
    if not RZP_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured.")
    raw = await request.body()
    expected = hmac.new(RZP_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("x-razorpay-signature", "")):
        raise HTTPException(status_code=400, detail="Bad signature.")
    event = json.loads(raw)
    if event.get("event") not in ("payment.captured", "order.paid"):
        return {"status": "ignored"}
    payment = event.get("payload", {}).get("payment", {}).get("entity", {})
    uid = (payment.get("notes") or {}).get("uid")
    if uid and payment.get("amount") == PRO_PRICE_PAISE and payment.get("currency") == "INR":
        grant_pro(uid, payment["id"], payment.get("order_id", ""), payment["amount"], "webhook")
    return {"status": "ok"}


# ---- Cashfree ----------------------------------------------------------------
# Flow: /billing/order creates a Cashfree order tagged with the user's uid and
# returns its payment_session_id; the page opens Cashfree's popup; then
# /billing/cashfree/verify asks Cashfree for the order and switches Pro on only
# if Cashfree itself says PAID for this user and the right amount. The webhook
# is the backup for a closed browser and runs the same check.

def _cf_headers():
    return {"x-client-id": CF_APP_ID, "x-client-secret": CF_SECRET,
            "x-api-version": CF_API_VERSION, "Content-Type": "application/json"}


def _cf_create_order(claims):
    uid = claims["uid"]
    order_id = f"pro_{''.join(c for c in uid if c.isalnum())[:20]}_{int(time.time())}"
    customer_id = "".join(c for c in uid if c.isalnum())[:50] or "nyaya_user"
    body = {
        "order_id": order_id,
        "order_amount": round(PRO_PRICE_PAISE / 100, 2),
        "order_currency": "INR",
        "customer_details": {"customer_id": customer_id, "customer_phone": CF_PLACEHOLDER_PHONE,
                             "customer_email": claims.get("email") or None,
                             "customer_name": (claims.get("name") or "")[:100] or None},
        "order_meta": {"return_url": f"{SITE_URL}/pricing?cf_order={order_id}",
                       "notify_url": f"{API_PUBLIC_URL}/billing/cashfree/webhook"},
        "order_tags": {"uid": uid, "product": "nyaya_pro_30d"},
        "order_note": "30 days of Nyaya Pro",
    }
    body["customer_details"] = {k: v for k, v in body["customer_details"].items() if v}
    try:
        resp = requests.post(f"{CF_BASE}/orders", headers=_cf_headers(), json=body, timeout=20)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Couldn't reach the payment service. Try again shortly.")
    if resp.status_code not in (200, 201):
        log_event("cashfree_order_error", severity="ERROR", status=resp.status_code, body=resp.text[:300])
        raise HTTPException(status_code=502, detail="Couldn't start the payment. Try again shortly.")
    order = resp.json()
    return {"provider": "cashfree", "mode": CF_ENV, "order_id": order["order_id"],
            "payment_session_id": order["payment_session_id"],
            "amount": PRO_PRICE_PAISE, "currency": "INR"}


def _cf_fetch_order(order_id):
    if not order_id or len(order_id) > 45 or not all(c.isalnum() or c in "_-" for c in order_id):
        return None
    resp = requests.get(f"{CF_BASE}/orders/{order_id}", headers=_cf_headers(), timeout=20)
    if resp.status_code != 200:
        return None
    return resp.json()


def _cf_settle(order_id, source, expect_uid=None):
    """Asks Cashfree for the order and grants Pro if it is PAID, in INR, for the
    Pro price, and tagged with a user. Returns (uid, until) or raises."""
    try:
        order = _cf_fetch_order(order_id)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Couldn't confirm the payment. If you were charged, Pro will switch on within a few minutes.")
    if not order:
        raise HTTPException(status_code=404, detail="We couldn't find that payment.")
    uid = (order.get("order_tags") or {}).get("uid")
    if expect_uid is not None and uid != expect_uid:
        raise HTTPException(status_code=400, detail="That payment doesn't match this account.")
    try:
        amount_paise = round(float(order.get("order_amount")) * 100)
    except (TypeError, ValueError):
        amount_paise = None
    if not uid or amount_paise != PRO_PRICE_PAISE or order.get("order_currency") != "INR":
        log_event("cashfree_order_mismatch", severity="WARNING", order_id=order_id)
        raise HTTPException(status_code=400, detail="That payment doesn't match this account.")
    if order.get("order_status") != "PAID":
        return uid, None, order.get("order_status")
    until = grant_pro(uid, f"cf_{order.get('cf_order_id') or order_id}", order_id, amount_paise, source)
    return uid, until, "PAID"


class CashfreeVerify(BaseModel):
    order_id: str


@router.post("/billing/cashfree/verify")
def cashfree_verify(body: CashfreeVerify, claims=Depends(required_user)):
    _require_payments()
    if provider() != "cashfree":
        raise HTTPException(status_code=400, detail="That payment couldn't be verified.")
    _, until, status = _cf_settle(body.order_id, "checkout", expect_uid=claims["uid"])
    if status != "PAID":
        return {"plan": get_plan(claims["uid"])[0], "status": status, "pro_until": None}
    plan, until_now = get_plan(claims["uid"])
    when = until or until_now
    return {"plan": plan, "status": "PAID", "pro_until": when.isoformat() if when else None}


def cf_signature_ok(raw: bytes, timestamp: str, signature: str) -> bool:
    if not (CF_SECRET and timestamp and signature):
        return False
    expected = base64.b64encode(hmac.new(CF_SECRET.encode(), timestamp.encode() + raw, hashlib.sha256).digest()).decode()
    return hmac.compare_digest(expected, signature)


@router.post("/billing/cashfree/webhook")
async def cashfree_webhook(request: Request):
    """Backup path: Cashfree calls this when a payment succeeds, so Pro still
    switches on if the browser closed before /billing/cashfree/verify ran.
    The payload is only a hint: we re-read the order from Cashfree."""
    if provider() != "cashfree":
        raise HTTPException(status_code=503, detail="Webhook not configured.")
    raw = await request.body()
    if not cf_signature_ok(raw, request.headers.get("x-webhook-timestamp", ""),
                           request.headers.get("x-webhook-signature", "")):
        log_event("cashfree_bad_signature", severity="WARNING")
        raise HTTPException(status_code=400, detail="Bad signature.")
    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Bad body.")
    if event.get("type") != "PAYMENT_SUCCESS_WEBHOOK":
        return {"status": "ignored"}
    order_id = ((event.get("data") or {}).get("order") or {}).get("order_id", "")
    try:
        _cf_settle(order_id, "webhook")
    except HTTPException as e:
        if e.status_code == 502:
            raise  # let Cashfree retry later
        return {"status": "ignored"}
    return {"status": "ok"}
