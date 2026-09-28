// Tiny UI sound effects generated with the Web Audio API -- no audio
// files needed. Each function plays a short, simple tone.

let audioCtx;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, duration, type = "sine", startGain = 0.12) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(startGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available -- fail silently, never break the app
  }
}

export function playCorrect() {
  tone(523, 0.1);
  setTimeout(() => tone(784, 0.15), 90);
}

export function playWrong() {
  tone(180, 0.22, "sawtooth", 0.08);
}

export function playFlip() {
  tone(340, 0.06, "triangle", 0.06);
}

export function playStamp() {
  tone(90, 0.18, "square", 0.1);
  setTimeout(() => tone(70, 0.12, "square", 0.07), 40);
}

export function playClick() {
  tone(500, 0.05, "triangle", 0.05);
}
