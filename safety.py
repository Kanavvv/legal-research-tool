"""Emergency detection: when a question says someone is in danger right now,
Nyaya shows the right helplines before the answer (web and WhatsApp).

Deliberately simple keyword patterns (English, Hinglish, Hindi). A false
positive costs one extra line of helplines; a miss costs much more.
"""

import re

# (key, pattern, helpline). Order is the order shown.
_RULES = [
    ("self_harm",
     r"suicid|kill (my ?self|myself)|end (my|his|her) life|want to die|self[- ]?harm|cut(ting)? myself"
     r"|आत्महत्या|ख़ुदकुशी|खुदकुशी|मरना चाहत|जान दे",
     {"name": "Tele-MANAS", "number": "14416", "note": "free, 24×7 mental health support, in your language"}),
    ("danger",
     r"\b(beating|hitting|attacking|threatening) (me|us|my)|threaten(ed|ing)? to kill|going to kill"
     r"|\bin danger\b|kidnap|abduct|\braped?\b|sexual(ly)? assault|being followed|locked (me )?in"
     r"|मार रहा|मार रही|मारपीट|जान से मारने|धमकी|बलात्कार|अपहरण",
     {"name": "Emergency (police, ambulance)", "number": "112", "note": "works from any phone, even without balance"}),
    ("women",
     r"domestic violence|dowry|(husband|in-?laws?) (beat|hit|torture|harass)|harass(ment|ing)|stalk"
     r"|दहेज|घरेलू हिंसा|ससुराल|छेड़",
     {"name": "Women Helpline", "number": "181", "note": "24×7, for women facing violence or harassment"}),
    ("child",
     r"child (abuse|labou?r|marriage|trafficking)|(minor|child).{0,30}(abuse|touched|beaten)|बाल विवाह|बाल श्रम",
     {"name": "Childline", "number": "1098", "note": "24×7, for children in danger"}),
    ("cyber",
     r"scam(med)?|fraud|cheated online|money (was |got )?(deducted|debited|stolen|transferred)|account (was )?hacked"
     r"|clicked (a|the) link|ठगी|धोखाधड़ी|पैसे कट",
     {"name": "Cyber fraud helpline", "number": "1930",
      "note": "call within the first hour so the bank can freeze the money; also report at cybercrime.gov.in"}),
    ("arrest",
     r"(police|cops?) (have |has )?(took|taken|arrested|detained|picked up)|being arrested|(is|was) arrested"
     r"|in (police )?custody|गिरफ्तार|हिरासत|थाने ले गए",
     {"name": "Free legal aid (NALSA)", "number": "15100",
      "note": "free lawyer; the person arrested must be told the grounds and can inform a family member"}),
]
_COMPILED = [(k, re.compile(p, re.IGNORECASE), h) for k, p, h in _RULES]
URGENT = {"self_harm", "danger", "arrest"}


def emergency_lines(text):
    """Helplines that fit this message, most urgent first. [] for ordinary questions."""
    found, seen = [], set()
    for key, rx, line in _COMPILED:
        if rx.search(text or "") and line["number"] not in seen:
            seen.add(line["number"])
            found.append({"key": key, **line})
    # Anyone in danger also needs 112, even if only a narrower rule matched
    if any(f["key"] in ("women", "child") for f in found) and "112" not in seen and re.search(
            r"beat|hit|hurt|attack|threat|मार", text or "", re.IGNORECASE):
        found.insert(0, {"key": "danger", **_RULES[1][2]})
    return found


def emergency_text(lines):
    """The WhatsApp version: plain lines to put above the answer."""
    if not lines:
        return ""
    rows = [f"📞 *{l['number']}*: {l['name']} ({l['note']})" for l in lines]
    return "*If you need help right now:*\n" + "\n".join(rows) + "\n\n"
