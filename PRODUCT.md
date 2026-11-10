# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone who meets Indian law, served by one versatile site:
- Law students: moot court prep, assignments, exam revision, learning landmark cases.
- Practising lawyers: fast, citable research during real work.
- The general public: a plain-language answer to a legal question, with "Explain Simply" mode.
- Recruiters and professors: Nyaya is also the author's final-year project and portfolio piece.

## Product Purpose

Ask a legal question in plain English and get a structured, cited answer written by Claude, grounded only in retrieved text from real Indian judgments and statutes (semantic retrieval + cross-encoder re-ranking over Qdrant). Success: a first-time visitor is wowed in the first seconds, then asks a question and trusts the answer because every claim links to a real judgment.

## Positioning

Not a keyword search engine and not a chatbot that guesses: every answer is assembled from retrieved judgment text and shows its sources. Free, no login needed to search.

## Operating Context

- Corpus: Supreme Court of India judgments, one year of Bombay High Court judgments (2023), selected central Acts from India Code. Coverage is partial and the site must not claim otherwise.
- Answers stream in token by token; sources arrive first.
- A weekly Cloud Run job indexes new Supreme Court judgments and emails a "This Week in the Supreme Court" digest.

## Capabilities and Constraints

Features that must all survive a redesign:
- Ask (with Year / Court / Type filters, Standard vs Explain Simply), streamed answer, sources with Copy Citation, Related Cases, Save to favorites, Copy answer, Export to Word, Useful? feedback.
- Case search by name; Compare Cases (two judgments side by side); Argument Builder (structured arguments from case law); Statute Browser; On This Day.
- Accounts via Firebase (Google or email): My Desk with history and favorites.
- Games: Trivia, Latin Match, Verdict, with streaks and a leaderboard. Newsletter signup.
- Frontend: React 19 + Vite + React Router, deployed on Vercel. Backend: FastAPI on Cloud Run (may be extended when the frontend needs it).

## Brand Commitments

- Name: Nyaya (Sanskrit: justice / reasoning). Domain asknyaya.in.
- The previous "tiny legal gazette" newspaper identity is retired by the owner's decision (2026-11-11); only the name and the features carry over.

## Evidence on Hand

- Real corpus counts, citations and judgment text come from the backend; no testimonials, user counts, accuracy figures or press exist. Do not invent them.
- Not legal advice: the site is an educational research tool and must say so.

## Product Principles

1. Wow first, then usefulness within one scroll: spectacle must never block asking a question.
2. Every answer shows its receipts: sources are as prominent as the answer.
3. One site, three registers: playful for the curious, precise for professionals, plain for the public.
4. Honest about coverage and limits.

## Accessibility & Inclusion

WCAG AA: keyboard access, visible focus, labelled controls, reduced-motion alternatives for every animation, readable sizes on mobile.
