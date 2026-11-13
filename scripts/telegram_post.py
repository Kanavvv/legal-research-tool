"""Post pre-approved Nyaya posts from brand/telegram-queue.json to the Telegram channel.

Only posts that are in the queue file are ever sent. Nothing else: no replies, no reading messages.

  python scripts/telegram_post.py --slot am         # posts today's (IST) entry for that slot
  python scripts/telegram_post.py --id welcome      # posts one entry by id, whatever its date
  add --dry-run to print instead of sending

Needs env TELEGRAM_BOT_TOKEN (kept as a GitHub secret, never in the repo) and
TELEGRAM_CHANNEL (e.g. @asknyaya). Standard library only.
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

QUEUE = Path(__file__).resolve().parent.parent / "brand" / "telegram-queue.json"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))


def call(token, method, payload):
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.load(r)
    except urllib.error.HTTPError as e:
        body = json.load(e)
    if not body.get("ok"):
        # Telegram's error text never contains the token; print it so the Actions log shows why.
        sys.exit(f"Telegram {method} failed: {body.get('description')}")
    return body["result"]


def payload_for(entry, channel):
    if entry["type"] == "text":
        return "sendMessage", {"chat_id": channel, "text": entry["text"]}
    if entry["type"] == "quiz":
        return "sendPoll", {
            "chat_id": channel,
            "question": entry["question"],
            "options": [{"text": o} for o in entry["options"]],
            "type": "quiz",
            "correct_option_id": entry["correct"],
            "explanation": entry["explanation"],
            "is_anonymous": True,
        }
    sys.exit(f"Unknown type {entry['type']!r} in {entry['id']}")


def validate(entry):
    if entry["type"] == "quiz":
        assert len(entry["question"]) <= 300, entry["id"]
        assert 2 <= len(entry["options"]) <= 10 and all(len(o) <= 100 for o in entry["options"]), entry["id"]
        assert len(entry["explanation"]) <= 200, entry["id"]
        assert 0 <= entry["correct"] < len(entry["options"]), entry["id"]
    else:
        assert 0 < len(entry["text"]) <= 4096, entry["id"]


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slot", choices=["am", "pm", "fri", "sat"])
    g.add_argument("--id")
    ap.add_argument("--date", help="override today's IST date (YYYY-MM-DD), for testing")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    posts = json.loads(QUEUE.read_text())["posts"]
    for e in posts:
        validate(e)

    if a.id:
        due = [e for e in posts if e["id"] == a.id]
        if not due:
            sys.exit(f"No entry with id {a.id!r}")
    else:
        today = a.date or dt.datetime.now(IST).date().isoformat()
        due = [e for e in posts if e["date"] == today and e["slot"] == a.slot]
        if not due:
            print(f"Nothing queued for {today} / {a.slot}.")
            return

    channel = os.environ.get("TELEGRAM_CHANNEL", "@asknyaya")
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not a.dry_run and not token:
        sys.exit("TELEGRAM_BOT_TOKEN is not set.")

    for e in due:
        method, payload = payload_for(e, channel)
        if a.dry_run:
            print(f"--- would {method} to {channel}: {e['id']}")
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            call(token, method, payload)
            print(f"Posted {e['id']} to {channel}.")


if __name__ == "__main__":
    main()
