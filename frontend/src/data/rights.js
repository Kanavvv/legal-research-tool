// Know-your-rights guides. Each point cites the section it rests on, as [act slug, section],
// so the page can link straight to /law/<act>/<section>. Checked against the section texts
// in corpus_statutes/. Hindi is written for plain reading, not as a legal translation.

export const RIGHTS = [
  {
    slug: "arrest",
    title: { en: "If the police arrest you", hi: "अगर पुलिस आपको गिरफ़्तार करे" },
    lede: {
      en: "Arrest is not punishment. The law gives you rights from the first minute, and the police must follow them.",
      hi: "गिरफ़्तारी सज़ा नहीं है। क़ानून पहले ही मिनट से आपको अधिकार देता है, और पुलिस को उनका पालन करना होता है।",
    },
    points: [
      { en: "You must be told why you are being arrested, and, if the offence is bailable, that you can be released on bail.", hi: "आपको बताया जाना चाहिए कि आपको क्यों गिरफ़्तार किया जा रहा है, और अगर अपराध ज़मानती है तो यह भी कि आप ज़मानत पर छूट सकते हैं।", cite: ["bnss", "47"] },
      { en: "The police must tell a relative or friend you name about the arrest and where you are held.", hi: "पुलिस को आपके बताए किसी रिश्तेदार या दोस्त को गिरफ़्तारी और आपको कहाँ रखा गया है, इसकी जानकारी देनी होती है।", cite: ["bnss", "48"] },
      { en: "You may meet a lawyer of your choice during interrogation, though not for the whole of it.", hi: "पूछताछ के दौरान आप अपनी पसंद के वकील से मिल सकते हैं, हालाँकि पूरी पूछताछ के दौरान नहीं।", cite: ["bnss", "38"] },
      { en: "You must be taken before a Magistrate within 24 hours, not counting travel time. Holding you longer needs the Magistrate's order.", hi: "आपको 24 घंटे के भीतर (यात्रा का समय छोड़कर) मजिस्ट्रेट के सामने पेश करना ज़रूरी है। इससे ज़्यादा रखने के लिए मजिस्ट्रेट का आदेश चाहिए।", cite: ["bnss", "58"] },
      { en: "For offences punishable with up to 7 years, the police should usually send a notice to appear instead of arresting you, if you comply with it.", hi: "7 साल तक की सज़ा वाले अपराधों में, पुलिस को आम तौर पर गिरफ़्तार करने के बजाय हाज़िर होने का नोटिस भेजना चाहिए, अगर आप उसका पालन करते हैं।", cite: ["bnss", "35"] },
      { en: "A woman should not be arrested after sunset or before sunrise except in exceptional cases, with a Magistrate's prior permission. A woman can be searched only by a woman.", hi: "किसी महिला को सूर्यास्त के बाद या सूर्योदय से पहले, असाधारण मामलों को छोड़कर और मजिस्ट्रेट की पूर्व अनुमति के बिना, गिरफ़्तार नहीं किया जाना चाहिए। महिला की तलाशी सिर्फ़ महिला ही ले सकती है।", cite: ["bnss", "43"] },
      { en: "You can ask for a medical examination by a doctor, and the police must arrange it.", hi: "आप डॉक्टर से मेडिकल जाँच की माँग कर सकते हैं, और पुलिस को उसकी व्यवस्था करनी होगी।", cite: ["bnss", "53"] },
      { en: "You cannot be forced to be a witness against yourself.", hi: "आपको अपने ही ख़िलाफ़ गवाह बनने के लिए मजबूर नहीं किया जा सकता।", cite: ["constitution-of-india", "20"] },
    ],
    help: { en: "Can't afford a lawyer? Anyone in custody gets free legal aid. Ask the Magistrate, or call the NALSA helpline 15100.", hi: "वकील का ख़र्च नहीं उठा सकते? हिरासत में हर व्यक्ति को मुफ़्त क़ानूनी सहायता मिलती है। मजिस्ट्रेट से कहें, या NALSA हेल्पलाइन 15100 पर कॉल करें।" },
  },
  {
    slug: "fir",
    title: { en: "Filing an FIR", hi: "FIR दर्ज कराना" },
    lede: {
      en: "For a cognizable offence (theft, assault, cheating and the like), the police must record your complaint. Here is how, and what to do if they refuse.",
      hi: "संज्ञेय अपराध (चोरी, मारपीट, धोखाधड़ी आदि) में पुलिस को आपकी शिकायत दर्ज करनी ही होती है। जानिए कैसे, और अगर वे मना करें तो क्या करें।",
    },
    points: [
      { en: "You can report at any police station, wherever the offence happened (a \"zero FIR\"). It is then sent to the right station.", hi: "आप किसी भी थाने में रिपोर्ट कर सकते हैं, चाहे अपराध कहीं भी हुआ हो (\"ज़ीरो FIR\")। फिर उसे सही थाने भेजा जाता है।", cite: ["bnss", "173"] },
      { en: "You can give the information orally or electronically. An electronic report must be signed by you within three days to be taken on record.", hi: "आप जानकारी मौखिक रूप से या इलेक्ट्रॉनिक तरीक़े से दे सकते हैं। इलेक्ट्रॉनिक रिपोर्ट को रिकॉर्ड पर लेने के लिए तीन दिन के भीतर आपके हस्ताक्षर ज़रूरी हैं।", cite: ["bnss", "173"] },
      { en: "You get a copy of the FIR free of cost. Read it before you sign.", hi: "आपको FIR की कॉपी मुफ़्त मिलती है। हस्ताक्षर करने से पहले उसे पढ़ लें।", cite: ["bnss", "173"] },
      { en: "If the station refuses, send the complaint in writing by post to the Superintendent of Police.", hi: "अगर थाना मना करे, तो शिकायत लिखकर डाक से पुलिस अधीक्षक (SP) को भेजें।", cite: ["bnss", "173"] },
      { en: "If that fails too, you can apply to the Magistrate, who can order the police to investigate.", hi: "अगर इससे भी काम न बने, तो आप मजिस्ट्रेट को अर्ज़ी दे सकते हैं, जो पुलिस को जाँच का आदेश दे सकते हैं।", cite: ["bnss", "175"] },
      { en: "For offences punishable with 3 to 7 years, the police may first make a preliminary enquiry of up to 14 days before registering.", hi: "3 से 7 साल की सज़ा वाले अपराधों में, पुलिस दर्ज करने से पहले 14 दिन तक की प्रारंभिक जाँच कर सकती है।", cite: ["bnss", "173"] },
    ],
    help: { en: "Emergency: dial 112. Cyber fraud: call 1930 or report at cybercrime.gov.in as soon as possible.", hi: "आपात स्थिति: 112 डायल करें। साइबर धोखाधड़ी: जितनी जल्दी हो सके 1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट करें।" },
  },
  {
    slug: "bail",
    title: { en: "Bail, in plain words", hi: "ज़मानत, आसान शब्दों में" },
    lede: {
      en: "Bail lets you stay free while the case goes on. Whether it is a right or the court's choice depends on the offence.",
      hi: "ज़मानत से मुक़दमा चलने तक आप आज़ाद रह सकते हैं। यह अधिकार है या अदालत का विवेक, यह अपराध पर निर्भर करता है।",
    },
    points: [
      { en: "For a bailable offence, bail is your right. The police or court must release you once you give bail or a bond.", hi: "ज़मानती अपराध में ज़मानत आपका अधिकार है। ज़मानत या बॉन्ड देने पर पुलिस या अदालत को आपको छोड़ना होगा।", cite: ["bnss", "478"] },
      { en: "For a non-bailable offence, the court decides, looking at the offence, the evidence and whether you might flee or tamper.", hi: "ग़ैर-ज़मानती अपराध में अदालत तय करती है, अपराध, सबूत और आपके भागने या सबूत से छेड़छाड़ की आशंका को देखकर।", cite: ["bnss", "480"] },
      { en: "If you fear arrest, you can ask the Sessions Court or High Court for anticipatory bail.", hi: "अगर आपको गिरफ़्तारी का डर है, तो आप सेशन कोर्ट या हाई कोर्ट से अग्रिम ज़मानत माँग सकते हैं।", cite: ["bnss", "482"] },
      { en: "If the police do not file the chargesheet within 60 or 90 days (depending on the offence), you can claim \"default\" bail.", hi: "अगर पुलिस 60 या 90 दिन (अपराध के अनुसार) में चार्जशीट दाख़िल न करे, तो आप \"डिफ़ॉल्ट\" ज़मानत माँग सकते हैं।", cite: ["bnss", "187"] },
      { en: "An undertrial who has spent half the maximum sentence in jail must be released on bond; a first-time offender, after one-third. Not for offences punishable with death or life imprisonment.", hi: "जिस विचाराधीन क़ैदी ने अधिकतम सज़ा का आधा समय जेल में काट लिया हो, उसे बॉन्ड पर छोड़ना होगा; पहली बार के अपराधी को एक-तिहाई के बाद। मृत्युदंड या आजीवन कारावास वाले अपराधों पर यह लागू नहीं।", cite: ["bnss", "479"] },
    ],
    help: { en: "Bail is the rule and jail the exception, the Supreme Court has said many times. Free legal aid covers bail applications too: call 15100.", hi: "सुप्रीम कोर्ट कई बार कह चुका है कि ज़मानत नियम है और जेल अपवाद। मुफ़्त क़ानूनी सहायता ज़मानत अर्ज़ी में भी मिलती है: 15100 पर कॉल करें।" },
  },
  {
    slug: "consumer",
    title: { en: "Consumer complaints", hi: "उपभोक्ता शिकायत" },
    lede: {
      en: "A faulty product, a service not given, an unfair charge: you can take it to a Consumer Commission yourself, without a lawyer.",
      hi: "ख़राब सामान, सेवा न मिलना, ग़लत शुल्क: आप बिना वकील के ख़ुद उपभोक्ता आयोग में शिकायत कर सकते हैं।",
    },
    points: [
      { en: "File in the District Commission for claims up to ₹50 lakh (the limit set in 2021). Bigger claims go to the State or National Commission.", hi: "₹50 लाख तक के दावे ज़िला आयोग में दाख़िल करें (2021 में तय सीमा)। बड़े दावे राज्य या राष्ट्रीय आयोग में जाते हैं।", cite: ["consumer-protection-act", "34"] },
      { en: "You can file where you live or work, not only where the seller is.", hi: "आप वहाँ भी शिकायत कर सकते हैं जहाँ आप रहते या काम करते हैं, सिर्फ़ विक्रेता की जगह पर नहीं।", cite: ["consumer-protection-act", "34"] },
      { en: "You can file online, on the e-Daakhil portal.", hi: "आप ऑनलाइन, e-Daakhil पोर्टल पर शिकायत कर सकते हैं।", cite: ["consumer-protection-act", "35"] },
      { en: "File within two years of the problem arising.", hi: "समस्या शुरू होने के दो साल के भीतर शिकायत करें।", cite: ["consumer-protection-act", "69"] },
      { en: "The Commission can order a replacement, a refund, compensation and costs.", hi: "आयोग सामान बदलने, पैसे लौटाने, मुआवज़े और ख़र्च का आदेश दे सकता है।", cite: ["consumer-protection-act", "39"] },
    ],
    help: { en: "Try the National Consumer Helpline first: call 1915. Nyaya has a free consumer complaint template.", hi: "पहले राष्ट्रीय उपभोक्ता हेल्पलाइन आज़माएँ: 1915 पर कॉल करें। Nyaya पर उपभोक्ता शिकायत का मुफ़्त टेम्पलेट है।" },
    template: "consumer-complaint",
  },
  {
    slug: "tenant",
    title: { en: "Renting a home", hi: "किराये का घर" },
    lede: {
      en: "Rent law is mostly state law, so details vary. These points hold across India.",
      hi: "किराये का क़ानून ज़्यादातर राज्य का क़ानून है, इसलिए विवरण अलग-अलग होते हैं। ये बातें पूरे भारत में लागू होती हैं।",
    },
    points: [
      { en: "A lease for a year or more must be in writing and registered. That is why many agreements are for 11 months.", hi: "एक साल या उससे ज़्यादा की लीज़ लिखित और रजिस्टर्ड होनी चाहिए। इसी वजह से कई एग्रीमेंट 11 महीने के होते हैं।", cite: ["tp-act", "107"] },
      { en: "Without a written term, a monthly tenancy ends with 15 days' notice.", hi: "लिखित अवधि न हो तो मासिक किरायेदारी 15 दिन के नोटिस से ख़त्म होती है।", cite: ["tp-act", "106"] },
      { en: "A landlord must go through the court or rent authority to evict you. Changing locks, removing your things or cutting water and power is not the lawful route.", hi: "बेदख़ली के लिए मकान मालिक को अदालत या किराया प्राधिकरण से होकर जाना होगा। ताले बदलना, सामान हटाना या पानी-बिजली काटना क़ानूनी तरीक़ा नहीं है।", cite: null },
      { en: "Get a receipt for every rent payment and for the security deposit.", hi: "हर किराये के भुगतान और सिक्योरिटी डिपॉज़िट की रसीद लें।", cite: null },
      { en: "The tenant must pay rent on time, keep the property in reasonable shape, and not sublet without permission.", hi: "किरायेदार को समय पर किराया देना, संपत्ति को ठीक हालत में रखना, और बिना अनुमति आगे किराये पर न देना होता है।", cite: ["tp-act", "108"] },
    ],
    help: { en: "Your state's rent control law decides the rest. Ask Nyaya with your state's name for the exact rules.", hi: "बाक़ी नियम आपके राज्य का किराया नियंत्रण क़ानून तय करता है। सही नियमों के लिए Nyaya से अपने राज्य के नाम के साथ पूछें।" },
    template: "rent-agreement",
  },
  {
    slug: "domestic-violence",
    title: { en: "Domestic violence", hi: "घरेलू हिंसा" },
    lede: {
      en: "Abuse at home is not only physical. The law protects women against physical, sexual, verbal, emotional and economic abuse.",
      hi: "घर में हिंसा सिर्फ़ शारीरिक नहीं होती। क़ानून महिलाओं को शारीरिक, यौन, मौखिक, भावनात्मक और आर्थिक शोषण से बचाता है।",
    },
    points: [
      { en: "Cruelty by a husband or his relatives, including harassment for dowry, is a crime.", hi: "पति या उसके रिश्तेदारों द्वारा क्रूरता, दहेज के लिए उत्पीड़न सहित, अपराध है।", cite: ["bns", "85"] },
      { en: "Under the Domestic Violence Act, you can ask a Magistrate for a protection order, a residence order, money for expenses and custody of children.", hi: "घरेलू हिंसा अधिनियम के तहत आप मजिस्ट्रेट से सुरक्षा आदेश, निवास आदेश, ख़र्च के लिए पैसा और बच्चों की कस्टडी माँग सकती हैं।", cite: null },
      { en: "You have a right to live in the shared household, whether or not you own it.", hi: "आपको साझा घर में रहने का अधिकार है, चाहे वह आपके नाम हो या न हो।", cite: null },
      { en: "A Protection Officer in your district can help you file and find shelter, medical help and legal aid.", hi: "आपके ज़िले के संरक्षण अधिकारी शिकायत दर्ज करने, आश्रय, चिकित्सा सहायता और क़ानूनी सहायता दिलाने में मदद कर सकते हैं।", cite: null },
      { en: "A death of a woman within seven years of marriage, after dowry harassment, is treated as dowry death.", hi: "शादी के सात साल के भीतर, दहेज उत्पीड़न के बाद महिला की मृत्यु को दहेज मृत्यु माना जाता है।", cite: ["bns", "80"] },
    ],
    help: { en: "In danger now: call 112. Women's helpline: 181. Free legal aid: 15100.", hi: "अभी ख़तरे में हैं: 112 पर कॉल करें। महिला हेल्पलाइन: 181। मुफ़्त क़ानूनी सहायता: 15100।" },
  },
  {
    slug: "cheque-bounce",
    title: { en: "When a cheque bounces", hi: "जब चेक बाउंस हो" },
    lede: {
      en: "A bounced cheque for a debt is a criminal offence, but the deadlines are strict. Miss one and the case can fail.",
      hi: "किसी क़र्ज़ के लिए दिया गया चेक बाउंस होना अपराध है, पर समय-सीमाएँ सख़्त हैं। एक भी चूकी तो केस गिर सकता है।",
    },
    points: [
      { en: "Send a written demand notice to the person who gave the cheque within 30 days of the bank's return memo.", hi: "बैंक का रिटर्न मेमो मिलने के 30 दिन के भीतर चेक देने वाले को लिखित माँग नोटिस भेजें।", cite: ["ni-act", "138"] },
      { en: "They then have 15 days from receiving the notice to pay.", hi: "नोटिस मिलने के बाद उनके पास भुगतान के लिए 15 दिन होते हैं।", cite: ["ni-act", "138"] },
      { en: "If they don't pay, file a complaint before the Magistrate within one month after those 15 days end.", hi: "अगर वे भुगतान न करें, तो उन 15 दिनों के ख़त्म होने के एक महीने के भीतर मजिस्ट्रेट के सामने शिकायत दाख़िल करें।", cite: ["ni-act", "142"] },
      { en: "The punishment can be up to two years in jail, or a fine up to twice the cheque amount, or both.", hi: "सज़ा दो साल तक की जेल, या चेक की रक़म के दोगुने तक जुर्माना, या दोनों हो सकती है।", cite: ["ni-act", "138"] },
      { en: "The court can order the drawer to pay up to 20% of the amount as interim compensation while the case runs.", hi: "मुक़दमा चलने के दौरान अदालत चेक देने वाले को रक़म का 20% तक अंतरिम मुआवज़ा देने का आदेश दे सकती है।", cite: ["ni-act", "143A"] },
    ],
    help: { en: "Nyaya has a free cheque-bounce notice template. Keep the cheque, the return memo and proof of posting.", hi: "Nyaya पर चेक बाउंस नोटिस का मुफ़्त टेम्पलेट है। चेक, रिटर्न मेमो और भेजने का सबूत संभालकर रखें।" },
    template: "cheque-bounce-notice",
  },
  {
    slug: "workplace-harassment",
    title: { en: "Sexual harassment at work", hi: "कार्यस्थल पर यौन उत्पीड़न" },
    lede: {
      en: "Every workplace with ten or more employees must have an Internal Committee to hear complaints. Smaller ones are covered by a Local Committee.",
      hi: "दस या उससे ज़्यादा कर्मचारियों वाले हर कार्यस्थल पर शिकायत सुनने के लिए आंतरिक समिति होनी चाहिए। छोटे कार्यस्थलों के लिए स्थानीय समिति होती है।",
    },
    points: [
      { en: "Complain in writing to the Internal Committee within three months of the incident (or the last one). The Committee can extend this by three months.", hi: "घटना (या आख़िरी घटना) के तीन महीने के भीतर आंतरिक समिति को लिखित शिकायत करें। समिति इसे तीन महीने और बढ़ा सकती है।", cite: null },
      { en: "If there is no Internal Committee, or the complaint is against the employer, go to the Local Committee set up by the District Officer.", hi: "अगर आंतरिक समिति नहीं है, या शिकायत नियोक्ता के ख़िलाफ़ है, तो ज़िला अधिकारी की बनाई स्थानीय समिति के पास जाएँ।", cite: null },
      { en: "The inquiry must finish within 90 days. While it runs, you can ask for a transfer or leave.", hi: "जाँच 90 दिन में पूरी होनी चाहिए। जाँच के दौरान आप तबादले या छुट्टी की माँग कर सकती हैं।", cite: null },
      { en: "Your identity and the details of the complaint must be kept confidential.", hi: "आपकी पहचान और शिकायत का विवरण गोपनीय रखना ज़रूरी है।", cite: null },
      { en: "You can also report criminal conduct to the police separately.", hi: "आप आपराधिक व्यवहार की पुलिस में अलग से भी रिपोर्ट कर सकती हैं।", cite: ["bns", "75"] },
    ],
    help: { en: "This comes from the Sexual Harassment of Women at Workplace Act, 2013. Complaints can also be filed on the SHe-Box portal.", hi: "यह कार्यस्थल पर महिलाओं का यौन उत्पीड़न अधिनियम, 2013 से है। शिकायत SHe-Box पोर्टल पर भी दर्ज की जा सकती है।" },
  },
  {
    slug: "free-legal-aid",
    title: { en: "Free legal aid", hi: "मुफ़्त क़ानूनी सहायता" },
    lede: {
      en: "The Constitution promises justice that doesn't depend on money. Legal Services Authorities give free lawyers and advice to many people.",
      hi: "संविधान ऐसा न्याय का वादा करता है जो पैसे पर निर्भर न हो। विधिक सेवा प्राधिकरण बहुत से लोगों को मुफ़्त वकील और सलाह देते हैं।",
    },
    points: [
      { en: "The State must make sure no one is denied justice for lack of money, and provide free legal aid.", hi: "राज्य को यह सुनिश्चित करना है कि पैसे की कमी के कारण किसी को न्याय से वंचित न किया जाए, और मुफ़्त क़ानूनी सहायता दे।", cite: ["constitution-of-india", "39A"] },
      { en: "Women, children, Scheduled Castes and Tribes, people with disabilities, industrial workers, disaster victims and anyone in custody qualify, whatever their income.", hi: "महिलाएँ, बच्चे, अनुसूचित जाति और जनजाति, दिव्यांगजन, औद्योगिक कामगार, आपदा पीड़ित और हिरासत में कोई भी व्यक्ति, आय कुछ भी हो, पात्र हैं।", cite: null },
      { en: "Others qualify if their income is below the limit their state sets.", hi: "बाक़ी लोग पात्र हैं अगर उनकी आय राज्य की तय सीमा से कम है।", cite: null },
      { en: "Apply at the District Legal Services Authority (in the district court), or online on the NALSA portal.", hi: "ज़िला विधिक सेवा प्राधिकरण (ज़िला अदालत में) में, या NALSA पोर्टल पर ऑनलाइन आवेदन करें।", cite: null },
      { en: "Lok Adalats settle many disputes for free, and their awards are final.", hi: "लोक अदालतें कई विवाद मुफ़्त में सुलझाती हैं, और उनके फ़ैसले अंतिम होते हैं।", cite: null },
    ],
    help: { en: "NALSA helpline: 15100. This comes from the Legal Services Authorities Act, 1987.", hi: "NALSA हेल्पलाइन: 15100। यह विधिक सेवा प्राधिकरण अधिनियम, 1987 से है।" },
  },
];

export const findGuide = (slug) => RIGHTS.find((g) => g.slug === slug);
