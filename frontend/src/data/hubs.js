// Topic hubs: everything Nyaya has on one everyday problem, on one page.
// Links point at existing guides (data/rights.js, data/guides.js), templates and
// deadline calculators; "questions" open Ask Nyaya with the question filled in.

export const HUBS = [
  {
    slug: "tenant",
    title: { en: "Tenants and landlords", hi: "किराएदार और मकान मालिक" },
    lede: { en: "Deposits, rent, repairs, notice and eviction: your rights as a tenant, and what to do when they're ignored.", hi: "डिपॉज़िट, किराया, मरम्मत, नोटिस और बेदख़ली: किराएदार के तौर पर आपके अधिकार, और उनकी अनदेखी हो तो क्या करें।" },
    now: ["landlord", "legal-notice"],
    rights: ["tenant"],
    templates: ["rent-agreement", "deposit-refund-notice"],
    deadlines: ["tenancy", "money"],
    helplines: ["112", "15100"],
    questions: {
      en: ["Can my landlord keep my security deposit for normal wear and tear?", "Can the landlord cut my electricity or water to make me leave?", "How much notice does a landlord have to give to end a monthly tenancy?", "Is an unregistered rent agreement valid?"],
      hi: ["क्या मकान मालिक सामान्य टूट-फूट के लिए मेरा सिक्योरिटी डिपॉज़िट रख सकता है?", "क्या मकान ख़ाली कराने के लिए मालिक बिजली या पानी काट सकता है?", "मासिक किराएदारी ख़त्म करने के लिए मकान मालिक को कितना नोटिस देना होता है?", "क्या बिना रजिस्ट्री का किराया अनुबंध मान्य है?"],
    },
  },
  {
    slug: "consumer",
    title: { en: "Consumer problems", hi: "उपभोक्ता समस्याएँ" },
    lede: { en: "Defective products, refused refunds, poor service, hidden charges. How to complain, and where, for free or close to it.", hi: "ख़राब सामान, रिफ़ंड से इनकार, ख़राब सेवा, छिपे शुल्क। शिकायत कैसे और कहाँ करें, मुफ़्त या लगभग मुफ़्त।" },
    now: ["consumer", "cyber-fraud"],
    rights: ["consumer"],
    templates: ["consumer-complaint"],
    deadlines: ["consumer"],
    helplines: ["1915", "1930"],
    questions: {
      en: ["Is a 'no refund, no exchange' sign legal?", "The airline cancelled my flight. What am I owed?", "Can I file a consumer complaint online without a lawyer?", "My new phone stopped working within warranty and the service centre refuses to repair it."],
      hi: ["क्या 'बिका माल वापस नहीं होगा' लिखना क़ानूनी है?", "एयरलाइन ने मेरी फ़्लाइट रद्द कर दी। मुझे क्या मिलना चाहिए?", "क्या मैं बिना वकील ऑनलाइन उपभोक्ता शिकायत कर सकता हूँ?", "नया फ़ोन वारंटी में ख़राब हुआ और सर्विस सेंटर मरम्मत से मना कर रहा है।"],
    },
  },
  {
    slug: "rti",
    title: { en: "Right to Information (RTI)", hi: "सूचना का अधिकार (RTI)" },
    lede: { en: "Get records from any government office: file status, notings, spending, decisions. Rs 10, 30 days, and two appeals if they don't answer.", hi: "किसी भी सरकारी दफ़्तर से रिकॉर्ड पाएँ: फ़ाइल की स्थिति, नोटिंग, ख़र्च, फ़ैसले। Rs 10, 30 दिन, और जवाब न मिले तो दो अपील।" },
    now: [],
    rights: [],
    templates: ["rti-application", "rti-first-appeal"],
    deadlines: ["rti"],
    helplines: [],
    tips: {
      en: ["Ask for records (copies, file notings, status), not explanations or opinions.", "File central government RTIs online at rtionline.gov.in; most states have their own portal.", "People below the poverty line pay no fee: attach a copy of the BPL card.", "Keep the receipt or acknowledgement: your appeal dates count from it."],
      hi: ["रिकॉर्ड माँगें (कॉपी, फ़ाइल नोटिंग, स्थिति), सफ़ाई या राय नहीं।", "केंद्र सरकार की RTI rtionline.gov.in पर ऑनलाइन दें; ज़्यादातर राज्यों का अपना पोर्टल है।", "गरीबी रेखा से नीचे (BPL) के लोगों को फ़ीस नहीं देनी होती: BPL कार्ड की कॉपी लगाएँ।", "रसीद या पावती रखें: अपील की तारीख़ें उसी से गिनी जाती हैं।"],
    },
    questions: {
      en: ["What information can't be asked for under RTI?", "My RTI got no reply in 30 days. What do I do?", "Can I file an RTI to a private company or bank?", "How do I find out the status of my pension or passport file through RTI?"],
      hi: ["RTI में कौन-सी जानकारी नहीं माँगी जा सकती?", "30 दिन में RTI का जवाब नहीं आया। अब क्या करूँ?", "क्या किसी प्राइवेट कंपनी या बैंक को RTI दे सकते हैं?", "RTI से अपनी पेंशन या पासपोर्ट फ़ाइल की स्थिति कैसे पता करूँ?"],
    },
  },
  {
    slug: "women",
    title: { en: "Women's safety and rights", hi: "महिलाओं की सुरक्षा और अधिकार" },
    lede: { en: "Domestic violence, harassment at work or online, dowry, maintenance. Where to get protection fast, and the law that backs you.", hi: "घरेलू हिंसा, काम पर या ऑनलाइन उत्पीड़न, दहेज, गुज़ारा भत्ता। जल्दी सुरक्षा कहाँ मिलेगी, और कौन-सा क़ानून आपके साथ है।" },
    now: ["domestic-violence", "fir-refused", "cyber-fraud"],
    rights: ["domestic-violence", "workplace-harassment", "fir", "free-legal-aid"],
    templates: ["legal-aid-application"],
    deadlines: [],
    helplines: ["112", "181", "15100", "14416"],
    questions: {
      en: ["How do I get a protection order under the Domestic Violence Act?", "My husband's family is demanding dowry. What can I do?", "Someone is sharing my photos online without consent.", "Can I claim maintenance from my husband if I'm working?"],
      hi: ["घरेलू हिंसा क़ानून के तहत सुरक्षा आदेश कैसे लें?", "ससुराल वाले दहेज माँग रहे हैं। मैं क्या कर सकती हूँ?", "कोई मेरी फ़ोटो बिना इजाज़त ऑनलाइन फैला रहा है।", "अगर मैं नौकरी करती हूँ तो क्या पति से गुज़ारा भत्ता माँग सकती हूँ?"],
    },
  },
];

export const findHub = (slug) => HUBS.find((h) => h.slug === slug);
