// Every section of the control room, grouped, with a line on what it's for.
export const SECTIONS = [
  { group: "Pulse", items: [
    { key: "overview", name: "Overview", about: "The business at a glance: spend, revenue, people, questions and feedback." },
    { key: "live", name: "Live feed", about: "What's happening on Nyaya right now, as it happens. Refreshes every 15 seconds." },
    { key: "visitors", name: "Visitors", about: "Visits, pages, where people come from, and how much they share. Only visitors who allowed counting." },
    { key: "money", name: "Money", about: "Where every rupee of AI spend goes, what each answer costs, and where the month is heading." },
  ] },
  { group: "Product", items: [
    { key: "catalog", name: "Everything on the site", about: "Every feature Nyaya has, in plain words: what it does, who it's for, and whether it's running." },
    { key: "features", name: "Features", about: "Every tool on the site, how much it's used, what it costs, and a switch to pause it." },
    { key: "trending", name: "Trending page", about: "Choose the questions on asknyaya.in/trending, from what people asked most this week." },
    { key: "library", name: "Answer library", about: "Answer the questions people ask most and publish them as pages Google can find." },
    { key: "explainers", name: "News explainers", about: "Turn a legal headline into a plain explainer on /explained, drafted from the index, edited by you." },
    { key: "ideas", name: "Ideas board", about: "What to build next. Add ideas, move them along, and hand the list to Claude." },
    { key: "map", name: "How it works", about: "A live map of the services that run Nyaya. Tap any box to learn what it does." },
  ] },
  { group: "People", items: [
    { key: "questions", name: "Questions", about: "What people asked in the last 30 days, without who asked." },
    { key: "feedback", name: "Feedback", about: "Answers people marked unhelpful, with their reasons. Fix and clear them here." },
    { key: "users", name: "Users", about: "Accounts on Nyaya. Block one if it's abusing the site." },
    { key: "whatsapp", name: "WhatsApp", about: "The WhatsApp number, Law of the day, message failures, and your phone link." },
    { key: "lawyers", name: "Lawyers", about: "Advocates who asked to be listed. Approve or reject them." },
  ] },
  { group: "System", items: [
    { key: "issues", name: "Issues", about: "Health checks on every service, and problems with a fix for each." },
    { key: "errors", name: "Errors", about: "Server errors from the last day, straight from Cloud Logging." },
    { key: "settings", name: "Settings", about: "Live switches: daily budget, WhatsApp limits and pause, site banner." },
  ] },
];

export const ALL_SECTIONS = SECTIONS.flatMap((g) => g.items);
export const SECTION_NAMES = Object.fromEntries(ALL_SECTIONS.map((s) => [s.key, s.name]));
