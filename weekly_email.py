"""The Sunday email: "Your rights this week".

  POST /newsletter/weekly          Cloud Scheduler, Sunday morning; sends to the digest Audience
  GET  /admin/newsletter/preview   admin; the email this week's run would send, as HTML

Goes to the same Resend Audience as the Monday Supreme Court digest (people join from the
footer or /digest). Unlike the digest, it never depends on new judgments, so subscribers
hear from Nyaya every week. Each issue is built from what's already on the site, no AI:
  - one right most people don't know, rotating through /rights by week number
  - the answers people read most, from the answer library
  - any explainer published in the last 7 days
  - one free template, rotating through /templates
Resend fills in the unsubscribe link ({{{RESEND_UNSUBSCRIBE_URL}}}).
"""

import datetime
import html
import json
import os
import pathlib

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse

import library
from extras import _admin
from features import _need_db
from guard import log_event, rate_limit

router = APIRouter()

SITE = "https://asknyaya.in"
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
INVOKER = os.environ.get("NEWSLETTER_INVOKER", os.environ.get("WHATSAPP_DAILY_INVOKER", ""))
AUDIENCE = os.environ.get("NEWSLETTER_AUDIENCE", "https://api.asknyaya.in/newsletter/weekly")
PICKS = json.loads((pathlib.Path(__file__).parent / "weekly_picks.json").read_text())

e = html.escape


def _utm(path, part):
    return f"{SITE}{path}{'&' if '?' in path else '?'}utm_source=email&utm_medium=weekly&utm_campaign={part}"


def _recent_explainers(days=7):
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    out = []
    for snap in _need_db().collection("explainers").where("published", "==", True).limit(200).stream():
        x = snap.to_dict() or {}
        when = x.get("published_at") or x.get("created")
        if when and when >= since:
            out.append((when, x))
    return [x for _, x in sorted(out, key=lambda p: p[0], reverse=True)[:2]]


