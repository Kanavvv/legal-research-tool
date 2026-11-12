import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext";
import { signInWithGoogle, signInErrorMessage } from "../firebase";
import Chrome from "../ui/Chrome";
import NotFound from "./NotFound";
import Feed from "./admin/Feed";
import Features from "./admin/Features";
import Ideas from "./admin/Ideas";
import LinkPhone from "./admin/LinkPhone";
import SystemMap from "./admin/Map";
import Money from "./admin/Money";
import { ALL_SECTIONS, SECTIONS } from "./admin/nav";
import { PREVIEW, api, post } from "./admin/shared";
import { Errors, Feedback, Issues, Lawyers, Overview, Questions, Settings, Users, WhatsApp } from "./admin/Tabs";
import "./admin.css";

// The owner's control room. To everyone else /admin is an ordinary "not found" page: it only
// opens for a Google account listed in ADMIN_EMAILS (checked by the server on every request),
// or shows a sign-in screen to someone holding a fresh one-time key from the WhatsApp bot.

function WhatsAppView(p) {
  return <><LinkPhone /><WhatsApp {...p} /></>;
}

const VIEWS = {
  overview: Overview, live: Feed, money: Money, features: Features, ideas: Ideas, map: SystemMap,
  questions: Questions, feedback: Feedback, users: Users, lawyers: Lawyers, whatsapp: WhatsAppView,
  issues: Issues, errors: Errors, settings: Settings,
};

const ICONS = {
  overview: "M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z",
  live: "M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  money: "M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11.5s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5",
  features: "M4 7h10M18 7h2M4 17h2M10 17h10M14 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ideas: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
  map: "M5 5h5v5H5zM14 5h5v5h-5zM9.5 14h5v5h-5zM7.5 10v2h9v-2M12 12v2",
  questions: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2V14M12 17.5h.01",
  feedback: "M7 10v10H4V10zM7 10l4-7c1.1 0 2 .9 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8",
  whatsapp: "M4 20l1.3-3.9A8 8 0 1 1 8 18.7z",
  lawyers: "M12 3v18M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0zM8 21h8",
  issues: "M12 3l9.5 17h-19zM12 10v4M12 17.5h.01",
  errors: "M8 3h8l5 5v8l-5 5H8l-5-5V8zM12 8v5M12 16h.01",
  settings: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
};

function Icon({ name }) {
  return (
    <svg className="cr-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.overview} />
    </svg>
  );
}

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true" className="cr-mark">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 23V9l12 14V9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

/* ---------- the sign-in screen someone with a WhatsApp key sees ---------- */
function Gate({ user, signOutUser }) {
  const [error, setError] = useState("");
  useEffect(() => { document.title = "Sign in · Nyaya"; }, []);
  async function signIn() {
    setError("");
    try { await signInWithGoogle(); } catch (e) { setError(signInErrorMessage(e)); }
  }
  return (
    <div className="cr cr-gate">
      <main className="cr-gate-box">
        <div className="cr-brand"><Mark /><span>NYAYA<em>control</em></span></div>
        {user ? (
          <>
            <h1>Not this account.</h1>
            <p className="cr-muted">{user.email} isn't an admin. Sign in with the admin Google account.</p>
            <button type="button" className="cr-btn cr-btn--primary" onClick={signOutUser}>Sign out and switch account</button>
          </>
        ) : (
          <>
            <h1>Sign in to the control room.</h1>
            <p className="cr-muted">Your WhatsApp link checks out. Now sign in with the admin Google account.</p>
            <button type="button" className="cr-btn cr-btn--primary" onClick={signIn}>Sign in with Google</button>
          </>
        )}
        {error && <p className="adm-error" role="alert">{error}</p>}
      </main>
    </div>
  );
}

/* ---------- ⌘K ---------- */
function Palette({ onClose, go, signOutUser }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef(null);
  const commands = useMemo(() => [
    ...ALL_SECTIONS.map((s) => ({ id: s.key, label: `Go to ${s.name}`, hint: s.about, run: () => go(s.key) })),
    { id: "a-idea", label: "Add an idea", hint: "Ideas board", run: () => go("ideas") },
    { id: "a-pause", label: "Pause a tool", hint: "Features", run: () => go("features") },
    { id: "a-phone", label: "Link my phone to WhatsApp", hint: "WhatsApp", run: () => go("whatsapp") },
    { id: "a-banner", label: "Show a banner on the site", hint: "Settings", run: () => go("settings") },
    { id: "a-budget", label: "Change the daily budget", hint: "Settings", run: () => go("settings") },
    { id: "a-site", label: "Open the website", hint: "asknyaya.in in a new tab", run: () => window.open("/", "_blank", "noopener") },
    { id: "a-out", label: "Sign out", hint: "", run: signOutUser },
  ], [go, signOutUser]);
  const shown = commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q.trim().toLowerCase()));
  useEffect(() => { input.current?.focus(); }, []);
  const run = (c) => { onClose(); c.run(); };
  return (
    <div className="cr-palette-back" onMouseDown={onClose}>
      <div className="cr-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <input ref={input} value={q} placeholder="Type a command or a section…" aria-label="Search commands"
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, shown.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            else if (e.key === "Enter" && shown[i]) run(shown[i]);
          }} />
        <ul role="listbox" aria-label="Commands">
          {shown.map((c, n) => (
            <li key={c.id} role="option" aria-selected={n === i} onMouseEnter={() => setI(n)} onClick={() => run(c)}>
              <span>{c.label}</span><span className="cr-muted">{c.hint}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="cr-muted">No matches.</li>}
        </ul>
        <p className="cr-palette-foot cr-muted"><kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close</p>
      </div>
    </div>
  );
}

