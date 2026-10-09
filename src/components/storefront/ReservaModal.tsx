"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Minus,
  Plus,
  Ticket,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Modal de reserva (SCRUM sección 9).
//
// Captura: instalación, fecha, franja, cuántas personas y los acompañantes.
// La franja y los cupos salen de /api/availability, que ya lee la base real.
// El titular es el de la sesión: el cliente solo escribe los acompañantes.
//
// NO hace: cobrar, emitir QR ni enviar correo. Eso lo implementa el equipo con
// Stripe y n8n; aquí la reserva queda bloqueada 10 minutos en pending_payment.
// ---------------------------------------------------------------------------

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  free: number;
  status: "available" | "full" | "past";
}

interface Dia {
  serviceId: string;
  serviceName: string;
  date: string;
  capacity: number;
  open: boolean;
  reason: string | null;
  closureReason: string | null;
  slots: Slot[];
}

interface Acompanante {
  fullName: string;
  document: string;
}

export interface ReservaModalProps {
  serviceId: string;
  serviceName: string;
  precioHora: number;
  onClose: () => void;
  onReservado?: (res: { reservationId: string; totalCop: number; personas: number }) => void;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function isoHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fecha local, no UTC: el día que ve el cliente es el suyo. */
function isoFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** El SCRUM no permite pasar de 3 meses. */
function isoMaximo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return isoFecha(d);
}

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return `${fecha.getDate()} de ${MESES[m - 1]} de ${fecha.getFullYear()}`;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
}