def build(today=None):
    """Returns (subject, html) for the week containing `today` (IST)."""
    today = today or datetime.datetime.now(IST).date()
    week = today.isocalendar()[1]
    right = PICKS["rights"][week % len(PICKS["rights"])]
    template = PICKS["templates"][week % len(PICKS["templates"])]
    guide = PICKS["guides"][(week // 2) % len(PICKS["guides"])]
    rows = library._get("answers")
    if rows is None:  # warm the cache the same way /answers does
        rows = _answers_rows()
    top = sorted(rows, key=lambda r: -r.get("views", 0))[:3]
    explainers = _recent_explainers()

    h2 = 'style="font:600 18px/1.3 Georgia,serif;margin:28px 0 8px"'
    p = 'style="font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;margin:0 0 12px;color:#222"'
    a = 'style="color:#3a5a00;font-weight:600"'
    parts = [
        f'<p {p}>One right most people don\'t know, the questions India read most this week, and a free document you can use. Two minutes.</p>',
        f'<h2 {h2}>Your right this week: {e(right["title"])}</h2>',
        f'<p {p}>{e(right["lede"])}</p>',
        f'<p {p}><strong>The short version:</strong> {e(right["point"])}</p>' if right.get("point") else "",
        f'<p {p}><a {a} href="{_utm(right["path"], "right")}">Read all your rights on this →</a></p>',
    ]
    if explainers:
        parts.append(f'<h2 {h2}>In the news, explained</h2>')
        for x in explainers:
            parts.append(f'<p {p}><a {a} href="{_utm("/explained/" + x["slug"], "explainer")}">{e(x["title"])}</a><br>{e(x.get("dek", ""))}</p>')
    if top:
        parts.append(f'<h2 {h2}>What people read most</h2>')
        for r in top:
            parts.append(f'<p {p}><a {a} href="{_utm("/a/" + r["id"], "answer")}">{e(r["question"])}</a><br>'
                         f'<span style="color:#555">{e(r.get("snippet", ""))}</span></p>')
    parts += [
        f'<h2 {h2}>Free template: {e(template["title"])}</h2>',
        f'<p {p}>{e(template["blurb"])} Fill it in online and print it. No sign-in.</p>',
        f'<p {p}><a {a} href="{_utm(template["path"], "template")}">Open the template →</a></p>',
        f'<h2 {h2}>If something just happened</h2>',
        f'<p {p}><a {a} href="{_utm(guide["path"], "guide")}">{e(guide["title"])}</a>: {e(guide["lede"])}</p>',
        f'<p {p}>Have a question of your own? <a {a} href="{_utm("/", "ask")}">Ask Nyaya, free</a>. '
        f'Can\'t afford a lawyer? You may qualify for a free one: <a {a} href="{_utm("/legal-aid", "legalaid")}">check in a minute</a>.</p>',
        '<hr style="border:0;border-top:1px solid #ddd;margin:28px 0 12px">',
        '<p style="font:12px/1.5 Arial,sans-serif;color:#777">You get this because you joined Nyaya\'s weekly email. '
        'Nyaya is research help, not legal advice. <a style="color:#777" href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>.</p>',
    ]
    body = ('<div style="max-width:600px;margin:0 auto;padding:24px 18px;background:#fff">'
            '<p style="font:600 13px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#3a5a00;margin:0 0 6px">Nyaya · Your rights this week</p>'
            + "".join(parts) + "</div>")
    subject = f"Your rights this week: {right['title']}"
    return subject, body


def _answers_rows():
    rows = []
    for snap in _need_db().collection("shares").where("public", "==", True).limit(3000).stream():
        d = snap.to_dict() or {}
        rows.append({"id": snap.id, "question": (d.get("question") or "")[:200],
                     "snippet": library._snippet(d.get("answer")), "views": d.get("views", 0)})
    return rows


def _broadcast(subject, body):
    key, audience = os.environ.get("RESEND_API_KEY", ""), os.environ.get("RESEND_AUDIENCE_ID", "")
    if not key or not audience:
        raise HTTPException(status_code=500, detail="Server is missing Resend configuration.")
    sender = os.environ.get("DIGEST_FROM_ADDRESS", "Nyaya <digest@asknyaya.in>")
    hdr = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    r = requests.post("https://api.resend.com/broadcasts", headers=hdr, timeout=30,
                      json={"audience_id": audience, "from": sender, "subject": subject, "html": body,
                            "name": f"Weekly rights {datetime.date.today().isoformat()}"})
    if r.status_code not in (200, 201):
        log_event("newsletter_create_failed", severity="ERROR", status=r.status_code, body=r.text[:300])
        raise HTTPException(status_code=502, detail="Couldn't create the broadcast.")
    bid = r.json().get("id")
    s = requests.post(f"https://api.resend.com/broadcasts/{bid}/send", headers=hdr, timeout=30)
    if s.status_code not in (200, 201):
        log_event("newsletter_send_failed", severity="ERROR", status=s.status_code, body=s.text[:300])
        raise HTTPException(status_code=502, detail="Created the broadcast but couldn't send it.")
    return bid


@router.post("/newsletter/weekly")
def weekly(req: Request):
    """Called on Sunday mornings by Cloud Scheduler with a Google-signed token."""
    if not INVOKER:
        raise HTTPException(status_code=404)
    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token
    token = req.headers.get("authorization", "").removeprefix("Bearer ").strip()
    try:
        claims = id_token.verify_oauth2_token(token, g_requests.Request(), audience=AUDIENCE)
    except Exception:
        raise HTTPException(status_code=403)
    if claims.get("email") != INVOKER or not claims.get("email_verified"):
        raise HTTPException(status_code=403)
    # One issue a week, even if the scheduler retries
    week = datetime.datetime.now(IST).date().isocalendar()
    ref = _need_db().collection("newsletters").document(f"{week[0]}-W{week[1]:02d}")
    if ref.get().exists:
        return {"status": "already_sent"}
    subject, body = build()
    bid = _broadcast(subject, body)
    ref.set({"subject": subject, "broadcast": bid, "sent": datetime.datetime.now(datetime.timezone.utc)})
    log_event("newsletter_sent", broadcast=bid)
    return {"status": "sent", "broadcast": bid, "subject": subject}


@router.get("/admin/newsletter/preview", response_class=HTMLResponse)
def preview(req: Request, claims=Depends(_admin)):
    rate_limit(req, "search", shared=False)
    subject, body = build()
    return HTMLResponse(f"<title>{e(subject)}</title><p style='font:13px Arial;color:#777'>Subject: {e(subject)}</p>{body}")