/* ---------- the console ---------- */
function Console({ email, signOutUser }) {
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.slice(1);
    return VIEWS[h] ? h : "overview";
  });
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [health, setHealth] = useState(null);
  const [boot, setBoot] = useState(() => {
    try { return !sessionStorage.getItem("nyaya-cr-boot") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  });
  const clock = useClock();
  const go = useMemo(() => (t) => {
    setTab(t); setMenu(false);
    window.history.replaceState(null, "", `/admin#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    document.title = "Control room · Nyaya";
    const onHash = () => { const h = window.location.hash.slice(1); if (VIEWS[h]) setTab(h); };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    let live = true;
    const load = () => api("/admin/health").then((d) => live && setHealth(d)).catch(() => live && setHealth({ error: true }));
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, []);
  useEffect(() => {
    if (!boot) return undefined;
    const t = setTimeout(() => { setBoot(false); try { sessionStorage.setItem("nyaya-cr-boot", "1"); } catch { /* storage off */ } }, 1600);
    return () => clearTimeout(t);
  }, [boot]);

  const issues = (health?.issues || []).filter((x) => x.severity === "high" || x.severity === "medium");
  const failing = (health?.checks || []).filter((c) => c.status !== "ok").length;
  const count = issues.length || failing;
  const statusTone = !health ? "wait" : health.error || issues.some((x) => x.severity === "high") ? "bad" : count ? "warn" : "ok";
  const statusText = !health ? "Checking services…" : health.error ? "Couldn't check services"
    : statusTone === "ok" ? "All systems normal" : `${count} thing${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} a look`;
  const section = ALL_SECTIONS.find((s) => s.key === tab);
  const View = VIEWS[tab];

  return (
    <div className="cr">
      {boot && (
        <div className="cr-boot" aria-hidden="true">
          <div className="cr-boot-lines">
            <p className="cr-boot-brand"><Mark /> NYAYA CONTROL</p>
            <p>› connecting to asknyaya.in</p>
            <p>› checking 8 services</p>
            <p>› signed in as {email}</p>
            <p className="cr-boot-ok">› ready</p>
          </div>
        </div>
      )}
      <aside className={`cr-side${menu ? " cr-side--open" : ""}`} aria-label="Control room">
        <div className="cr-brand"><Mark /><span>NYAYA<em>control</em></span></div>
        <button type="button" className={`cr-sys cr-sys--${statusTone}`} onClick={() => go("issues")}>
          <span className="cr-light" aria-hidden="true" />{statusText}
        </button>
        <nav aria-label="Sections">
          {SECTIONS.map((g) => (
            <div key={g.group} className="cr-nav-group">
              <p className="cr-nav-head">{g.group}</p>
              {g.items.map((s) => (
                <button key={s.key} type="button" className="cr-nav-item" aria-current={tab === s.key ? "page" : undefined} onClick={() => go(s.key)}>
                  <Icon name={s.key} /><span>{s.name}</span>
                  {s.key === "issues" && issues.length > 0 && <span className="cr-badge">{issues.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="cr-side-foot">
          <p className="cr-muted cr-email" title={email}>{email}</p>
          <div className="cr-side-links">
            <a href="/" target="_blank" rel="noreferrer">Website ↗</a>
            <button type="button" className="adm-link" onClick={signOutUser}>Sign out</button>
          </div>
        </div>
      </aside>
      {menu && <div className="cr-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
      <div className="cr-main">
        <header className="cr-top">
          <button type="button" className="cr-menu" aria-label="Open sections" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="cr-title">
            <h1>{section?.name}</h1>
            <p className="cr-muted">{section?.about}</p>
          </div>
          <div className="cr-top-right">
            <span className="cr-clock" title="India time">{clock} <small>IST</small></span>
            <button type="button" className="cr-btn cr-k" onClick={() => setPalette(true)}><span>Search</span><kbd>⌘K</kbd></button>
          </div>
        </header>
        <main id="main" className="adm cr-view" key={tab}>
          <View go={go} />
        </main>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} go={go} signOutUser={signOutUser} />}
    </div>
  );
}

export default function Admin() {
  const { user, loading, signOutUser } = useAuth();
  const [key, setKey] = useState(() => {
    if (new URLSearchParams(window.location.search).get("k")) return "checking";
    try { return sessionStorage.getItem("nyaya-cr-key") === "1" ? "ok" : "none"; } catch { return "none"; }
  });
  const [me, setMe] = useState({ uid: null, email: null });

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("k");
    if (!k) return;
    window.history.replaceState(null, "", `/admin${window.location.hash}`);  // keep the key out of history and screenshots
    post("/control/key", { k }).then((d) => {
      if (d.ok) { try { sessionStorage.setItem("nyaya-cr-key", "1"); } catch { /* storage off */ } }
      setKey(d.ok ? "ok" : "none");
    }).catch(() => setKey("none"));
  }, []);
  useEffect(() => {
    if (!user || PREVIEW) return undefined;
    let live = true;
    api("/admin/me").then((d) => live && setMe({ uid: user.uid, email: d.email })).catch(() => live && setMe({ uid: user.uid, email: "" }));
    return () => { live = false; };
  }, [user]);

  if (PREVIEW) return <Console email="preview@local" signOutUser={() => {}} />;
  const admin = !user ? false : me.uid === user.uid ? Boolean(me.email) : null;
  if (loading || key === "checking" || admin === null) return <div className="cr-blank" />;
  if (admin) return <Console email={me.email} signOutUser={signOutUser} />;
  if (key === "ok") return <Gate user={user} signOutUser={signOutUser} />;
  return <Chrome><NotFound /></Chrome>;
}
