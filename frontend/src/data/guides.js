// "Do this now" guides: what to do, in order, when something has just happened.
// Steps are grouped by when they matter. Each may cite the section it rests on as
// [act slug, section], linking to /law/<act>/<section>. Sections were checked against the
// texts in the index. Hindi is written for plain reading, not as a legal translation.

export const WHEN = {
  now: { en: "Right now", hi: "अभी" },
  today: { en: "Today", hi: "आज" },
  week: { en: "In the next few days", hi: "अगले कुछ दिनों में" },
  later: { en: "After that", hi: "उसके बाद" },
};

export const GUIDES = [
  {
    slug: "cyber-fraud",
    title: { en: "Money lost to an online fraud", hi: "ऑनलाइन धोखाधड़ी में पैसे गए" },
    lede: {
      en: "UPI, card, bank or investment scam. The first hour matters most: money can often be frozen before it moves on.",
      hi: "UPI, कार्ड, बैंक या निवेश घोटाला। पहला घंटा सबसे ज़रूरी है: पैसा आगे जाने से पहले अक्सर रोका जा सकता है।",
    },
    helplines: ["1930"],
    steps: [
      { when: "now", en: "Call 1930, the national cyber fraud helpline, or report at cybercrime.gov.in. Give the transaction ID, time, amount and the number or UPI ID the money went to. Note the acknowledgement number.", hi: "1930 पर कॉल करें (राष्ट्रीय साइबर धोखाधड़ी हेल्पलाइन) या cybercrime.gov.in पर रिपोर्ट करें। ट्रांज़ैक्शन ID, समय, रक़म और जिस नंबर या UPI ID पर पैसा गया, वह बताएँ। शिकायत नंबर लिख लें।" },
      { when: "now", en: "Call your bank's customer care (the number on your card or the bank's website, never one from a search ad or SMS). Block the card, UPI and net banking, and report the transaction as unauthorised.", hi: "अपने बैंक की कस्टमर केयर पर कॉल करें (कार्ड पर या बैंक की वेबसाइट पर दिया नंबर, किसी विज्ञापन या SMS वाला नहीं)। कार्ड, UPI और नेट बैंकिंग बंद कराएँ और ट्रांज़ैक्शन को अनधिकृत बताएँ।" },
      { when: "now", en: "Don't delete anything. Screenshot the messages, call log, payment screens, website or app, and the fraudster's numbers.", hi: "कुछ भी डिलीट न करें। मैसेज, कॉल लॉग, पेमेंट स्क्रीन, वेबसाइट या ऐप, और धोखेबाज़ के नंबरों के स्क्रीनशॉट लें।" },
      { when: "today", en: "Complete the online complaint at cybercrime.gov.in with the screenshots. It is sent to the police and the banks involved.", hi: "स्क्रीनशॉट के साथ cybercrime.gov.in पर ऑनलाइन शिकायत पूरी करें। यह पुलिस और संबंधित बैंकों तक जाती है।" },
      { when: "today", en: "Write to your bank too (email or the app's complaint form) and keep the reference. Under RBI's rules, if you did not share your PIN or OTP and you tell the bank within 3 working days, you should not bear the loss; anything taken after you report is the bank's responsibility.", hi: "बैंक को लिखित में भी शिकायत करें (ईमेल या ऐप का शिकायत फ़ॉर्म) और रेफ़रेंस नंबर रखें। RBI के नियमों के अनुसार, अगर आपने PIN या OTP साझा नहीं किया और 3 कामकाजी दिनों में बैंक को बताया, तो नुक़सान आपको नहीं उठाना चाहिए; रिपोर्ट करने के बाद गया पैसा बैंक की ज़िम्मेदारी है।" },
      { when: "week", en: "Cheating online is an offence: report it to the police for an FIR if the cyber complaint is not taken up.", hi: "ऑनलाइन धोखा अपराध है: अगर साइबर शिकायत पर कार्रवाई न हो, तो FIR के लिए पुलिस को रिपोर्ट करें।", cite: ["bns", "318"] },
      { when: "later", en: "If the bank doesn't reply within 30 days or rejects your complaint unfairly, complain to the RBI Ombudsman at cms.rbi.org.in. It's free.", hi: "अगर बैंक 30 दिन में जवाब न दे या शिकायत ग़लत तरीक़े से ख़ारिज करे, तो cms.rbi.org.in पर RBI लोकपाल से शिकायत करें। यह मुफ़्त है।" },
    ],
    links: { rights: "fir", hub: null },
  },
  {
    slug: "arrested",
    title: { en: "Someone close to you was arrested", hi: "आपके किसी अपने को गिरफ़्तार किया गया" },
    lede: {
      en: "What to do in the first hours, and the rights the person has from the moment of arrest.",
      hi: "पहले कुछ घंटों में क्या करें, और गिरफ़्तारी के पल से उस व्यक्ति के क्या अधिकार हैं।",
    },
    helplines: ["15100"],
    steps: [
      { when: "now", en: "Find out which police station and what offence. Every district keeps a list of people arrested and the charges, shown at the police station and the district control room.", hi: "पता करें कि कौन-सा थाना और कौन-सा अपराध है। हर ज़िले में गिरफ़्तार लोगों और आरोपों की सूची रखी जाती है, जो थाने और ज़िला कंट्रोल रूम में दिखाई जाती है।", cite: ["bnss", "37"] },
      { when: "now", en: "The police must tell the person the grounds of arrest and, for a bailable offence, that they can be released on bail. They must also inform a relative or friend.", hi: "पुलिस को गिरफ़्तारी का कारण बताना होता है, और ज़मानती अपराध हो तो यह भी कि ज़मानत पर छूट सकते हैं। उन्हें किसी रिश्तेदार या दोस्त को भी सूचना देनी होती है।", cite: ["bnss", "47"] },
      { when: "now", en: "Get a lawyer. If you can't afford one, call the free legal aid helpline 15100: anyone in custody is entitled to a free lawyer.", hi: "वकील करें। ख़र्च नहीं उठा सकते तो मुफ़्त क़ानूनी सहायता हेल्पलाइन 15100 पर कॉल करें: हिरासत में हर व्यक्ति मुफ़्त वकील का हक़दार है।", cite: ["constitution-of-india", "39A"] },
      { when: "today", en: "They must be taken before a Magistrate within 24 hours (not counting travel). Go to the court; this is where the lawyer can first ask for bail.", hi: "24 घंटे में (यात्रा का समय छोड़कर) मजिस्ट्रेट के सामने पेश करना ज़रूरी है। कोर्ट जाएँ; यहीं वकील पहली बार ज़मानत माँग सकता है।", cite: ["bnss", "58"] },
      { when: "today", en: "If they were hurt, ask for a medical examination; the police must arrange it.", hi: "अगर चोट लगी है, तो मेडिकल जाँच माँगें; पुलिस को इसकी व्यवस्था करनी होगी।", cite: ["bnss", "53"] },
      { when: "week", en: "For a non-bailable offence, the lawyer applies for bail to the Magistrate, or to the Sessions Court or High Court.", hi: "ग़ैर-ज़मानती अपराध में वकील मजिस्ट्रेट से, या सेशन कोर्ट या हाई कोर्ट से ज़मानत माँगता है।", cite: ["bnss", "480"] },
      { when: "later", en: "If no chargesheet is filed within 60 days (90 days for the most serious offences) of custody, they can claim \"default bail\" as of right.", hi: "अगर हिरासत के 60 दिन (सबसे गंभीर अपराधों में 90 दिन) में चार्जशीट दाख़िल न हो, तो \"डिफ़ॉल्ट ज़मानत\" का अधिकार मिलता है।", cite: ["bnss", "187"] },
    ],
    links: { rights: "arrest" },
  },
  {
    slug: "fir-refused",
    title: { en: "The police won't register your FIR", hi: "पुलिस आपकी FIR दर्ज नहीं कर रही" },
    lede: {
      en: "For a cognizable offence (theft, assault, cheating and the like), registering an FIR is the police's duty. Here's the ladder if they refuse.",
      hi: "संज्ञेय अपराध (चोरी, मारपीट, धोखाधड़ी आदि) में FIR दर्ज करना पुलिस का कर्तव्य है। अगर वे मना करें तो ये क़दम उठाएँ।",
    },
    helplines: ["112"],
    steps: [
      { when: "now", en: "You can report at any police station, even if the offence happened elsewhere (a \"zero FIR\"). Give it in writing and keep a copy with the station's stamp or receipt.", hi: "आप किसी भी थाने में रिपोर्ट कर सकते हैं, चाहे अपराध कहीं और हुआ हो (\"ज़ीरो FIR\")। लिखित में दें और थाने की मुहर या रसीद वाली कॉपी रखें।", cite: ["bnss", "173"] },
      { when: "now", en: "You're entitled to a free copy of the FIR. Read it before you sign.", hi: "FIR की मुफ़्त कॉपी आपका हक़ है। हस्ताक्षर से पहले पढ़ लें।", cite: ["bnss", "173"] },
      { when: "today", en: "If they refuse, send the complaint in writing by post (keep the receipt) to the Superintendent of Police of the district.", hi: "अगर मना करें, तो शिकायत लिखकर डाक से (रसीद रखें) ज़िले के पुलिस अधीक्षक (SP) को भेजें।", cite: ["bnss", "173"] },
      { when: "week", en: "If that fails too, apply to the Magistrate, with your complaint and the SP's postal receipt. The Magistrate can order the police to investigate.", hi: "इससे भी न हो, तो अपनी शिकायत और SP वाली डाक रसीद के साथ मजिस्ट्रेट को अर्ज़ी दें। मजिस्ट्रेट पुलिस को जाँच का आदेश दे सकते हैं।", cite: ["bnss", "175"] },
      { when: "later", en: "For offences punishable with 3 to 7 years, the police may make a preliminary enquiry of up to 14 days before registering. Ask when it will be done.", hi: "3 से 7 साल की सज़ा वाले अपराधों में पुलिस दर्ज करने से पहले 14 दिन तक प्रारंभिक जाँच कर सकती है। पूछें कि यह कब तक होगी।", cite: ["bnss", "173"] },
    ],
    links: { rights: "fir" },
  },
  {
    slug: "cheque-bounced",
    title: { en: "A cheque given to you bounced", hi: "आपको दिया गया चेक बाउंस हो गया" },
    lede: {
      en: "A bounced cheque can be a criminal case, but only if you keep to strict time limits. Miss one and the case can fail.",
      hi: "बाउंस चेक आपराधिक मामला बन सकता है, लेकिन तभी जब आप सख़्त समय-सीमा का पालन करें। एक भी चूकी तो केस ख़त्म हो सकता है।",
    },
    deadline: "cheque",
    steps: [
      { when: "now", en: "Keep the original cheque and the bank's return memo safely. Note the date you received the memo: the clock starts there.", hi: "असली चेक और बैंक का रिटर्न मेमो संभालकर रखें। मेमो मिलने की तारीख़ लिख लें: समय-सीमा वहीं से शुरू होती है।" },
      { when: "week", en: "Within 30 days of getting the memo, send a written notice to the person who gave the cheque, demanding the amount. Send it by registered post or speed post and keep the receipt and tracking.", hi: "मेमो मिलने के 30 दिन के भीतर चेक देने वाले को लिखित नोटिस भेजकर रक़म माँगें। रजिस्टर्ड या स्पीड पोस्ट से भेजें और रसीद व ट्रैकिंग रखें।", cite: ["ni-act", "138"] },
      { when: "later", en: "They then have 15 days from receiving the notice to pay. If they don't, you can file a complaint before the Magistrate within one month after those 15 days end.", hi: "नोटिस मिलने के बाद उनके पास भुगतान के लिए 15 दिन होते हैं। अगर वे न दें, तो उन 15 दिनों के ख़त्म होने के बाद एक महीने के भीतर मजिस्ट्रेट के सामने शिकायत दर्ज करें।", cite: ["ni-act", "142"] },
      { when: "later", en: "The court can order them to pay you up to 20% of the cheque amount as interim compensation while the case runs.", hi: "केस चलने के दौरान कोर्ट उन्हें चेक की रक़म का 20% तक अंतरिम मुआवज़ा देने का आदेश दे सकता है।", cite: ["ni-act", "143A"] },
    ],
    links: { rights: "cheque-bounce", template: "cheque-bounce-notice" },
  },
  {
    slug: "road-accident",
    title: { en: "You were in a road accident", hi: "आपका सड़क हादसा हुआ" },
    lede: {
      en: "Care first, then the paperwork that decides compensation. There is a six-month limit on claims.",
      hi: "पहले इलाज, फिर वे काग़ज़ जिनसे मुआवज़ा तय होता है। दावे के लिए छह महीने की सीमा है।",
    },
    helplines: ["112"],
    deadline: "accident",
    steps: [
      { when: "now", en: "Call 112 for police and ambulance. Anyone who helps the injured or takes them to hospital can't be held liable for it, and needn't give their name.", hi: "पुलिस और एम्बुलेंस के लिए 112 पर कॉल करें। घायल की मदद करने या अस्पताल ले जाने वाले पर इसकी कोई ज़िम्मेदारी नहीं आती, और उन्हें नाम बताना ज़रूरी नहीं।", cite: ["mv-act", "134A"] },
      { when: "now", en: "If you can, photograph the vehicles, number plates, the spot and injuries, and take witnesses' phone numbers.", hi: "हो सके तो गाड़ियों, नंबर प्लेट, जगह और चोटों की फ़ोटो लें, और गवाहों के फ़ोन नंबर लें।" },
      { when: "today", en: "Make sure the police record the accident and get a copy of the FIR. The police's accident report goes to the Claims Tribunal and can itself be treated as your claim.", hi: "पक्का करें कि पुलिस हादसा दर्ज करे और FIR की कॉपी लें। पुलिस की दुर्घटना रिपोर्ट क्लेम ट्रिब्यूनल को जाती है और ख़ुद आपके दावे के रूप में मानी जा सकती है।", cite: ["mv-act", "166"] },
      { when: "week", en: "Tell your insurer, and keep every hospital bill, prescription and record of lost income.", hi: "अपने बीमाकर्ता को बताएँ, और हर अस्पताल बिल, पर्चा और कमाई के नुक़सान का रिकॉर्ड रखें।" },
      { when: "later", en: "File a compensation claim before the Motor Accident Claims Tribunal within six months of the accident: where it happened, where you live, or where the other side lives.", hi: "हादसे के छह महीने के भीतर मोटर दुर्घटना दावा ट्रिब्यूनल (MACT) में मुआवज़े का दावा करें: जहाँ हादसा हुआ, जहाँ आप रहते हैं, या जहाँ दूसरा पक्ष रहता है।", cite: ["mv-act", "166"] },
      { when: "later", en: "Hit and run, vehicle not traced: there is fixed compensation of ₹2 lakh for a death and ₹50,000 for grievous hurt. Apply through the Claims Enquiry Officer (usually the SDM/Tehsildar).", hi: "हिट एंड रन, गाड़ी का पता नहीं: मृत्यु पर ₹2 लाख और गंभीर चोट पर ₹50,000 का तय मुआवज़ा है। दावा जाँच अधिकारी (आम तौर पर SDM/तहसीलदार) के ज़रिए आवेदन करें।", cite: ["mv-act", "161"] },
    ],
    links: {},
  },
  {
    slug: "legal-notice",
    title: { en: "You received a legal notice", hi: "आपको क़ानूनी नोटिस मिला" },
    lede: {
      en: "A notice is a demand, not a court order. Don't ignore it, and don't panic: read it, note the deadline, and reply carefully.",
      hi: "नोटिस एक माँग है, कोर्ट का आदेश नहीं। इसे अनदेखा न करें और घबराएँ नहीं: पढ़ें, समय-सीमा नोट करें, और सोच-समझकर जवाब दें।",
    },
    steps: [
      { when: "now", en: "Note the date you received it and any deadline it sets (often 15 days). Keep the envelope: the postmark can matter.", hi: "मिलने की तारीख़ और उसमें दी गई समय-सीमा (अक्सर 15 दिन) नोट करें। लिफ़ाफ़ा रखें: डाक की मुहर काम आ सकती है।" },
      { when: "now", en: "Check what it is. A court summons or order is different: you must appear or act by the date it gives.", hi: "देखें कि यह क्या है। कोर्ट का समन या आदेश अलग चीज़ है: उसमें दी गई तारीख़ तक हाज़िर होना या कार्रवाई करना ज़रूरी है।" },
      { when: "today", en: "Don't admit anything on calls or WhatsApp with the other side while you decide. Gather your documents: agreements, receipts, messages.", hi: "जब तक आप तय करें, दूसरे पक्ष से फ़ोन या WhatsApp पर कुछ भी स्वीकार न करें। अपने काग़ज़ इकट्ठा करें: अनुबंध, रसीदें, मैसेज।" },
      { when: "week", en: "If it's a cheque-bounce notice, the 15 days to pay are set by law: paying within them ends the criminal case before it starts.", hi: "अगर यह चेक बाउंस का नोटिस है, तो भुगतान के 15 दिन क़ानून से तय हैं: इनके भीतर भुगतान करने से आपराधिक केस शुरू होने से पहले ही ख़त्म हो जाता है।", cite: ["ni-act", "138"] },
      { when: "week", en: "Reply in writing before the deadline, point by point, through a lawyer if the stakes are high. A reply isn't always required by law, but silence can be used against you later.", hi: "समय-सीमा से पहले लिखित में, एक-एक बात का जवाब दें; मामला बड़ा हो तो वकील के ज़रिए। जवाब देना हमेशा क़ानूनन ज़रूरी नहीं, लेकिन चुप्पी बाद में आपके ख़िलाफ़ इस्तेमाल हो सकती है।" },
    ],
    links: { tool: "/notice" },
  },
  {
    slug: "domestic-violence",
    title: { en: "You face violence at home", hi: "आप घर में हिंसा झेल रही हैं" },
    lede: {
      en: "Your safety comes first. The law protects you from physical, emotional, sexual and financial abuse, and from being thrown out of your home.",
      hi: "आपकी सुरक्षा सबसे पहले है। क़ानून आपको शारीरिक, भावनात्मक, यौन और आर्थिक हिंसा से, और घर से निकाले जाने से बचाता है।",
    },
    helplines: ["112", "181"],
    steps: [
      { when: "now", en: "If you're in danger, call 112. The Women Helpline 181 works 24×7 and can connect you to a One Stop Centre for shelter, medical and legal help.", hi: "ख़तरा हो तो 112 पर कॉल करें। महिला हेल्पलाइन 181 चौबीसों घंटे काम करती है और आपको शेल्टर, इलाज और क़ानूनी मदद के लिए वन स्टॉप सेंटर से जोड़ सकती है।" },
      { when: "today", en: "If you're hurt, get a medical examination and keep the papers. Photograph injuries; save threatening messages.", hi: "चोट लगी हो तो मेडिकल जाँच कराएँ और काग़ज़ रखें। चोटों की फ़ोटो लें; धमकी भरे मैसेज सँभालकर रखें।" },
      { when: "week", en: "Under the Domestic Violence Act, the Magistrate can order protection (he must stop the violence), your right to stay in the shared home, money for expenses, and custody of children. A Protection Officer or the police can help you apply.", hi: "घरेलू हिंसा क़ानून के तहत मजिस्ट्रेट सुरक्षा आदेश (हिंसा बंद करने का), साझा घर में रहने का आपका अधिकार, ख़र्च के लिए पैसा और बच्चों की कस्टडी का आदेश दे सकते हैं। संरक्षण अधिकारी या पुलिस आवेदन में मदद कर सकते हैं।" },
      { when: "week", en: "Cruelty by a husband or his relatives, including harassment for dowry, is also a crime you can report to the police.", hi: "पति या उसके रिश्तेदारों की क्रूरता, दहेज के लिए उत्पीड़न सहित, एक अपराध भी है जिसकी शिकायत आप पुलिस से कर सकती हैं।", cite: ["bns", "85"] },
      { when: "later", en: "You can also claim maintenance for yourself and your children, and free legal aid through the District Legal Services Authority (15100).", hi: "आप अपने और बच्चों के लिए भरण-पोषण भी माँग सकती हैं, और ज़िला विधिक सेवा प्राधिकरण (15100) से मुफ़्त क़ानूनी सहायता ले सकती हैं।", cite: ["bnss", "144"] },
    ],
    links: { rights: "domestic-violence", hub: "women" },
  },
  {
    slug: "landlord",
    title: { en: "Landlord keeping your deposit or forcing you out", hi: "मकान मालिक डिपॉज़िट नहीं लौटा रहा या ज़बरदस्ती निकाल रहा" },
    lede: {
      en: "A landlord can end a tenancy only by proper notice and, if you don't leave, through a court. Locking you out or cutting the water is not the way.",
      hi: "मकान मालिक किराएदारी सिर्फ़ सही नोटिस देकर, और अगर आप न जाएँ तो कोर्ट के ज़रिए ख़त्म कर सकता है। ताला लगाना या पानी काटना सही तरीक़ा नहीं है।",
    },
    helplines: ["112"],
    steps: [
      { when: "now", en: "If you're being thrown out, locked out or threatened, call 112. Forcing a tenant out without a court order is unlawful.", hi: "अगर आपको निकाला, बाहर बंद किया या धमकाया जा रहा है, तो 112 पर कॉल करें। कोर्ट के आदेश के बिना किराएदार को ज़बरदस्ती निकालना ग़ैरक़ानूनी है।" },
      { when: "today", en: "Read your rent agreement for the notice period. Without one, a month-to-month tenancy ends with 15 days' written notice.", hi: "नोटिस की अवधि के लिए किराया अनुबंध पढ़ें। अनुबंध न हो तो महीने-दर-महीने की किराएदारी 15 दिन के लिखित नोटिस से ख़त्म होती है।", cite: ["tp-act", "106"] },
      { when: "today", en: "Keep proof of rent paid and of the deposit (bank transfers, receipts, the agreement), and photos of the flat's condition when you leave.", hi: "किराया और डिपॉज़िट देने के सबूत (बैंक ट्रांसफ़र, रसीदें, अनुबंध) और घर छोड़ते समय उसकी हालत की फ़ोटो रखें।" },
      { when: "week", en: "Ask for the deposit back in writing, with a date. If that fails, send a legal notice.", hi: "डिपॉज़िट लिखित में, तारीख़ देकर वापस माँगें। अगर न मिले तो क़ानूनी नोटिस भेजें।" },
      { when: "later", en: "You can sue to recover the deposit, usually within three years. Many cities have Small Causes Courts or Rent Authorities for this.", hi: "डिपॉज़िट वापसी के लिए आप मुक़दमा कर सकते हैं, आम तौर पर तीन साल के भीतर। कई शहरों में इसके लिए स्मॉल कॉज़ेज़ कोर्ट या रेंट अथॉरिटी हैं।" },
    ],
    links: { rights: "tenant", template: "rent-agreement", hub: "tenant" },
  },
  {
    slug: "consumer",
    title: { en: "A product or service let you down", hi: "किसी सामान या सेवा ने धोखा दिया" },
    lede: {
      en: "Defective goods, a service not delivered, a refund refused. Consumer Commissions are cheap, need no lawyer, and you can file online.",
      hi: "ख़राब सामान, सेवा न मिलना, रिफ़ंड से इनकार। उपभोक्ता आयोग सस्ते हैं, वकील की ज़रूरत नहीं, और ऑनलाइन शिकायत कर सकते हैं।",
    },
    helplines: ["1915"],
    deadline: "consumer",
    steps: [
      { when: "today", en: "Complain to the seller or company in writing (email or their app) and keep the bill, warranty, order page and chats.", hi: "विक्रेता या कंपनी से लिखित में शिकायत करें (ईमेल या उनका ऐप) और बिल, वारंटी, ऑर्डर पेज और चैट सँभालकर रखें।" },
      { when: "week", en: "Register a complaint with the National Consumer Helpline: call 1915 or WhatsApp 8800001915. They take it up with the company, often within a few weeks.", hi: "राष्ट्रीय उपभोक्ता हेल्पलाइन पर शिकायत दर्ज करें: 1915 पर कॉल करें या 8800001915 पर WhatsApp करें। वे कंपनी से बात करते हैं, अक्सर कुछ हफ़्तों में।" },
      { when: "later", en: "If that fails, file a complaint with the District Consumer Commission (for claims up to ₹50 lakh) online at edaakhil.nic.in. There's no fee up to ₹5 lakh.", hi: "अगर इससे न हो, तो ज़िला उपभोक्ता आयोग (₹50 लाख तक के दावे) में edaakhil.nic.in पर ऑनलाइन शिकायत करें। ₹5 लाख तक कोई फ़ीस नहीं।", cite: ["consumer-protection-act", "34"] },
      { when: "later", en: "File within two years of when the problem arose.", hi: "समस्या शुरू होने के दो साल के भीतर शिकायत करें।", cite: ["consumer-protection-act", "69"] },
    ],
    links: { rights: "consumer", template: "consumer-complaint", hub: "consumer" },
  },
];

export const HELPLINES = {
  "112": { en: "Emergency (police, ambulance, fire)", hi: "आपातकाल (पुलिस, एम्बुलेंस, फ़ायर)" },
  "181": { en: "Women Helpline, 24×7", hi: "महिला हेल्पलाइन, 24×7" },
  "1930": { en: "Cyber fraud helpline", hi: "साइबर धोखाधड़ी हेल्पलाइन" },
  "15100": { en: "Free legal aid (NALSA)", hi: "मुफ़्त क़ानूनी सहायता (NALSA)" },
  "1098": { en: "Childline", hi: "चाइल्डलाइन" },
  "1915": { en: "National Consumer Helpline", hi: "राष्ट्रीय उपभोक्ता हेल्पलाइन" },
  "14416": { en: "Tele-MANAS mental health support", hi: "टेली-मानस मानसिक स्वास्थ्य सहायता" },
};

export const findGuideNow = (slug) => GUIDES.find((g) => g.slug === slug);
