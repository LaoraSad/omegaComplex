'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

/* Imágenes reales del proyecto (public/360). La primera es la protagonista. */
const SLIDES = [
  { src: '/360/campo_futbol11.jpg', alt: 'Cancha de fútbol Omega Complex al atardecer' },
  { src: '/360/microfutbol_cubierta.jpg', alt: 'Cancha de microfútbol cubierta' },
  { src: '/360/wave_pool.jpg', alt: 'Piscina de olas Omega Complex' },
];

export default function Hero() {
  const [active, setActive] = useState(0);

  const go = useCallback((i: number) => setActive(i % SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="inicio" className="omega-hero relative -mt-20 flex min-h-[100svh] items-center overflow-hidden bg-[#0e0b0d] pt-20">
      {/* Fondo: slides reales con transición suave */}
      <div className="absolute inset-0" aria-hidden="true">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === active ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt=""
              className={`h-full w-full object-cover ${i === active ? 'omega-kenburns' : ''}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
        {/* Overlay oscuro MUY sutil solo para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/62 via-black/28 to-black/10" />
        {/* Velo superior para garantizar la legibilidad de la navbar */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/75 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-14 pt-12 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-10">
          <div className="max-w-[720px]">
            <p className="omega-fade-up text-[11px] font-semibold uppercase tracking-[0.32em] text-white/85 sm:text-xs">
              Deporte&nbsp;&nbsp;·&nbsp;&nbsp;Bienestar&nbsp;&nbsp;·&nbsp;&nbsp;Comunidad
            </p>
            <h1
              className="omega-fade-up mt-5 text-[42px] font-black uppercase leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[76px]"
              style={{ animationDelay: '90ms' }}
            >
              Más que un
              <br />
              <span className="text-[#e3bd74]">complejo deportivo</span>
            </h1>
            <p
              className="omega-fade-up mt-5 max-w-[560px] text-[15px] leading-relaxed text-white/85 sm:text-base"
              style={{ animationDelay: '180ms' }}
            >
              Instalaciones de primer nivel, un ambiente único y una comunidad
              que vive el deporte al máximo.
            </p>
            <div className="omega-fade-up mt-8 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: '260ms' }}>
              <Link
                href="/servicios"
                className="group inline-flex items-center justify-center gap-2.5 rounded-[4px] bg-[#7a1f3d] px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#631730]"
              >
                <span>Reserva ahora</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#instalaciones"
                className="inline-flex items-center justify-center rounded-[4px] border border-white/60 px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Conoce nuestro complejo
              </Link>
            </div>
          </div>

          {/* Elemento editorial derecho */}
          <div className="hidden shrink-0 flex-col items-end gap-6 pb-2 md:flex">
            <p className="omega-script -rotate-6 text-right text-[44px] leading-[1.05] text-white/95">
              Vive
              <br />
              el Deporte
            </p>
            <div className="flex items-center gap-4" role="tablist" aria-label="Cambiar imagen del hero">
              {SLIDES.map((s, i) => (
                <button
                  key={s.src}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Ver imagen ${i + 1}`}
                  onClick={() => go(i)}
                  className={`cursor-pointer pb-2 text-[12px] font-semibold tracking-[0.2em] transition-colors ${
                    i === active ? 'text-white' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  <span className={i === active ? 'border-b-2 border-[#e3bd74] pb-2' : 'border-b border-white/20 pb-2'}>
                    0{i + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Indicadores móviles */}
        <div className="mt-8 flex items-center gap-2 md:hidden">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              onClick={() => go(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={`h-[3px] cursor-pointer rounded-full transition-all ${i === active ? 'w-10 bg-[#e3bd74]' : 'w-6 bg-white/30'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
