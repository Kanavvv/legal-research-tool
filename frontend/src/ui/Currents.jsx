import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

// The light behind the site: a bundle of luminous strands that sweeps across
// the page as you scroll, twisting slowly. It flares when a search runs.

const STRANDS = 64;
const LIME = [215, 242, 107];
const TEAL = [94, 230, 208];
const BLUE = [79, 163, 255];

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
function strandColor(k) {
  return k < 0.5 ? mix(LIME, TEAL, k * 2) : mix(TEAL, BLUE, (k - 0.5) * 2);
}

export default function Currents() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = prefersReducedMotion();
    let w = 0, h = 0;
    let raf = 0;
    let t = Math.random() * 100;
    let flare = 0;
    let flareTarget = 0;
    let pointerY = 0.5, pointerTarget = 0.5;
    let sparks = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparks = Array.from({ length: Math.round(Math.min(90, w / 14)) }, () => ({
        s: Math.random(),
        k: Math.random(),
        r: Math.random() * 1.4 + 0.4,
        v: Math.random() * 0.0012 + 0.0004,
        tw: Math.random() * Math.PI * 2,
      }));
    }

    // Centre line of the bundle at horizontal position u (0..1)
    function centre(u, scrollPhase) {
      const sweep = Math.sin(scrollPhase * 0.9) * 0.18;
      const base = 0.62 - u * 0.38 + sweep + (pointerY - 0.5) * 0.08;
      return h * (base + Math.sin(u * 3.1 + t * 0.21) * 0.07);
    }

    function strandY(u, k, scrollPhase) {
      const spread = (k - 0.5) * (h * 0.22) * (0.55 + 0.45 * Math.sin(u * 2.4 + t * 0.17 + scrollPhase));
      const twist = Math.sin(u * 5.2 + k * 2.6 + t * 0.33) * h * 0.035 * (1 + flare * 1.6);
      return centre(u, scrollPhase) + spread + twist;
    }

    function draw() {
      const scrollPhase = window.scrollY / Math.max(1, h);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const steps = Math.max(36, Math.round(w / 26));
      for (let i = 0; i < STRANDS; i++) {
        const k = i / (STRANDS - 1);
        const c = strandColor(k);
        const edge = 1 - Math.abs(k - 0.5) * 1.6;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.05 + edge * 0.12) * (1 + flare * 1.4)})`;
        ctx.lineWidth = i % 9 === 0 ? 1.6 : 0.8;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const x = -40 + u * (w + 80);
          const y = strandY(u, k, scrollPhase);
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (const p of sparks) {
        if (!reduced) p.s = (p.s + p.v * (1 + flare * 4)) % 1;
        const x = -40 + p.s * (w + 80);
        const y = strandY(p.s, p.k, scrollPhase);
        const c = strandColor(p.k);
        const a = 0.35 + 0.35 * Math.sin(t * 2 + p.tw);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 + flare), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function frame() {
      t += 0.016;
      flare += (flareTarget - flare) * 0.06;
      flareTarget *= 0.985;
      pointerY += (pointerTarget - pointerY) * 0.04;
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onPulse(e) {
      flareTarget = Math.min(1.4, flareTarget + (e.detail?.strength ?? 1));
    }
    function onPointer(e) {
      pointerTarget = e.clientY / Math.max(1, h);
    }
    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(frame);
    }
    function onScrollStatic() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("nyaya:pulse", onPulse);
    if (reduced) {
      draw();
      window.addEventListener("scroll", onScrollStatic, { passive: true });
      window.addEventListener("resize", onScrollStatic);
    } else {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("nyaya:pulse", onPulse);
      window.removeEventListener("scroll", onScrollStatic);
      window.removeEventListener("resize", onScrollStatic);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="currents" aria-hidden="true">
      <canvas ref={ref} />
      <div className="currents-grain" />
    </div>
  );
}
