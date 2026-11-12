"""Answer test set for Nyaya.

    python3 evals/run_eval.py --offline          # helpline checks only, free
    python3 evals/run_eval.py                    # also asks all 50 questions (about $0.50)
    python3 evals/run_eval.py --api http://localhost:8080 --only cheque-bounce,rti-fee

Each question in questions.jsonl lists groups of expected terms; an answer passes
when every group has at least one term in it. The terms are a first check, not a
legal review: "reviewed": false means a lawyer has not yet signed off on them.
Results go to evals/results-<date>.json so runs can be compared.
"""

import argparse
import datetime
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))


def load(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def check_helplines():
    import safety
    failed = 0
    for case in load("emergency.jsonl"):
        got = [line["number"] for line in safety.emergency_lines(case["q"])]
        ok = all(n in got for n in case["helplines"]) and (got == [] if not case["helplines"] else True)
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} helplines {case['id']}: got {got or 'none'}")
    return failed


def ask(api, q, lang):
    import requests
    started = time.time()
    r = requests.post(f"{api}/ask", json={"question": q, "lang": lang}, stream=True, timeout=120)
    r.raise_for_status()
    answer, sources, emergency = "", [], []
    for line in r.iter_lines(decode_unicode=True):
        if not line:
            continue
        msg = json.loads(line)
        if msg.get("type") == "delta":
            answer += msg.get("text", "")
        elif msg.get("type") == "sources":
            sources = msg.get("sources", [])
        elif msg.get("type") == "emergency":
            emergency = msg.get("lines", [])
        elif msg.get("type") == "error":
            raise RuntimeError(msg.get("detail"))
    return answer, sources, emergency, time.time() - started


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="https://api.asknyaya.in")
    ap.add_argument("--offline", action="store_true", help="helpline checks only, no API calls")
    ap.add_argument("--only", default="", help="comma-separated question ids")
    args = ap.parse_args()

    failed = check_helplines()
    if args.offline:
        sys.exit(1 if failed else 0)

    only = {x for x in args.only.split(",") if x}
    results = []
    for case in load("questions.jsonl"):
        if only and case["id"] not in only:
            continue
        try:
            answer, sources, _, secs = ask(args.api, case["q"], case["lang"])
        except Exception as e:
            print(f"ERR  {case['id']}: {e}")
            results.append({"id": case["id"], "ok": False, "error": str(e)[:200]})
            failed += 1
            continue
        low = answer.lower()
        missing = [g for g in case["expect"] if not any(t.lower() in low for t in g)]
        ok = not missing
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {case['id']} ({secs:.1f}s, {len(sources)} sources)"
              + (f": missing {' / '.join(missing[0])}" if missing else ""))
        results.append({"id": case["id"], "ok": ok, "missing": missing, "seconds": round(secs, 1),
                        "sources": len(sources), "answer": answer})

    passed = sum(r["ok"] for r in results)
    print(f"\n{passed}/{len(results)} answers passed, {failed} failures in total")
    out = os.path.join(HERE, f"results-{datetime.date.today().isoformat()}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print(f"Saved {out}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
