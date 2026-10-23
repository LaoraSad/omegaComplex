'use client';

// Barra flotante del carrito: se ve solo cuando hay al menos una zona elegida.
// Muestra las zonas, deja quitar una, ajusta las personas y abre el resumen para
// pagar (un solo pago para todas).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Minus, Plus, Loader2, Users, Lock } from 'lucide-react';
import { cop, fechaCorta, formatoHora, useCarrito } from './CarritoReserva';

export function BarraCarrito() {
const {
    bloques,
    personas,
    totalCop,
    quitar,
    vaciar,
    setPersonas,
    setPersonasZona,
    alternarAsistente,
    carritoAbierto,
    abrirCarrito,
    cerrarCarrito,
    haySesion,
    error,
    setError,
    acompanantes: datosAcompanantes,
    escribirAcompanante,
  } = useCarrito();
  const [enviando, setEnviando] = useState(false);

  const abierto = bloques.length > 0;
  const acompanantes = datosAcompanantes;

  // Los acompanantes se derivan de las personas, no se guardan aparte: si
  useEffect(() => {
    if (!carritoAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarCarrito();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [carritoAbierto, cerrarCarrito]);

  // Cada acompañante necesita nombre Y documento. Antes solo se miraba el
  // documento de los que ya tenían nombre, así que un acompañante en blanco
  // pasaba el botón de pagar y el servidor lo rechazaba después con un error
  // que el cliente no entendía de dónde salía.
  const faltanDatos = Array.from({ length: Math.max(0, personas - 1) }, (_, i) => acompanantes[i]).filter(
    (g) => !g?.fullName?.trim() || !g?.document?.trim(),
  ).length;
  const datosCompletos = faltanDatos === 0;

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
            // Cada zona declara cuántas personas entran por su puerta y cuáles
            // son: es lo que hace que "voy solo a la cancha y con tres amigos a
            // la piscina" sea posible en un solo pago.
            personas: b.personas,
            asistentes: b.asistentes,
          })),
          personas,
          acompañantes: acompanantes
            .filter((g) => g.fullName.trim())
            .map((g) => ({ fullName: g.fullName.trim(), document: g.document.trim() })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Hay que limpiar `enviando` en CADA salida. Con un `return` sin este
        // reset la pantalla de carga se quedaba pegada para siempre y el
        // cliente quedaba atrapado sin poder reintentar ni cerrar.
        setError(json?.error?.message ?? 'No fue posible crear la reserva.');
        setEnviando(false);
        return;
      }
      const reservaId: string = json.data.reservationId;

      // Ir directo a la pasarela. Antes había que crear la reserva, saltar a
      // /mis-reservas y apretar "Pagar" ahí: dos pantallas para cobrar algo que
      // el cliente ya estaba por pagar.
      //
      // El salto a Stripe lo hace la página /pagando/[id] desde el servidor.
      // Antes se hacía con `window.location.assign` desde acá, y si algo fallaba
      // el cliente se quedaba en esta página con el carrito vacío y sin saber
      // si le cobraron. Ahora hay una pantalla real en el medio que explica qué
      // pasó y ofrece reintentar.
      vaciar();
      window.location.assign(`/pagando/${reservaId}`);
    } catch {
      setError('No fue posible conectar con el servidor.');
      setEnviando(false);
    }
  };

  // La pantalla de carga va ANTES del `if (!abierto)`: `vaciar()` deja el
  // carrito sin bloques y con ese return el aviso se perdía justo cuando más
  // se necesita.
  if (enviando) {
    return (
      <div
        role="status"
        aria-live="assertive"
        className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-[#0d0a0b]/96 px-6 text-center backdrop-blur-sm"
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#e3bd74]" />
        <p className="text-lg font-black text-white">Preparando tu pago</p>
        <p className="max-w-sm text-sm text-white/55">
          Estamos reservando tus zonas y abriendo la pasarela segura de Stripe.
        </p>
        <p className="max-w-sm text-xs text-white/35">
          No cierres esta ventana. Vas a ver la pantalla de pago en un momento.
        </p>
      </div>
    );
  }

  if (!abierto) return null;

  return (
    <>
      {/* Boton flotante compacto. La barra que habia aqui ocupaba una franja
          entera de la pantalla y tapaba el contenido; ahora solo hay un boton
          circular con el emoji del carrito y el detalle vive en el modal. */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={abrirCarrito}
          aria-label={`Abrir carrito: ${bloques.length} zonas, total ${cop(totalCop)}`}
          className="pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full border border-[#e3bd74]/40 bg-[#141013]/95 text-2xl shadow-xl shadow-black/40 backdrop-blur transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span aria-hidden="true">🛒</span>
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#7a1f3d] px-1 text-[11px] font-black text-white">
            {bloques.length}
          </span>
        </button>
      </div>

      {carritoAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Carrito de reservas"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => cerrarCarrito()}
        >
          {/* max-h y overflow propio: con muchos acompanantes el modal se limita
              a la pantalla y scrollea adentro, en vez de crecer y tapar la
              navegación. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141013] shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <h2 className="text-lg font-black text-white">Tu carrito</h2>
                <p className="mt-1 text-xs text-white/55">
                {bloques.length} {bloques.length === 1 ? 'zona' : 'zonas'} · un solo pago
              </p>
              </div>
              {!haySesion && (
                <Link
                  href="/login?next=/servicios"
                  className="shrink-0 rounded-lg bg-[#d9b56c] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#1d1214] transition-colors hover:bg-[#e9c886]"
                >
                  Iniciar sesión
                </Link>
              )}
              <button
                type="button"
                onClick={() => cerrarCarrito()}
                aria-label="Cerrar el carrito"
                className="shrink-0 rounded-lg p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">

            {/* Las zonas: una fila por puerta, con su horario, su precio y
                cuántas personas entran por ahí. */}
            <ul className="mt-4 space-y-3">
              {bloques.map((b) => (
                <li
                  key={b.clave}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e3bd74]">
                        {b.categoryName}
                      </p>
                      <p className="truncate text-sm font-bold text-white">{b.serviceName}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-white/60">
                        {fechaCorta(b.fecha)} · {formatoHora(new Date(b.etiquetaHora))} a{' '}
                        {formatoHora(new Date(b.etiquetaFin))}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-sm font-black tabular-nums text-white">
                        {cop(b.precioHora * b.personas)}
                      </span>
                      <div className="flex items-center gap-1 rounded-lg border border-white/15 px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => setPersonasZona(b.clave, b.personas - 1)}
                          disabled={b.personas <= 1}
                          aria-label={`Menos personas en ${b.serviceName}`}
                          className="rounded p-1 text-white/70 hover:bg-white/10 disabled:opacity-25 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-5 text-center text-xs font-black tabular-nums text-white">
                          {b.personas}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPersonasZona(b.clave, b.personas + 1)}
                          disabled={b.personas >= personas}
                          aria-label={`Más personas en ${b.serviceName}`}
                          className="rounded bg-white/10 p-1 text-white hover:bg-[#e3bd74] hover:text-[#1a1214] disabled:opacity-25 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quién entra por esta puerta. Cada persona del grupo marca
                      en qué zonas asiste; eso decide qué QR recibe. */}
                  {personas > 1 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                      {Array.from({ length: personas }, (_, i) => {
                        const g = acompanantes[i];
                        const nombre = i === 0 ? 'Tú' : (g?.fullName?.trim() || `Acompañante ${i}`);
                        const marca = b.asistentes.includes(i);
                        return (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => alternarAsistente(b.clave, i)}
                              aria-pressed={marca}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                marca
                                  ? 'border-[#e3bd74]/50 bg-[#e3bd74]/15 text-[#e3bd74]'
                                  : 'border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5'
                              }`}
                            >
                              {marca ? '✓' : '✕'} {nombre}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-white/45">
                      {b.personas === 1 ? '1 persona' : `${b.personas} personas`} ·{' '}
                      {cop(b.precioHora)} c/u
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(b.clave)}
                      className="text-[11px] text-white/45 underline-offset-2 hover:text-white hover:underline cursor-pointer"
                    >
                      quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tamaño del grupo. Vive acá y no en la barra porque es el único lugar donde
                se editan las personas: antes el contador estaba en la barra y
                los campos en el modal, y el cliente no encontraba dónde
                agregar acompanantes. */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <div>
                <p className="text-sm font-bold text-white">¿Cuántas personas van?</p>
                <p className="mt-0.5 text-[11px] text-white/45">
                  Tú cuentas como una. Abajo marcás en qué zonas entra cada una.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.04] py-1 pl-2.5 pr-1">
                <Users className="h-3.5 w-3.5 shrink-0 text-white/50" />
                <button
                  type="button"
                  onClick={() => setPersonas(personas - 1)}
                  disabled={personas <= 1}
                  aria-label="Quitar una persona del grupo"
                  className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span
                  aria-live="polite"
                  className="min-w-8 text-center text-base font-black tabular-nums text-white"
                >
                  {personas}
                </span>
                <button
                  type="button"
                  onClick={() => setPersonas(personas + 1)}
                  disabled={personas >= 50}
                  aria-label="Agregar una persona al grupo"
                  className="rounded-md bg-white/10 p-1.5 text-white transition-colors hover:bg-[#e3bd74] hover:text-[#1a1214] disabled:cursor-not-allowed disabled:opacity-25 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Datos de las personas del grupo. */}
            {personas > 1 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Datos de las {personas - 1} personas que te acompañan
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  Van en el QR que te enviamos al correo, así el empleado sabe a quién deja entrar.
                </p>
                {/* Aviso explícito: son datos de terceros y el cliente tiene que
                    saber que quedan guardados en el navegador y cuánto tiempo. */}
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-white/50">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Guardamos esto solo en esta pestaña, para que no tengas que escribirlo de nuevo
                    al iniciar sesión. No se comparte a otras ventanas y se borra al confirmar la
                    reserva.
                  </span>
                </p>
                <ul className="mt-3 space-y-2">
                  {Array.from({ length: personas - 1 }, (_, i) => (
                    <li
                      key={i}
                      className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 sm:grid-cols-2"
                    >
                      <input
                        value={acompanantes[i]?.fullName ?? ''}
                        onChange={(e) => escribirAcompanante(i, 'fullName', e.target.value)}
                        placeholder="Nombre completo"
                        aria-label={`Nombre del acompañante ${i + 1}`}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#e3bd74]/60 focus:outline-none"
                      />
                      <input
                        value={acompanantes[i]?.document ?? ''}
                        onChange={(e) => escribirAcompanante(i, 'document', e.target.value)}
                        placeholder="Documento"
                        aria-label={`Documento del acompañante ${i + 1}`}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#e3bd74]/60 focus:outline-none"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

{error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-400/25 bg-red-950/30 px-3 py-2 text-xs text-red-200"
              >
                {error}
              </p>
            )}
              </div>

              {/* Pie fijo: los botones no se van con el scroll, así con 20
                  acompanantes el cliente siempre ve cuánto va a pagar. */}
              <div className="shrink-0 border-t border-white/10 p-5">
                {!datosCompletos && (
                  <p className="mb-3 text-xs text-amber-300/90">
                    Completa el nombre y el documento de cada acompañante para continuar.
                  </p>
                )}
                <div className="flex items-baseline justify-between pb-3">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-2xl font-black tabular-nums text-[#e3bd74]">
                    {cop(totalCop)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cerrarCarrito()}
                    className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-bold text-white/75 transition-colors hover:bg-white/5 cursor-pointer"
                  >
                    Seguir agregando
                  </button>
                  {/* Sin sesión no se puede reservar: se ofrece entrar en lugar
                      de un "pagar" que fallaría con 401. El carrito queda
                      guardado, así que al volver sigue todo como estaba. */}
                  {haySesion ? (
                    <button
                      type="button"
                      onClick={confirmar}
                      disabled={enviando || !datosCompletos}
                      aria-busy={enviando}
                      className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#7a1f3d] py-3 text-sm font-bold text-white transition-colors hover:bg-[#8f2547] disabled:opacity-40 cursor-pointer"
                    >
                      {enviando ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparando el pago…
                        </>
                      ) : datosCompletos ? (
                        'Confirmar y pagar'
                      ) : (
                        `Faltan datos de ${faltanDatos}`
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/login?next=/servicios"
                      className="flex flex-[2] items-center justify-center rounded-xl bg-[#d9b56c] py-3 text-sm font-bold uppercase tracking-wider text-[#1d1214] transition-colors hover:bg-[#e9c886]"
                    >
                      Iniciar sesión para reservar
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      </>
  );
}
