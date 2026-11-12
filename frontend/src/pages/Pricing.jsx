import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API_URL, apiFetch, responseError } from "../api";
import { PRO_ON, WHATSAPP_URL } from "../config";

const FREE = ["10 questions a day", "5 case comparisons a day", "5 argument briefs a day", "Follow-up questions", "Save answers to folders", "Share links"];
const PRO = ["200 questions a day", "50 comparisons and 50 briefs a day", "Explain any notice, agreement, FIR or order, even from a photo", "Drafts: legal notice replies, RTI applications, consumer complaints", "Weekly email alerts on up to 5 topics", "Everything in Free"];

function loadCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error("Couldn't load the payment window."));
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  if (!PRO_ON) {
    return <Paused title={<>Nyaya is <em>free</em> for now.</>}
      lede="Nyaya Pro is paused for a few days while we set up payments. Asking questions, the IPC to BNS converter, rights guides, templates and student tools are all free to use." />;
  }
  return <PricingFull />;
}

function PricingFull() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/me`).then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
  }, [user]);

  const isPro = me?.plan === "pro";
  const until = me?.pro_until ? new Date(me.pro_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  async function upgrade() {
    if (!user) { navigate("/account", { state: { next: "/pricing" } }); return; }
    setBusy(true);
    setStatus("");
    try {
      const res = await apiFetch(`${API_URL}/billing/order`, { method: "POST" });
      if (!res.ok) throw await responseError(res);
      const order = await res.json();
      const Razorpay = await loadCheckout();
      const rzp = new Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Nyaya Pro",
        description: "30 days of Nyaya Pro",
        prefill: { email: order.email, name: order.name },
        theme: { color: "#14213D" },
        handler: async (payment) => {
          setStatus("Confirming your payment…");
          try {
            const v = await apiFetch(`${API_URL}/billing/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            if (!v.ok) throw await responseError(v);
            const fresh = await apiFetch(`${API_URL}/me`).then((r) => r.json());
            setMe(fresh);
            setStatus("You're on Pro. Thank you.");
          } catch (err) {
            setStatus(err?.userMessage || "Payment received; Pro will switch on within a few minutes. Refresh this page shortly.");
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (resp) => setStatus(resp?.error?.description || "The payment didn't go through. You haven't been charged."));
      rzp.open();
    } catch (err) {
      setStatus(err?.userMessage || err?.message || "Couldn't start the payment. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <div>
          <h1 className="station-title">Free to ask. <em>Pro</em> when it matters.</h1>
          <p className="station-lede">Every answer cites its sources on both plans. Pro adds room to work and the paperwork tools.</p>
        </div>
      </header>

      <div className="plans">
        <section className="card plan" aria-labelledby="plan-free">
          <h2 id="plan-free" className="plan-name">Free</h2>
          <p className="plan-price"><span>₹0</span></p>
          <ul className="plan-list">{FREE.map((f) => <li key={f}>{f}</li>)}</ul>
          <Link to="/" className="btn btn--ghost btn--block">Ask a question</Link>
        </section>

        <section className="card plan plan--pro" aria-labelledby="plan-pro">
          <h2 id="plan-pro" className="plan-name">Pro</h2>
          <p className="plan-price"><span>₹{me?.price_inr || 199}</span> for 30 days</p>
          <ul className="plan-list">{PRO.map((f) => <li key={f}>{f}</li>)}</ul>
          {isPro ? (
            <>
              <p className="plan-on">You're on Pro until {until}.</p>
              <button type="button" className="btn btn--lime btn--block" onClick={upgrade} disabled={busy}>Add 30 more days</button>
            </>
          ) : (
            <button type="button" className="btn btn--lime btn--block" onClick={upgrade} disabled={busy}>
              {busy ? "Opening…" : user ? "Get Pro" : "Sign in to get Pro"}
            </button>
          )}
          <p className="plan-fine mono muted">One payment, no auto-renewal. UPI, cards and netbanking via Razorpay.</p>
        </section>
      </div>
      {status && <p className="plan-status" role="status">{status}</p>}
      <p className="plan-terms muted">
        Pro is a 30-day pass for one person. See the <Link to="/terms">terms</Link>, including refunds, and the <Link to="/privacy">privacy policy</Link>.
      </p>
    </main>
  );
}


function Paused({ title, lede }) {
  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">{title}</h1>
        <p className="station-lede">{lede}</p>
      </header>
      <div className="answer-actions">
        <Link to="/" className="btn btn--lime btn--sm">Ask a question</Link>
        <Link to="/templates" className="btn btn--ghost btn--sm">Free templates</Link>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Ask on WhatsApp</a>
      </div>
    </main>
  );
}
