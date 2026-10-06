'use client';

import { useEffect, useRef } from 'react';

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      step += 0.018;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Fondo base en gradiente negro con sutil toque vino muy oscuro
      const bgGrad = ctx.createRadialGradient(
        w * 0.5, h * 0.15, 30,
        w * 0.5, h * 0.6, Math.max(w, h) * 0.9
      );
      bgGrad.addColorStop(0, '#0f0204'); // Vino muy oscuro
      bgGrad.addColorStop(0.5, '#070102'); // Casi negro
      bgGrad.addColorStop(1, '#020001'); // Negro puro
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Definición de las capas de ondas (mucho más oscuras, sutiles y elegantes)
      const waveLayers = [
        {
          // 1. Capa profunda: Rojo vino muy oscuro y translúcido
          topColor: 'rgba(136, 19, 55, 0.18)',
          bottomColor: 'rgba(5, 1, 2, 0.6)',
          yRatio: 0.72,
          amp: 28,
          freq: 0.0035,
          speed: 0.7,
        },
        {
          // 2. Capa intermedia: Carmesí oscuro sutil
          topColor: 'rgba(190, 18, 60, 0.14)',
          bottomColor: 'rgba(5, 1, 2, 0.7)',
          yRatio: 0.80,
          amp: 32,
          freq: 0.003,
          speed: 0.9,
        },
        {
          // 3. Capa frontal: Rojo rubí discreto
          topColor: 'rgba(225, 29, 72, 0.12)',
          bottomColor: 'rgba(3, 0, 1, 0.85)',
          yRatio: 0.87,
          amp: 24,
          freq: 0.0042,
          speed: 0.8,
        },
      ];

      // Dibujar cada capa de ondas con gradiente que se desvanece a negro
      waveLayers.forEach((wave, idx) => {
        const baseY = h * wave.yRatio;

        const waveGrad = ctx.createLinearGradient(0, baseY - wave.amp, 0, h);
        waveGrad.addColorStop(0, wave.topColor);
        waveGrad.addColorStop(1, wave.bottomColor);
        ctx.fillStyle = waveGrad;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 14) {
          const y =
            baseY +
            Math.sin(x * wave.freq + step * wave.speed) * wave.amp +
            Math.cos(x * (wave.freq * 0.6) - step * (wave.speed * 0.6)) * (wave.amp * 0.3);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Línea sutil en la cresta (suave, sin destellos blancos molestos)
        if (idx >= 1) {
          ctx.save();
          ctx.strokeStyle = idx === 2 ? 'rgba(244, 63, 94, 0.22)' : 'rgba(190, 18, 60, 0.15)';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 4;

          ctx.beginPath();
          for (let x = 0; x <= w; x += 14) {
            const y =
              baseY +
              Math.sin(x * wave.freq + step * wave.speed) * wave.amp +
              Math.cos(x * (wave.freq * 0.6) - step * (wave.speed * 0.6)) * (wave.amp * 0.3);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#040102]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Viñeta oscura suave para mantener el centro nítido y oscuro */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
