/**
 * Som curto de confirmação (gerado via Web Audio API — sem arquivo/asset).
 * Acorde ascendente C-E-G, suave e moderno. Toca uma vez.
 */

/** Bipe curto de alerta (nova mensagem) — dois toques, chamativo sem ser áspero. */
export function playAlertBeep() {
  try {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 987.77; // ~B5
      const t = now + offset;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* áudio indisponível — silencioso */
  }
}

export function playSuccessChime() {
  try {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 · E5 · G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* áudio indisponível — silencioso */
  }
}