function cop(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function ReservaModal({
  serviceId,
  serviceName,
  precioHora,
  onClose,
  onReservado,
}: ReservaModalProps) {
  const [fecha, setFecha] = useState(isoHoy());
  const [datos, setDatos] = useState<{ clave: string; dia: Dia | null } | null>(null);
  const [seleccion, setSeleccion] = useState<{ clave: string; slotId: string } | null>(null);
  const [personas, setPersonas] = useState(1);
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState<{ reservationId: string; totalCop: number; personas: number } | null>(null);

  // "Cargando" y "franja elegida" se derivan de la clave actual en lugar de
  // resetear estado dentro del efecto: así no hay setState síncrono y, al
  // cambiar de fecha, la selección anterior se descarta sola.
  const clave = `${serviceId}|${fecha}`;
  const cargando = datos?.clave !== clave;
  const dia = datos?.clave === clave ? datos.dia : null;
  const slotId = seleccion?.clave === clave ? seleccion.slotId : null;

  // ---------- disponibilidad real ----------
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/availability?serviceId=${serviceId}&fecha=${fecha}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (controller.signal.aborted) return;
        setDatos({ clave, dia: json?.data ? (json.data as Dia) : null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setDatos({ clave, dia: null });
      });

    return () => controller.abort();
  }, [serviceId, fecha, clave]);

  // Cierra con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const slotElegido = useMemo(
    () => dia?.slots.find((s) => s.id === slotId) ?? null,
    [dia, slotId],
  );

  const cuposDisponibles = slotElegido?.free ?? 0;
  const horas = slotElegido
    ? Math.max(1, Math.round((new Date(slotElegido.endsAt).getTime() - new Date(slotElegido.startsAt).getTime()) / 3_600_000))
    : 1;
  const total = precioHora * horas * personas;

  // ---------- acompañantes ----------
  function cambiarPersonas(nueva: number) {
    const tope = Math.min(50, Math.max(cuposDisponibles, 1));
    const valor = Math.max(1, Math.min(nueva, tope));
    setPersonas(valor);
    setAcompanantes((current) => {
      const faltan = valor - 1;
      if (current.length > faltan) return current.slice(0, faltan);
      // Rellena las filas nuevas vacias para no tener que escribirlas a mano.
      const agregadas = [...current];
      while (agregadas.length < faltan) agregadas.push({ fullName: "", document: "" });
      return agregadas;
    });
  }

  function actualizarAcompanante(indice: number, campo: keyof Acompanante, valor: string) {
    setAcompanantes((current) =>
      current.map((a, i) => (i === indice ? { ...a, [campo]: valor } : a)),
    );
  }

  const puedeConfirmar =
    Boolean(slotElegido) &&
    !enviando &&
    personas <= cuposDisponibles &&
    acompanantes.every((a) => a.fullName.trim().length >= 3 && a.document.trim().length >= 5);

  const enviar = useCallback(async () => {
    if (!slotId) return;
    setEnviando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloques: [
            {
              serviceId,
              slotId,
              fecha,
            },
          ],
          personas,
          acompañantes: acompanantes.map((a) => ({
            fullName: a.fullName.trim(),
            document: a.document.trim(),
          })),
        }),
      });
      const json = await respuesta.json();

      if (!respuesta.ok || json?.error) {
        setError(json?.error?.message ?? "No se pudo crear la reserva.");
        // Si se fue la disponibilidad, se recarga el día.
        if (respuesta.status === 409) setSeleccion(null);
        return;
      }

      const datos = {
        reservationId: json.data.reservationId as string,
        totalCop: json.data.totalCop as number,
        personas: json.data.personas as number,
      };
      setListo(datos);
      onReservado?.(datos);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  }, [serviceId, slotId, fecha, personas, acompanantes, onReservado]);

  // ---------- vista de éxito ----------
  if (listo) {
    return (
      <Overlay onClose={onClose} ancho="max-w-md">
        <div className="p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-xl font-black text-white">Reserva creada</h2>
          <p className="mt-2 text-sm text-white/70">
            {fechaLarga(fecha)} · {slotElegido ? `${hora(slotElegido.startsAt)} – ${hora(slotElegido.endsAt)}` : ""}
          </p>
          <dl className="mx-auto mt-5 max-w-xs space-y-2 text-sm">
            <Fila label="Personas" valor={String(listo.personas)} />
            <Fila label="Total" valor={cop(listo.totalCop)} />
          </dl>
          <p className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100/90">
            La franja quedó bloqueada 10 minutos mientras completas el pago. Te enviaremos los QR
            por correo, uno por cada persona.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[#7a1f3d] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#631730]"
          >
            Listo
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#e3bd74]">
              Reservar
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-white">{serviceName}</h2>
            <p className="mt-0.5 text-sm text-white/55">{cop(precioHora)} por hora · por persona</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Paso 1: fecha */}
        <section className="mt-6">
          <Etiqueta icon={<CalendarDays className="h-3.5 w-3.5" />}>1 · Fecha</Etiqueta>
          <Calendario
            fecha={fecha}
            minimo={isoHoy()}
            maximo={isoMaximo()}
            onChange={(nueva) => setFecha(nueva)}
          />
        </section>

        {/* Paso 2: franja */}
        <section className="mt-6">
          <Etiqueta icon={<Clock className="h-3.5 w-3.5" />}>2 · Franja horaria</Etiqueta>

          {cargando ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Consultando disponibilidad…
            </p>
          ) : !dia ? (
            <Aviso>No se pudo consultar la disponibilidad.</Aviso>
          ) : !dia.open ? (
            <Aviso>{dia.closureReason ? `Bloqueada: ${dia.closureReason}` : dia.reason ?? "No hay franjas este día."}</Aviso>
          ) : (
            <>
              <p className="mt-1.5 text-xs text-white/45">
                {fechaLarga(fecha)} · {dia.slots.filter((s) => s.status === "available").length} franjas
                disponibles
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dia.slots.map((slot) => {
                  const elegido = slot.id === slotId;
                  const bloqueada = slot.status !== "available";
                  return (
                    <li key={slot.id}>
                      <button
                        type="button"
                        disabled={bloqueada}
                        onClick={() => setSeleccion({ clave, slotId: slot.id })}
                        aria-pressed={elegido}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          elegido
                            ? "border-[#e3bd74] bg-[#e3bd74]/15"
                            : bloqueada
                              ? "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-50"
                              : "border-white/15 hover:border-white/35"
                        }`}
                      >
                        <span className="block text-sm font-bold tabular-nums text-white">
                          {hora(slot.startsAt)} – {hora(slot.endsAt)}
                        </span>
                        <span className="mt-0.5 block text-[0.7rem] text-white/50">
                          {bloqueada
                            ? slot.status === "full"
                              ? "Completa"
                              : "Ya pasó"
                            : `${slot.free} de ${slot.capacity} libres`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Paso 3: personas */}
        <section className="mt-6">
          <Etiqueta icon={<Users className="h-3.5 w-3.5" />}>3 · ¿Cuántas personas?</Etiqueta>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => cambiarPersonas(personas - 1)}
              disabled={personas <= 1}
              aria-label="Quitar una persona"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white transition-colors hover:border-white/35 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[5rem] text-center text-2xl font-black tabular-nums text-white">
              {personas}
            </span>
            <button
              type="button"
              onClick={() => cambiarPersonas(personas + 1)}
              disabled={personas >= cuposDisponibles}
              aria-label="Agregar una persona"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white transition-colors hover:border-white/35 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            {slotElegido ? (
              <span className="text-xs text-white/45">máximo {cuposDisponibles} en esta franja</span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-white/45">
            Cada persona recibe su propio QR para el ingreso.
          </p>
        </section>

        {/* Paso 4: acompañantes */}
        {personas > 1 ? (
          <section className="mt-6">
            <Etiqueta icon={<UserPlus className="h-3.5 w-3.5" />}>
              4 · Acompañantes ({acompanantes.length})
            </Etiqueta>
            <p className="mt-1.5 text-xs text-white/45">
              Nombre y documento de cada acompañante. Tú ya estás en la reserva.
            </p>
            <ul className="mt-3 space-y-2">
              {acompanantes.map((a, i) => (
                <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_9rem]">
                  <label className="block">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-white/45">
                      Acompañante {i + 1} · nombre
                    </span>
                    <input
                      value={a.fullName}
                      onChange={(e) => actualizarAcompanante(i, "fullName", e.target.value)}
                      placeholder="Nombre y apellido"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#e3bd74] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-white/45">
                      Documento
                    </span>
                    <input
                      value={a.document}
                      onChange={(e) => actualizarAcompanante(i, "document", e.target.value)}
                      placeholder="CC o NIT"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#e3bd74] focus:outline-none"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Resumen */}
        {slotElegido ? (
          <section className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Fila label="Instalación" valor={serviceName} />
            <Fila label="Franja" valor={`${hora(slotElegido.startsAt)} – ${hora(slotElegido.endsAt)}`} />
            <Fila label="Personas" valor={`${personas} × ${cop(precioHora)}`} />
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Ticket className="h-4 w-4 text-[#e3bd74]" /> Total
              </span>
              <span className="text-lg font-black tabular-nums text-[#e3bd74]">{cop(total)}</span>
            </div>
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void enviar()}
          disabled={!puedeConfirmar}
          className="mt-5 w-full rounded-xl bg-[#7a1f3d] px-4 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#631730] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {enviando ? "Creando reserva…" : slotElegido ? `Reservar por ${cop(total)}` : "Elige una franja"}
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-white/35">
          La franja se bloquea 10 minutos mientras completas el pago.
        </p>
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function aIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lunes = 0, para que la semana empiece en lunes como en el calendario de la BD. */
function diaSemana(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Calendario({
  fecha,
  minimo,
  maximo,
  onChange,
}: {
  fecha: string;
  minimo: string;
  maximo: string;
  onChange: (iso: string) => void;
}) {
  const [mesVisible, setMesVisible] = useState(() => {
    const [y, m] = fecha.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  const minimoDate = new Date(`${minimo}T00:00:00`);
  const maximoDate = new Date(`${maximo}T00:00:00`);
  const seleccionada = new Date(`${fecha}T00:00:00`);

  // Solo se puede navegar dentro del rango permitido.
  const primero = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const ultimo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
  const puedeAtras = primero > new Date(minimoDate.getFullYear(), minimoDate.getMonth(), 1);
  const puedeAdelante = ultimo < maximoDate;

  const diasDelMes: Date[] = [];
  for (let i = 0; i < ultimo.getDate(); i++) {
    diasDelMes.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), i + 1));
  }
  // Cuántos huecos antes del día 1 para alinear con lunes.
  const relleno = diaSemana(diasDelMes[0]);

  return (
    <div className="mt-2 rounded-xl border border-white/15 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!puedeAtras}
          onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))}
          aria-label="Mes anterior"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/80 transition-colors hover:border-white/35 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold capitalize text-white">
          {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </p>
        <button
          type="button"
          disabled={!puedeAdelante}
          onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))}
          aria-label="Mes siguiente"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/80 transition-colors hover:border-white/35 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="text-[0.6rem] font-bold uppercase tracking-wider text-white/35">
            {d}
          </span>
        ))}
        {Array.from({ length: relleno }, (_, i) => (
          <span key={`hueco-${i}`} />
        ))}
        {diasDelMes.map((d) => {
          const iso = aIso(d);
          const fueraDeRango = d < minimoDate || d > maximoDate;
          const elegido = mismoDia(d, seleccionada);
          return (
            <button
              key={iso}
              type="button"
              disabled={fueraDeRango}
              onClick={() => onChange(iso)}
              aria-current={elegido ? "date" : undefined}
              className={`aspect-square rounded-lg text-xs font-bold tabular-nums transition-colors ${
                elegido
                  ? "bg-[#e3bd74] text-[#1a1214]"
                  : fueraDeRango
                    ? "cursor-not-allowed text-white/15"
                    : "text-white/80 hover:bg-white/10"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-white/40">{fechaLarga(fecha)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function Overlay({
  children,
  onClose,
  ancho = "max-w-2xl",
}: {
  children: React.ReactNode;
  onClose: () => void;
  /** La caja se ajusta al contenido: el aviso de éxito es mucho más angosto. */
  ancho?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reservar"
      // En escritorio se centra vertical; en movil sube al inicio para que el
      // teclado no tape el formulario.
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${ancho} rounded-2xl border border-white/10 bg-[#141013] shadow-2xl sm:my-0`}
      >
        {children}
      </div>
    </div>
  );
}

function Etiqueta({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white/70">
      {icon}
      {children}
    </h3>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/55">
      {children}
    </p>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-right font-semibold text-white/90">{valor}</span>
    </div>
  );
}