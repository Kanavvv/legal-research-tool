import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

// The doorway's backdrop, drawn in code: three columns of judgment text
// drift upward, and every so often a line lights up coral and a thread
// carries it toward the question. Pauses off screen; static with reduced motion.

const LIME = [255, 107, 91];

function makeRows(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 60 }, (_, i) => ({
    w: i % 9 === 8 ? 0 : 0.35 + rnd() * 0.6, // a blank line now and then (paragraph break)
    lit: 0,
  }));
}

export default function DoorScene({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = prefersReducedMotion();
    const cols = [0, 1, 2].map((i) => ({ rows: makeRows(11 + i * 7), speed: 9 + i * 4, off: i * 140 }));
    const threads = [];
    let w = 0, h = 0, raf = 0, last = 0, nextLight = 0, visible = true;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layout() {
      const narrow = w < 760;
      const left = narrow ? w * 0.06 : w * 0.46;
      const right = w - (narrow ? w * 0.06 : w * 0.05);
      const gap = Math.max(14, (right - left) * 0.05);
      const colW = (right - left - gap * 2) / 3;
      const lineH = narrow ? 15 : 19;
      const target = narrow ? { x: w * 0.5, y: h * 0.06 } : { x: w * 0.36, y: h * 0.62 };
      return { left, gap, colW, lineH, target };
    }

    function draw(t, dt) {
      const L = layout();
      ctx.clearRect(0, 0, w, h);

      cols.forEach((c, ci) => {
        const x0 = L.left + ci * (L.colW + L.gap);
        // the page itself
        ctx.fillStyle = "rgba(244, 237, 224, 0.025)";
        ctx.strokeStyle = "rgba(244, 237, 224, 0.07)";
        ctx.beginPath();
        ctx.roundRect(x0, -20, L.colW, h + 40, 14);
        ctx.fill(); ctx.stroke();

        c.off += (c.speed * dt) / 1000;
        const total = c.rows.length * L.lineH;
        const shift = c.off % total;
        c.rows.forEach((row, ri) => {
          if (!row.w) return;
          let y = ri * L.lineH - shift;
          if (y < -L.lineH) y += total;
          if (y > h + L.lineH) return;
          row.lit = Math.max(0, row.lit - dt / 2600);
          const bw = (L.colW - 36) * row.w;
          const a = row.lit;
          ctx.fillStyle = a > 0
            ? `rgba(${LIME[0]}, ${LIME[1]}, ${LIME[2]}, ${0.18 + a * 0.7})`
            : "rgba(244, 237, 224, 0.12)";
          ctx.beginPath();
          ctx.roundRect(x0 + 18, y, bw, 4, 2);
          ctx.fill();
          row.y = y; row.x = x0 + 18; row.bw = bw;
        });
      });

      // light a fresh line every so often and send a thread toward the question
      if (!reduced && t > nextLight) {
        nextLight = t + 1300 + Math.random() * 900;
        const c = cols[Math.floor(Math.random() * 3)];
        const candidates = c.rows.filter((r) => r.w && r.y > h * 0.12 && r.y < h * 0.88);
        const row = candidates[Math.floor(Math.random() * candidates.length)];
        if (row) { row.lit = 1; threads.push({ row, life: 1 }); }
      }

      for (let i = threads.length - 1; i >= 0; i--) {
        const th = threads[i];
        th.life -= dt / 2600;
        if (th.life <= 0) { threads.splice(i, 1); continue; }
        const sx = th.row.x, sy = th.row.y + 2;
        const grow = Math.min(1, (1 - th.life) * 3.2); // draws out over the first ~0.8 s
        const ex = sx + (L.target.x - sx) * grow, ey = sy + (L.target.y - sy) * grow;
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, `rgba(${LIME.join(",")}, ${0.55 * th.life})`);
        g.addColorStop(1, `rgba(${LIME.join(",")}, 0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx - 80 * grow, sy, ex + 60 * grow, ey, ex, ey);
        ctx.stroke();
      }
    }

    function frame(t) {
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      draw(t, dt);
      if (visible) raf = requestAnimationFrame(frame);
    }

    size();
    if (reduced) {
      // a still page with a few lines already lit
      cols.forEach((c) => [6, 19, 33].forEach((i) => { if (c.rows[i].w) c.rows[i].lit = 0.8; }));
      draw(0, 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([e]) => {
      if (reduced) return;
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) { last = 0; raf = requestAnimationFrame(frame); }
    });
    io.observe(canvas);
    const onResize = () => { size(); if (reduced) draw(0, 0); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className={`door-scene ${className}`} aria-hidden="true" />;
}
