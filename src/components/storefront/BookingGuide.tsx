'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, MousePointerClick, X } from 'lucide-react';
import { AuthApiError, me } from '@/lib/api/auth';

/**
 * Mini-guía de reserva para /servicios.
 * Solo se muestra una vez y solo si hay sesión activa.
 * Resalta el objetivo con un anillo dorado y ancla el mensaje a su posición.
 */

const STORAGE_KEY = 'omega-guia-servicios-v1';

interface GuideStep {
  target: string;
  title: string;
  text: string;
  cta: string;
}

const STEPS: GuideStep[] = [
  {
    target: 'filtros',
    title: 'Paso 1 · Filtra por categoría',
    text: 'Toca una pestaña para ver solo piscinas, canchas, gimnasio o zona húmeda.',
    cta: 'Siguiente',
  },
  {
    target: 'buscador',
    title: 'Paso 2 · O busca directo',
    text: 'Escribe aquí el nombre de la instalación que quieres reservar.',
    cta: 'Siguiente',
  },
  {
    target: 'reservar',
    title: 'Paso 3 · Reserva tu horario',
    text: 'Toca “Reservar horario” en la tarjeta: elige fecha, hora y paga para recibir tu QR.',
    cta: 'Entendido',
  },
];

interface PopoverPos {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
}

function readTargetRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return el.getBoundingClientRect();
}

export default function BookingGuide() {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [pos, setPos] = useState<PopoverPos | null>(null);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* almacenamiento no disponible: no se reintenta en esta sesión */
    }
    document
      .querySelectorAll('[data-tour-ring="1"]')
      .forEach((el) => el.removeAttribute('data-tour-ring'));
    setStepIndex(null);
    setPos(null);
  }, []);

  // Solo arranca con sesión activa y si nunca se completó.
  useEffect(() => {
    let cancelled = false;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    me().then(
      () => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (!cancelled) setStepIndex(0);
        }, 900);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.status === 401) return;
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Ancla el mensaje al objetivo y lo resalta en cada paso.
  useEffect(() => {
    if (stepIndex === null) return;
    const step = STEPS[stepIndex];
    if (!step) {
      const done = window.setTimeout(finish, 0);
      return () => window.clearTimeout(done);
    }

    document
      .querySelectorAll('[data-tour-ring="1"]')
      .forEach((el) => el.removeAttribute('data-tour-ring'));

    // Espera al desplazamiento antes de medir.
    const measure = window.setTimeout(() => {
      const rect = readTargetRect(step.target);
      const target = document.querySelector(`[data-tour="${step.target}"]`);
      if (!rect || !target) {
        finish();
        return;
      }
      target.setAttribute('data-tour-ring', '1');
      const vw = window.innerWidth;
      const popW = Math.min(300, vw - 32);
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - popW / 2, vw - popW - 16));
      const spaceAbove = rect.top;
      const placeAbove = spaceAbove > 210;
      setPos({
        top: placeAbove ? rect.top + window.scrollY - 12 : rect.bottom + window.scrollY + 12,
        left: left + window.scrollX,
        width: popW,
        placeAbove,
      });
    }, 550);

    const onResize = () => {
      const rect = document
        .querySelector(`[data-tour="${step.target}"]`)
        ?.getBoundingClientRect();
      if (!rect) return;
      const vw = window.innerWidth;
      const popW = Math.min(300, vw - 32);
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - popW / 2, vw - popW - 16));
      const placeAbove = rect.top > 210;
      setPos({
        top: placeAbove ? rect.top + window.scrollY - 12 : rect.bottom + window.scrollY + 12,
        left: left + window.scrollX,
        width: popW,
        placeAbove,
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(measure);
      window.removeEventListener('resize', onResize);
    };
  }, [stepIndex, finish]);

  if (stepIndex === null || !pos) return null;
  const step = STEPS[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" aria-hidden={false}>
      {/* Popover anclado al objetivo */}
      <div
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        className="tour-popover pointer-events-auto absolute rounded-2xl border border-[#e3bd74]/40 bg-[#171114]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md"
        style={{
          top: pos.top,
          left: pos.left,
          width: pos.width,
          transform: pos.placeAbove ? 'translateY(-100%)' : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
            <MousePointerClick className="h-4 w-4" />
            <span>{step.title}</span>
          </p>
          <button
            onClick={finish}
            aria-label="Omitir guía"
            className="rounded-md p-1 text-white/50 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/80">{step.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-[0.14em] text-white/40">
            {stepIndex + 1} / {STEPS.length}
          </span>
          <button
            onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7a1f3d] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#8f2547]"
          >
            {isLast ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>{step.cta}</span>
              </>
            ) : (
              <>
                <span>{step.cta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
        {/* Flecha hacia el objetivo */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 h-3 w-3 rotate-45 border-[#e3bd74]/40 bg-[#171114]"
          style={
            pos.placeAbove
              ? { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 }
              : { top: -7, borderLeftWidth: 1, borderTopWidth: 1 }
          }
        />
      </div>
    </div>
  );
}
