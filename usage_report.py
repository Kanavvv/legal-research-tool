"""What each account actually costs in Claude usage, so pricing rests on real numbers.

Reads the user_costs collection the backend fills on every Claude call
(user_costs/{uid}_{YYYYMM}; signed-out use is pooled under "anon").

    FIREBASE_SERVICE_ACCOUNT_B64=... python3 usage_report.py            # this month
    python3 usage_report.py --month 202611 --usd-inr 88 --top 20

Without FIREBASE_SERVICE_ACCOUNT_B64 it uses Application Default Credentials
(e.g. `gcloud auth application-default login`). Prints uids shortened; no emails.
"""
import argparse
import base64
import datetime
import json
import os
import statistics

import firebase_admin
from firebase_admin import credentials, firestore

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
PRO_PRICE_INR = int(os.environ.get("PRO_PRICE_PAISE", "19900")) / 100


def connect():
    b64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64", "")
    if b64:
        firebase_admin.initialize_app(credentials.Certificate(json.loads(base64.b64decode(b64))))
    else:
        firebase_admin.initialize_app(options={"projectId": os.environ.get("GOOGLE_CLOUD_PROJECT", "legal-research-tool-509320")})
    return firestore.client()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", default=datetime.datetime.now(IST).strftime("%Y%m"), help="YYYYMM (IST)")
    ap.add_argument("--usd-inr", type=float, default=88.0, help="exchange rate for the rupee columns")
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--prefix", default=os.environ.get("GUARD_COLLECTION_PREFIX", ""))
    a = ap.parse_args()

    db = connect()
    rows = [d.to_dict() for d in db.collection(a.prefix + "user_costs").where("month", "==", a.month).stream()]
    if not rows:
        print(f"No usage recorded for {a.month}.")
        return

    month_end = datetime.datetime.strptime(a.month, "%Y%m").replace(tzinfo=IST)
    def plan_of(uid):
        if uid == "anon":
            return "signed out"
        snap = db.collection(a.prefix + "users").document(uid).get()
        until = (snap.to_dict() or {}).get("pro_until") if snap.exists else None
        return "pro" if until and until >= month_end else "free"

    for r in rows:
        r["plan"] = plan_of(r["uid"])
    inr = lambda usd: usd * a.usd_inr

    total = sum(r["usd"] for r in rows)
    print(f"\nNyaya usage cost, {a.month[:4]}-{a.month[4:]}  (1 USD = Rs {a.usd_inr:g})")
    print(f"Total: ${total:.2f}  (Rs {inr(total):,.0f})  across {sum(r['calls'] for r in rows):,} Claude calls\n")

    print(f"{'plan':<12}{'accounts':>9}{'avg $/acct':>12}{'median':>9}{'max':>9}{'avg Rs':>9}")
    for plan in ("pro", "free", "signed out"):
        group = [r["usd"] for r in rows if r["plan"] == plan]
        if not group:
            continue
        print(f"{plan:<12}{len(group):>9}{statistics.mean(group):>12.3f}{statistics.median(group):>9.3f}"
              f"{max(group):>9.3f}{inr(statistics.mean(group)):>9.1f}")

    pro = [r["usd"] for r in rows if r["plan"] == "pro"]
    if pro:
        heaviest = inr(max(pro))
        print(f"\nPro price Rs {PRO_PRICE_INR:g}: average Pro account costs Rs {inr(statistics.mean(pro)):.1f} "
              f"({inr(statistics.mean(pro)) / PRO_PRICE_INR:.0%} of price); heaviest Rs {heaviest:.1f} "
              f"({heaviest / PRO_PRICE_INR:.0%}). Razorpay's ~2% fee is not included.")

    by_route = {}
    for r in rows:
        for route, v in (r.get("by_route") or {}).items():
            agg = by_route.setdefault(route, [0.0, 0])
            agg[0] += v.get("usd", 0)
            agg[1] += v.get("calls", 0)
    print(f"\n{'feature':<16}{'calls':>8}{'total $':>10}{'$/call':>9}{'Rs/call':>9}")
    for route, (usd, calls) in sorted(by_route.items(), key=lambda kv: -kv[1][0]):
        print(f"{route:<16}{calls:>8}{usd:>10.2f}{usd / max(calls, 1):>9.4f}{inr(usd / max(calls, 1)):>9.2f}")

    print(f"\nTop {a.top} accounts by cost")
    print(f"{'account':<14}{'plan':<12}{'calls':>7}{'$':>9}{'Rs':>8}")
    for r in sorted(rows, key=lambda r: -r["usd"])[:a.top]:
        who = r["uid"] if r["uid"] == "anon" else r["uid"][:10] + "…"
        print(f"{who:<14}{r['plan']:<12}{r['calls']:>7}{r['usd']:>9.3f}{inr(r['usd']):>8.1f}")
    print()


if __name__ == "__main__":
    main()
