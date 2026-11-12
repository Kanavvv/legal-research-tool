// Draws an answer as a 1080×1350 picture (Instagram portrait) to save or send.
// Everything happens in the browser; nothing is uploaded.

const W = 1080, H = 1350, PAD = 88;
const NAVY = "#14213D", CREAM = "#F4EDE0", CORAL = "#FF6B5B";
const SERIF = '"Instrument Serif", "Noto Serif Devanagari", Georgia, serif';
const SANS = 'Geist, "Noto Sans Devanagari", system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, monospace';

// The first few sentences of an answer, without markdown or citation markers.
export function excerpt(md, max = 430) {
  const plain = (md || "")
    .replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("। "), cut.lastIndexOf("? "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function wrap(ctx, text, width, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  else if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > width && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
    lines[maxLines - 1] = `${last.replace(/[.,;:]$/, "")}…`;
  }
  return lines;
}

// Fits the question: tries big type first, shrinks until it takes at most 4 lines.
function fitQuestion(ctx, q, width) {
  for (const size of [76, 68, 60, 54, 48]) {
    ctx.font = `400 ${size}px ${SERIF}`;
    const lines = wrap(ctx, q, width, 5);
    if (lines.length <= 4) return { size, lines };
  }
  ctx.font = `400 48px ${SERIF}`;
  return { size: 48, lines: wrap(ctx, q, width, 4) };
}

export async function drawAnswerCard({ question, answer, sources = 0, label = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }) {
  try {
    await Promise.all([
      document.fonts.load(`76px ${SERIF}`), document.fonts.load(`34px ${SANS}`), document.fonts.load(`22px ${MONO}`),
    ]);
  } catch { /* system fonts are fine */ }

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // Navy ground with a soft coral glow and fluted-glass lines.
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.08, 20, W * 0.85, H * 0.08, W * 0.9);
  glow.addColorStop(0, "rgba(255,107,91,0.30)"); glow.addColorStop(1, "rgba(255,107,91,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 36) {
    const g = ctx.createLinearGradient(x, 0, x + 36, 0);
    g.addColorStop(0, "rgba(244,237,224,0.035)"); g.addColorStop(0.5, "rgba(244,237,224,0)"); g.addColorStop(1, "rgba(0,0,0,0.06)");
    ctx.fillStyle = g; ctx.fillRect(x, 0, 36, H);
  }

  // Header: mark and site.
  let y = PAD;
  ctx.strokeStyle = CORAL; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(PAD, y, 52, 52, 12); ctx.stroke();
  ctx.fillStyle = CORAL; ctx.font = `500 30px ${SANS}`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillText("N", PAD + 26, y + 27);
  ctx.textAlign = "left"; ctx.fillStyle = CREAM; ctx.font = `500 30px ${SANS}`;
  ctx.fillText("Nyaya", PAD + 72, y + 27);
  ctx.textAlign = "right"; ctx.fillStyle = "rgba(244,237,224,0.6)"; ctx.font = `400 22px ${MONO}`;
  ctx.fillText(label.toUpperCase(), W - PAD, y + 27);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  // Question.
  y += 150;
  ctx.fillStyle = CORAL; ctx.font = `400 22px ${MONO}`;
  ctx.fillText("THE QUESTION", PAD, y);
  y += 30;
  const q = fitQuestion(ctx, question.trim(), W - PAD * 2);
  ctx.fillStyle = CREAM;
  for (const line of q.lines) { y += q.size * 1.08; ctx.fillText(line, PAD, y); }

  // Coral rule.
  y += 54;
  ctx.fillStyle = CORAL; ctx.fillRect(PAD, y, 84, 4);
  y += 64;

  // Answer excerpt.
  ctx.fillStyle = "rgba(244,237,224,0.6)"; ctx.font = `400 22px ${MONO}`;
  ctx.fillText("THE SHORT ANSWER", PAD, y);
  y += 22;
  ctx.font = `400 36px ${SANS}`; ctx.fillStyle = "rgba(244,237,224,0.92)";
  const room = Math.max(3, Math.floor((H - 300 - y) / 52));
  for (const line of wrap(ctx, excerpt(answer), W - PAD * 2, room)) { y += 52; ctx.fillText(line, PAD, y); }

  // Footer: sources stamp, call to action, disclaimer.
  const fy = H - PAD - 120;
  ctx.strokeStyle = "rgba(244,237,224,0.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, fy); ctx.lineTo(W - PAD, fy); ctx.stroke();
  if (sources > 0) {
    ctx.strokeStyle = CORAL; ctx.lineWidth = 2;
    const tag = `CITED · ${sources} SOURCE${sources === 1 ? "" : "S"}`;
    ctx.font = `500 22px ${MONO}`;
    const tw = ctx.measureText(tag).width + 36;
    ctx.beginPath(); ctx.roundRect(W - PAD - tw, fy + 34, tw, 48, 24); ctx.stroke();
    ctx.fillStyle = CORAL; ctx.textAlign = "center"; ctx.fillText(tag, W - PAD - tw / 2, fy + 66);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = CREAM; ctx.font = `500 34px ${SANS}`;
  ctx.fillText("Ask yours free at asknyaya.in", PAD, fy + 62);
  ctx.fillStyle = "rgba(244,237,224,0.5)"; ctx.font = `400 22px ${SANS}`;
  ctx.fillText("Research help, not legal advice. Check the sources.", PAD, fy + 104);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

// Shares the picture on phones that can, otherwise downloads it. Returns "shared" or "saved".
export async function shareOrSaveCard(blob, name = "nyaya-answer.png") {
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ files: [file], title: "Nyaya answer" }); return "shared"; } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}
