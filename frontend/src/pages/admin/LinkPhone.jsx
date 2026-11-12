import { useEffect, useState } from "react";
import { WHATSAPP_URL } from "../../config";
import { api, post } from "./shared";

// Link the owner's phone to the WhatsApp bot, so texting "admin" brings today's numbers and
// a sign-in link. The number itself is never shown or stored in plain text.
export default function LinkPhone() {
  const [linked, setLinked] = useState(null);
  const [code, setCode] = useState(null);
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => { api("/admin/wa").then((d) => setLinked(d.linked)).catch(() => {}); }, []);
  useEffect(() => {
    if (!code) return undefined;
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { setCode(null); api("/admin/wa").then((d) => setLinked(d.linked)).catch(() => {}); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [code]);

  async function start() {
    setMsg("");
    try { const d = await post("/admin/wa/code"); setCode(d.code); setLeft(d.expires_in); } catch (e) { setMsg(e.message); }
  }
  async function unlink() {
    if (!window.confirm("Unlink every phone from the control room? You can link again any time.")) return;
    try { const d = await post("/admin/wa/unlink"); setLinked(d.linked); setMsg("Unlinked."); } catch (e) { setMsg(e.message); }
  }

  return (
    <section className="adm-card cr-link">
      <div className="adm-row-between">
        <h2>Your phone and the control room</h2>
        {linked != null && <span className={`cr-tag ${linked ? "cr-tag--ok" : "cr-tag--dim"}`}>{linked ? `${linked} phone linked` : "not linked"}</span>}
      </div>
      <p className="cr-muted">Once your phone is linked, text <strong>admin</strong> to the Nyaya WhatsApp number any time. It replies with today's numbers and a sign-in link for this page that works for 10 minutes. Nobody else gets a reply to "admin".</p>
      {code ? (
        <div className="cr-code">
          <p>From your phone, send this to the Nyaya number within <strong>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</strong>:</p>
          <p className="cr-code-big">admin {code}</p>
          <a className="cr-btn cr-btn--primary" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`admin ${code}`)}`} target="_blank" rel="noreferrer">Open WhatsApp with it typed in</a>
        </div>
      ) : (
        <div className="adm-actions">
          <button type="button" className="cr-btn cr-btn--primary" onClick={start}>{linked ? "Link another phone" : "Link my phone"}</button>
          {linked > 0 && <button type="button" className="cr-btn" onClick={unlink}>Unlink all</button>}
        </div>
      )}
      {msg && <p className="cr-muted" role="status">{msg}</p>}
    </section>
  );
}
