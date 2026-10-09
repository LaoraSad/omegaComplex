'use client';

// Selector de franjas de una instalación. Se abre desde la tarjeta del catálogo
// y agrega al carrito; no cobra nada todavía.

import { useEffect, useState } from 'react';
import { X, Loader2, CalendarPlus } from 'lucide-react';
import type { CatalogServiceRecord } from '@/features/catalog/catalog.types';
import type { DayAvailability } from '@/features/availability/availability.types';
import { bloqueDesdeSlot, cop, fechaCorta, formatoHora, useCarrito } from './CarritoReserva';

const HOY = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

function diasDisponibles(cantidad: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d));
  }
  return out;
}

export function SelectorFranjas({
  servicio,
  onClose,
}: {
  servicio: CatalogServiceRecord;
  onClose: () => void;
}) {
  const { agregar, yaEsta } = useCarrito();
  const [fecha, setFecha] = useState(HOY());
  const [aviso, setAviso] = useState('');

  // "Cargando" se deriva de la clave pedida, no se reinicia con un setState: así
  // no hay render en cascada y cambiar de fecha descarta el dato viejo solo.
  const clave = `${servicio.id}|${fecha}`;
  const [datos, setDatos] = useState<{ clave: string; dia: DayAvailability | null } | null>(null);
  const cargando = datos?.clave !== clave;
  const dia = datos?.clave === clave ? datos.dia : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?serviceId=${servicio.id}&fecha=${fecha}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (controller.signal.aborted) return;
        setDatos({ clave, dia: json?.data ? (json.data as DayAvailability) : null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setDatos({ clave, dia: null });
      });
    return () => controller.abort();
  }, [servicio.id, fecha, clave]);

  // Escape cierra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const agregarFranja = (slot: DayAvailability['slots'][number]) => {
    const r = agregar(bloqueDesdeSlot(servicio, slot, fecha));
    setAviso(r.ok ? `${servicio.name} ${formatoHora(slot.startsAt)} agregado.` : r.message);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Elegir franja en ${servicio.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="omega-ring w-full max-w-lg overflow-hidden rounded-2xl bg-[#141013] shadow-2xl"
      >
        <div className="omega-ring-inner">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
                {servicio.category.name}
              </span>
              <h2 className="truncate text-lg font-black text-white">{servicio.name}</h2>
              <p className="text-xs text-white/55">{cop(servicio.price)} por persona</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50">
              Fecha
            </label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {diasDisponibles(14).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFecha(f);
                    setAviso('');
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    f === fecha
                      ? 'border-[#e3bd74] bg-[#e3bd74]/15 text-[#e3bd74]'
                      : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10'
                  }`}
                >
                  {fechaCorta(f)}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {cargando ? (
                <p className="flex items-center gap-2 py-8 text-center text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando disponibilidad…
                </p>
              ) : !dia || dia.open === false ? (
                <p className="py-8 text-center text-sm text-white/60">
                  {dia?.reason ?? 'No hay franjas para ese día.'}
                </p>
              ) : dia.slots.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/60">No hay franjas generadas.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {dia.slots.map((s) => {
                    const ocupado = yaEsta(s.id);
                    const lleno = s.free <= 0;
                    const deshabilitado = ocupado || lleno;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={deshabilitado}
                          onClick={() => agregarFranja(s)}
                          className={`w-full rounded-lg border px-2 py-2.5 text-center transition-colors ${
                            ocupado
                              ? 'cursor-not-allowed border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : lleno
                                ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
                                : 'cursor-pointer border-white/10 bg-white/[0.04] text-white hover:border-[#e3bd74]/50 hover:bg-white/10'
                          }`}
                        >
                          <span className="block text-sm font-bold tabular-nums">
                            {formatoHora(s.startsAt)}
                          </span>
                          <span className="block text-[10px] text-white/50">
                            {ocupado ? 'En el carrito' : lleno ? 'Completa' : `${s.free} libres`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {aviso && (
              <p role="status" className="mt-4 rounded-lg border border-[#e3bd74]/25 bg-[#e3bd74]/10 px-3 py-2 text-xs text-[#e3bd74]">
                {aviso}
              </p>
            )}
          </div>

          <footer className="border-t border-white/10 p-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-[#7a1f3d] py-3 text-sm font-bold text-white transition-colors hover:bg-[#8f2547] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                Listo, ver mi carrito
              </span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}