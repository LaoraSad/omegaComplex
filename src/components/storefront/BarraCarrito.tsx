'use client';

// Barra flotante del carrito: se ve solo cuando hay al menos una zona elegida.
// Muestra las zonas, deja quitar una, ajusta las personas y abre el resumen para
// pagar (un solo pago para todas).

import { useEffect, useState } from 'react';
import { ShoppingBag, X, Minus, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cop, fechaCorta, formatoHora, useCarrito } from './CarritoReserva';

type Acompanante = { fullName: string; document: string };

export function BarraCarrito() {
  const { bloques, personas, zonasUnicas, totalCop, quitar, vaciar, setPersonas } = useCarrito();
  const [resumen, setResumen] = useState(false);
  const [acompañantes, setAcompanantes] = useState<Acompanante[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState<{ id: string; total: number } | null>(null);

  const abierto = bloques.length > 0;

  // Los acompañantes se derivan de las personas, no se guardan aparte: si
  // bajan de 3 a 2 personas, la tercera fila desaparece sola y al volver a subir
  // se vuelve a crear vacía. Solo el texto que el usuario escribió sobrevive,
  // guardado por posición.
  const escribirAcompanante = (i: number, campo: 'fullName' | 'document', valor: string) => {
    setAcompanantes((prev) => {
      const faltan = Math.max(0, personas - 1);
      const base = prev.slice(0, faltan);
      while (base.length < faltan) base.push({ fullName: '', document: '' });
      base[i] = { ...base[i], [campo]: valor };
      return base;
    });
  };

  useEffect(() => {
    if (!resumen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResumen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resumen]);

  const faltaDocumento = acompañantes.some((g) => g.fullName.trim() && !g.document.trim());

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloques: bloques.map((b) => ({
            serviceId: b.serviceId,
            slotId: b.slotId,
            fecha: b.fecha,
          })),
          personas,
          acompañantes: acompañantes
            .filter((g) => g.fullName.trim())
            .map((g) => ({ fullName: g.fullName.trim(), document: g.document.trim() })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'No fue posible crear la reserva.');
        return;
      }
      setListo({ id: json.data.reservationId, total: json.data.totalCop });
      vaciar();
    } catch {
      setError('No fue posible conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-[#141013]/95 p-3 shadow-2xl backdrop-blur sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#e3bd74]" />
              <span className="text-xs font-bold text-white">
                {bloques.length} {bloques.length === 1 ? 'franja' : 'franjas'} · {zonasUnicas}{' '}
                {zonasUnicas === 1 ? 'zona' : 'zonas'}
              </span>
            </div>

            <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {bloques.map((b) => (
                <li
                  key={b.clave}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-1 pl-2 pr-1 text-[11px] text-white/80"
                >
                  <span className="truncate">
                    {b.serviceName} · {fechaCorta(b.fecha)}{' '}
                    {formatoHora(new Date(b.etiquetaHora))}
                  </span>
                  <button
                    type="button"
                    onClick={() => quitar(b.clave)}
                    aria-label={`Quitar ${b.serviceName} ${formatoHora(new Date(b.etiquetaHora))}`}
                    className="rounded p-0.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setPersonas(personas - 1)}
                  disabled={personas <= 1}
                  aria-label="Quitar una persona"
                  className="rounded p-1 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-6 text-center text-sm font-bold tabular-nums text-white">
                  {personas}
                </span>
                <button
                  type="button"
                  onClick={() => setPersonas(personas + 1)}
                  disabled={personas >= 50}
                  aria-label="Agregar una persona"
                  className="rounded p-1 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setResumen(true)}
                className="rounded-xl bg-[#7a1f3d] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#8f2547] cursor-pointer"
              >
                Pagar {cop(totalCop)}
              </button>

              <button
                type="button"
                onClick={vaciar}
                aria-label="Vaciar el carrito"
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {zonasUnicas > 1 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/55">
              <AlertTriangle className="h-3 w-3 shrink-0 text-[#e3bd74]" />
              {personas} {personas === 1 ? 'persona' : 'personas'} en {zonasUnicas} zonas: te
              llegará {zonasUnicas} {zonasUnicas === 1 ? 'QR' : 'QR'} por persona.
            </p>
          )}
        </div>
      </div>

      {resumen && !listo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Resumen de la reserva"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setResumen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141013] p-5 shadow-2xl"
          >
            <h2 className="text-lg font-black text-white">Confirmar reserva</h2>
            <p className="mt-1 text-xs text-white/55">
              {bloques.length} {bloques.length === 1 ? 'franja' : 'franjas'} · {personas}{' '}
              {personas === 1 ? 'persona' : 'personas'} · un solo pago.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm">
              {bloques.map((b) => (
                <li
                  key={b.clave}
                  className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0"
                >
                  <span className="min-w-0 truncate text-white/85">
                    {b.serviceName}{' '}
                    <span className="text-white/50">
                      {fechaCorta(b.fecha)} {formatoHora(new Date(b.etiquetaHora))}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white/70">
                    {cop(b.precioHora * personas)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-xl font-black tabular-nums text-[#e3bd74]">{cop(totalCop)}</span>
            </div>

            {zonasUnicas > 1 && (
              <p className="mt-3 rounded-lg border border-[#e3bd74]/25 bg-[#e3bd74]/10 px-3 py-2 text-xs text-[#e3bd74]">
                Reservas {zonasUnicas} zonas, así que cada persona recibirá {zonasUnicas} QR: uno por
                puerta. Un solo pago.
              </p>
            )}

            {personas > 1 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Acompañantes ({personas - 1})
                </p>
                {Array.from({ length: personas - 1 }, (_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      value={acompañantes[i]?.fullName ?? ''}
                      onChange={(e) => escribirAcompanante(i, 'fullName', e.target.value)}
                      placeholder="Nombre completo"
                      aria-label={`Nombre del acompañante ${i + 1}`}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#e3bd74]/60 focus:outline-none"
                    />
                    <input
                      value={acompañantes[i]?.document ?? ''}
                      onChange={(e) => escribirAcompanante(i, 'document', e.target.value)}
                      placeholder="Documento"
                      aria-label={`Documento del acompañante ${i + 1}`}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#e3bd74]/60 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {faltaDocumento && (
              <p className="mt-3 text-xs text-amber-300/90">
                Completa el documento de cada acompañante para continuar.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-400/25 bg-red-950/30 px-3 py-2 text-xs text-red-200"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setResumen(false)}
                className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-bold text-white/75 transition-colors hover:bg-white/5 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando || faltaDocumento}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#7a1f3d] py-3 text-sm font-bold text-white transition-colors hover:bg-[#8f2547] disabled:opacity-40 cursor-pointer"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar y pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {listo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141013] p-6 text-center shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
              Reserva creada
            </p>
            <h2 className="mt-1 text-xl font-black text-white">Listo</h2>
            <p className="mt-2 text-sm text-white/65">
              Te bloqueamos las zonas por 10 minutos para que completes el pago.
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#e3bd74]">{cop(listo.total)}</p>
            <a
              href="/mis-reservas"
              className="mt-6 block rounded-xl bg-[#7a1f3d] py-3 text-sm font-bold text-white transition-colors hover:bg-[#8f2547]"
            >
              Ver mis reservas
            </a>
          </div>
        </div>
      )}
    </>
  );
}