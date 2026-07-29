/**
 * Confete leve em canvas (sem dependência externa). Rajada curta de partículas
 * que cai por ~2,6s. Respeita prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react';

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;

    const colors = ['#7C3AED', '#16A34A', '#F59E0B', '#EF4444', '#3B82F6'];
    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.4,
      r: (4 + Math.random() * 6) * DPR,
      c: colors[(Math.random() * colors.length) | 0],
      vx: (-1 + Math.random() * 2) * DPR,
      vy: (2.5 + Math.random() * 3) * DPR,
      rot: Math.random() * Math.PI,
      vr: -0.12 + Math.random() * 0.24,
    }));

    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03 * DPR;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      }
      if (t - start < 2600) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50" aria-hidden />;
}
