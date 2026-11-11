import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

// The site's backdrop: soft navy, slate and coral light seen through reeded
// (fluted) glass. Colour blobs are painted small, then redrawn strip by strip,
// each flute magnifying and shifting the light behind it the way real ribbed
// glass does. The pointer nudges the light, a search makes the coral flare,
// and the glass dims as you scroll into the reading parts of the page.

const NAVY = [20, 33, 61];
const BLOBS = [
  // x, y (0..1 of viewport), radius (of the larger side), colour, drift speed, phase
  { x: 0.64, y: 0.46, r: 0.42, c: [255, 107, 91], a: 0.95, s: 0.07, p: 0 },     // coral
  { x: 0.54, y: 0.62, r: 0.3, c: [255, 150, 120], a: 0.55, s: 0.05, p: 2.1 },   // warm coral
  { x: 0.22, y: 0.22, r: 0.36, c: [150, 160, 190], a: 0.7, s: 0.045, p: 1.3 },  // slate
  { x: 0.9, y: 0.12, r: 0.3, c: [70, 92, 150], a: 0.85, s: 0.06, p: 4.0 },      // periwinkle
  { x: 0.1, y: 0.85, r: 0.4, c: [31, 52, 102], a: 0.9, s: 0.04, p: 3.2 },       // deep blue
  { x: 0.42, y: 0.12, r: 0.22, c: [244, 237, 224], a: 0.35, s: 0.08, p: 5.3 },  // cream glint
];

export default function Reeded() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const off = document.createElement("canvas");
    const octx = off.getContext("2d");
    const shade = document.createElement("canvas");
    const sctx = shade.getContext("2d");
    const reduced = prefersReducedMotion();

    let w = 0, h = 0, flute = 16, raf = 0, t = 0, last = 0;
    let pulse = 0, scroll = 0, visible = true;
    const pointer = { x: 0.6, y: 0.45, tx: 0.6, ty: 0.45 };

    function size() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w); canvas.height = Math.round(h); // 1x is plenty: it's all soft light
      flute = w < 640 ? 11 : w < 1100 ? 14 : 17;
      off.width = Math.max(64, Math.round(w / 6)); off.height = Math.max(64, Math.round(h / 6));
      // one flute's shading: a bright lip on the left, a shadowed fold on the right
      shade.width = flute; shade.height = 2;
      const g = sctx.createLinearGradient(0, 0, flute, 0);
      g.addColorStop(0, "rgba(255,255,255,0.20)");
      g.addColorStop(0.12, "rgba(255,255,255,0.05)");
      g.addColorStop(0.55, "rgba(0,0,0,0)");
      g.addColorStop(0.86, "rgba(8,14,30,0.22)");
      g.addColorStop(1, "rgba(8,14,30,0.42)");
      sctx.clearRect(0, 0, flute, 2);
      sctx.fillStyle = g; sctx.fillRect(0, 0, flute, 2);
    }

    function paintLight(time) {
      const ow = off.width, oh = off.height, big = Math.max(ow, oh);
      octx.globalCompositeOperation = "source-over";
      octx.fillStyle = `rgb(${NAVY.join(",")})`;
      octx.fillRect(0, 0, ow, oh);
      octx.globalCompositeOperation = "screen";
      BLOBS.forEach((b, i) => {
        const dx = Math.sin(time * b.s + b.p) * 0.06 + (i < 2 ? (pointer.x - 0.6) * 0.18 : (pointer.x - 0.6) * -0.05);
        const dy = Math.cos(time * b.s * 0.8 + b.p) * 0.05 + (i < 2 ? (pointer.y - 0.45) * 0.14 : 0);
        const boost = i < 2 ? 1 + pulse * 0.55 : 1;
        const x = (b.x + dx) * ow, y = (b.y + dy) * oh, r = b.r * big * boost;
        const g = octx.createRadialGradient(x, y, 0, x, y, r);
        const [cr, cg, cb] = b.c;
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, b.a * (i < 2 ? 1 + pulse * 0.3 : 1))})`);
        g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${b.a * 0.45})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        octx.fillStyle = g;
        octx.fillRect(0, 0, ow, oh);
      });
    }

    function draw(time) {
      paintLight(time);
      const sx = off.width / w, sy = off.height / h;
      ctx.imageSmoothingEnabled = true;
      // each flute shows a magnified, slightly displaced slice of the light behind it
      for (let x = 0; x < w; x += flute) {
        const centre = x + flute / 2;
        const srcW = flute * 2.4;
        const srcX = (centre - srcW / 2 + Math.sin(centre * 0.004 + time * 0.05) * 6) * sx;
        ctx.drawImage(off, Math.max(0, srcX), 0, srcW * sx, off.height, x, 0, flute, h);
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ctx.createPattern(shade, "repeat");
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      // reading parts of the page sit on calmer, darker glass
      const dim = Math.min(0.78, scroll / (h * 0.9) * 0.78);
      if (dim > 0.01) {
        ctx.fillStyle = `rgba(11, 20, 40, ${dim})`;
        ctx.fillRect(0, 0, w, h);
      }
      void sy;
    }

    function frame(now) {
      if (!visible) return;
      const dt = last ? Math.min(80, now - last) : 16;
      last = now;
      t += dt / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.03;
      pointer.y += (pointer.ty - pointer.y) * 0.03;
      pulse = Math.max(0, pulse - dt / 2200);
      draw(t);
      raf = requestAnimationFrame(frame);
    }

    size();
    scroll = window.scrollY;
    if (reduced) draw(2); else raf = requestAnimationFrame(frame);

    const onResize = () => { size(); if (reduced) draw(2); };
    const onMove = (e) => { pointer.tx = e.clientX / w; pointer.ty = e.clientY / h; };
    const onScroll = () => { scroll = window.scrollY; if (reduced) draw(2); };
    const onPulse = (e) => { pulse = Math.min(1, pulse + (e.detail || 0.8)); };
    const onVis = () => {
      visible = !document.hidden;
      cancelAnimationFrame(raf);
      if (visible && !reduced) { last = 0; raf = requestAnimationFrame(frame); }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("nyaya:pulse", onPulse);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("nyaya:pulse", onPulse);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="currents" aria-hidden="true">
      <canvas ref={ref} />
      <div className="currents-grain" />
    </div>
  );
}
