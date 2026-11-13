// Who gets a free lawyer in India, from Section 12 of the Legal Services Authorities Act, 1987.
// The categories qualify whatever the person's income; everyone else qualifies below an
// income limit that each state sets (so we never print one number for all of India).

export const CATEGORIES = [
  { id: "woman", en: "I am a woman", hi: "मैं महिला हूँ", law: "s.12(c)" },
  { id: "child", en: "I am under 18, or asking for a child", hi: "मैं 18 से कम हूँ, या किसी बच्चे के लिए पूछ रहा/रही हूँ", law: "s.12(c)" },
  { id: "scst", en: "I belong to a Scheduled Caste or Scheduled Tribe", hi: "मैं अनुसूचित जाति या अनुसूचित जनजाति से हूँ", law: "s.12(a)" },
  { id: "disability", en: "I have a disability", hi: "मैं दिव्यांग हूँ", law: "s.12(d)" },
  { id: "custody", en: "I am in custody (jail, police lock-up, a protective or juvenile home, or a psychiatric hospital), or asking for someone who is", hi: "मैं हिरासत में हूँ (जेल, हवालात, संरक्षण या बाल गृह, या मनोचिकित्सा अस्पताल), या किसी ऐसे व्यक्ति के लिए पूछ रहा/रही हूँ", law: "s.12(g)" },
  { id: "worker", en: "I am an industrial worker (factory, mine, plantation and similar)", hi: "मैं औद्योगिक कामगार हूँ (फ़ैक्ट्री, खदान, बागान आदि)", law: "s.12(f)" },
  { id: "trafficking", en: "I was trafficked or made to do forced or unpaid labour (begar)", hi: "मेरी तस्करी हुई या मुझसे जबरन या बिना पैसे काम (बेगार) कराया गया", law: "s.12(b)" },
  { id: "disaster", en: "I am a victim of a disaster, ethnic or caste violence, flood, drought, earthquake or industrial accident", hi: "मैं किसी आपदा, जातीय या सांप्रदायिक हिंसा, बाढ़, सूखे, भूकंप या औद्योगिक दुर्घटना का पीड़ित हूँ", law: "s.12(e)" },
];

export const GETS = {
  en: [
    "A lawyer from the legal services panel to advise you and represent you in court, free",
    "Court fees, process fees and the cost of witnesses paid for you",
    "Help drafting petitions, replies and other papers",
    "Certified copies of judgments and orders, free",
    "Lok Adalat: many disputes settled by agreement, with no court fee, and the award is final",
  ],
  hi: [
    "विधिक सेवा पैनल का वकील जो मुफ़्त में सलाह दे और अदालत में आपकी पैरवी करे",
    "कोर्ट फ़ीस, प्रोसेस फ़ीस और गवाहों का ख़र्च आपकी ओर से दिया जाता है",
    "याचिका, जवाब और दूसरे काग़ज़ तैयार करने में मदद",
    "फ़ैसलों और आदेशों की प्रमाणित प्रतियाँ, मुफ़्त",
    "लोक अदालत: कई विवाद आपसी सहमति से सुलझते हैं, कोई कोर्ट फ़ीस नहीं, और फ़ैसला अंतिम होता है",
  ],
};
