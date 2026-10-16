'use client';

// Selector de franjas de una instalación. Se abre desde la tarjeta del catálogo
// y agrega al carrito; no cobra nada todavía.

import { useEffect, useState } from 'react';
import { X, Loader2, CalendarPlus, CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogServiceRecord } from '@/features/catalog/catalog.types';
import type { DayAvailability } from '@/features/availability/availability.types';
import {
  esDiaDeMantenimiento,
  esFestivo,
  nombreFestivo,
  ultimoDiaReservable,
} from '@/features/schedules/colombia-holidays';
import { bloqueDesdeSlot, cop, formatoHora, useCarrito } from './CarritoReserva';

/** El SCRUM no permite reservar con más de 3 meses de anticipación. */
const MESES_MAXIMOS = 3;
const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha de hoy en Bogotá como clave YYYY-MM-DD, sin la hora de UTC. */
function hoyEnBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/** Último día que se puede reservar: hoy + 3 meses (definición única compartida). */
function limiteReserva(): string {
  return ultimoDiaReservable(hoyEnBogota());
}

/** Partir "AAAA-MM-DD" en año, mes (1-12) y día, sin salto de zona horaria. */
function partes(clave: string): [number, number, number] {
  const [y, m, d] = clave.split('-').map(Number);
  return [y, m, d];
}

/**
 * Por qué un día está cerrado, si se puede saber sin consultar el servidor.
 * El calendario de festivos es determinista, así que el cliente lo puede
 * resolver solo y avisar antes de que el usuario haga clic.
 */
/**
 * Por qué un día NO se puede elegir, si se puede saber sin consultar el
 * servidor.
 *
 * Solo el mantenimiento cierra el complejo. Un festivo no lo cierra: el festivo
 * abre el día y desplaza el mantenimiento al martes, así que un lunes festivo
 * es un día reservable normal.
 */
function motivoDeCierreDe(clave: string): string | null {
  if (esDiaDeMantenimiento(clave)) return 'Mantenim.';
  return null;
}

const DIAS_SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

/**
 * Calendario mensual para elegir el día de la reserva.
 *
 * El límite de 3 meses del SCRUM se aplica acá: al llegar al último mes
 * navigable se muestra la alerta, en vez de dejar elegir un día que el servidor
 * va a rechazar después.
 */
function CalendarioMes({ fecha, onChange }: { fecha: string; onChange: (iso: string) => void }) {
  const hoy = hoyEnBogota();
  const limite = limiteReserva();
  const [fy, fm] = partes(fecha);
  const [mesVisible, setMesVisible] = useState<[number, number]>(() => [fy, fm]);

  // El mes visible NO se sincroniza con `fecha` en un efecto: la regla
  // react-hooks/set-state-in-effect lo prohíbe. El único camino para cambiar de
  // fecha es un clic en esta misma grilla, que actualiza las dos cosas juntas.
  const elegirDia = (iso: string) => {
    const [ay, am] = partes(iso);
    setMesVisible([ay, am]);
    onChange(iso);
  };

  const ultimoMes = (() => {
    const [ly, lm] = partes(limite);
    return [ly, lm] as [number, number];
  })();

  const puedeAtras = mesVisible[0] > partes(hoy)[0] || (mesVisible[0] === partes(hoy)[0] && mesVisible[1] > partes(hoy)[1]);
  const puedeAdelante = mesVisible[0] < ultimoMes[0] || (mesVisible[0] === ultimoMes[0] && mesVisible[1] < ultimoMes[1]);
  const enElLimite = !puedeAdelante;

  // Lunes = 0 para que la semana arranque en lunes, como en Colombia.
  const primeroDelMes = new Date(Date.UTC(mesVisible[0], mesVisible[1] - 1, 1));
  const dow = (primeroDelMes.getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(mesVisible[0], mesVisible[1], 0)).getUTCDate();

  const mover = (delta: number) => {
    setMesVisible(([y, m]) => {
      const total = y * 12 + (m - 1) + delta;
      return [Math.floor(total / 12), (total % 12) + 1] as [number, number];
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => mover(-1)}
          disabled={!puedeAtras}
          aria-label="Mes anterior"
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold capitalize text-white">
          {NOMBRES_MES[mesVisible[1] - 1]} {mesVisible[0]}
        </span>
        <button
          type="button"
          onClick={() => mover(1)}
          disabled={!puedeAdelante}
          aria-label="Mes siguiente"
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
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
        {Array.from({ length: dow }, (_, i) => (
          <span key={`hueco-${i}`} />
        ))}
        {Array.from({ length: diasEnMes }, (_, i) => {
          const dia = i + 1;
          const iso = `${mesVisible[0]}-${String(mesVisible[1]).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const pasado = iso < hoy;
          const muyLejos = iso > limite;
          const cerrado = motivoDeCierreDe(iso);
          // Un festivo ABRE el complejo: solo desplaza el mantenimiento. Se
          // marca con su nombre para que el cliente entienda por qué ese lunes
          // está disponible si de costumbre está cerrado.
          const festivo = esFestivo(iso);
          const etiqueta = festivo ? (nombreFestivo(iso) ?? 'Festivo') : null;
          const elegido = iso === fecha;
          const bloqueado = pasado || muyLejos || Boolean(cerrado);

          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueado}
              onClick={() => elegirDia(iso)}
              aria-current={elegido ? 'date' : undefined}
              title={cerrado ? 'Jornada de mantenimiento' : etiqueta ?? undefined}
              className={`relative aspect-square rounded-lg text-xs font-bold tabular-nums transition-colors ${
                elegido
                  ? 'bg-[#e3bd74] text-[#1a1214] cursor-pointer'
                  : bloqueado
                    ? 'cursor-not-allowed text-white/20'
                    : 'text-white/80 hover:bg-white/10 cursor-pointer'
              }`}
            >
              {dia}
              {cerrado && !elegido && (
                <span className="absolute inset-x-1 bottom-1 mx-auto h-1 w-1 rounded-full bg-white/25" />
              )}
              {festivo && !cerrado && !elegido && (
                <span className="absolute right-1 top-1 text-[0.5rem] text-[#e3bd74]">◆</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/45">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" /> Cerrado
        </span>
        <span>Máximo {MESES_MAXIMOS} meses de anticipación</span>
      </div>

      {enElLimite && (
        <p
          role="status"
          className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#e3bd74]/25 bg-[#e3bd74]/10 px-2.5 py-2 text-[11px] text-[#e3bd74]"
        >
          <CalendarOff className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Llegaste al límite: no se puede reservar con más de {MESES_MAXIMOS} meses de
            anticipación. Elige una fecha más cercana.
          </span>
        </p>
      )}
    </div>
  );
}

function AvisoSinFranjas({ dia }: { dia: DayAvailability | null }) {
  if (!dia) {
    return <p className="py-8 text-center text-sm text-white/60">No se pudo consultar ese día.</p>;
  }

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

  // Cada motivo tiene su propio mensaje. Antes todo caía en "No hay franjas
  // para ese día", que ocultaba que el complejo estaba cerrado por festivo o
  // por mantenimiento, y hacía pensar al cliente que la instalación estaba llena.
  const textos: Record<string, { titulo: string; detalle: string }> = {
    festivo: {
      titulo: dia.reason ?? 'Festivo nacional',
      detalle: 'El complejo no opera en días festivos.',
    },
    mantenimiento: {
      titulo: 'Jornada de mantenimiento',
      detalle:
        'El complejo permanece cerrado por mantenimiento técnico. Si ese día es festivo, el mantenimiento se hace el martes.',
    },
    cierre_admin: {
      titulo: dia.reason ?? 'Instalación cerrada',
      detalle: 'El administrador la cerró temporalmente. Elige otra fecha.',
    },
    servicio_inactivo: {
      titulo: 'Instalación no disponible',
      detalle: 'Esta instalación está desactivada por el administrador. Elige otra.',
    },
    sin_horario: { titulo: 'Cerrado este día', detalle: 'Esta instalación no atiende hoy.' },
    horario_invalido: { titulo: 'Horario no válido', detalle: 'Elige otra fecha.' },
    sin_franjas: { titulo: 'Sin franjas', detalle: 'Ese día no tiene franjas generadas.' },
    franjas_terminadas: {
      titulo: 'Se acabaron las franjas',
      detalle:
        dia.date === hoy
          ? `Ya terminó el horario de hoy (cierra a las ${dia.closeTime ?? '17:00'}). Elige otra fecha.`
          : 'Todas las franjas de ese día están ocupadas.',
    },
  };

  // Sin motivo conocido: el servidor está desactualizado o la respuesta vino
  // rara. Se dice eso en vez de "no hay franjas", que es justo lo que hizo creer
  // al cliente que la instalación estaba agotada cuando el día abría normal.
  const texto =
    textos[dia.motivo ?? ''] ?? {
      titulo: 'No pudimos leer la disponibilidad de ese día',
      detalle: 'Prueba con otra fecha o recarga la página.',
    };

  return (
    <div className="py-8 text-center">
      <CalendarOff className="mx-auto h-8 w-8 text-white/30" />
      <p className="mt-3 text-sm font-bold text-white/85">{texto.titulo}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-white/55">{texto.detalle}</p>
    </div>
  );
}

export function SelectorFranjas({
  servicio,
  onClose,
}: {
  servicio: CatalogServiceRecord;
  onClose: () => void;
}) {
  const { agregar, yaEsta, quitar, abrirCarrito, bloques } = useCarrito();
  const [fecha, setFecha] = useState(hoyEnBogota());
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
    setAviso(
      r.ok
        ? `${servicio.name} ${formatoHora(slot.startsAt)} a ${formatoHora(slot.endsAt)} agregada.`
        : r.message,
    );
  };

  /** Quita una franja del carrito y avisa, para que quede claro qué pasó. */
  const quitarFranja = (slot: DayAvailability['slots'][number]) => {
    const bloque = bloques.find((b) => b.slotId === slot.id);
    quitar(bloque?.clave ?? '');
    setAviso(
      `${servicio.name} ${formatoHora(slot.startsAt)} a ${formatoHora(slot.endsAt)} quitada del carrito.`,
    );
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
            <div className="mt-4">
              <CalendarioMes
                fecha={fecha}
                onChange={(nueva) => {
                  setFecha(nueva);
                  setAviso('');
                }}
              />
            </div>

            <div className="mt-4">
              {cargando ? (
                <p className="flex items-center justify-center gap-2 py-8 text-center text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando disponibilidad…
                </p>
              ) : !dia || !dia.hayDisponibilidad ? (
                <AvisoSinFranjas dia={dia} />
              ) : (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
                    Elige la franja de 1 hora
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {dia.slots.map((s) => {
                      const ocupado = yaEsta(s.id);
                      const lleno = s.free <= 0;
                      // Una franja que ya terminó no se puede agregar aunque le
                      // queden cupos: el servidor la rechaza igual, pero ofrecerla
                      // llenaría el carrito de horas imposibles.
                      const pasado = s.status === 'past';
                      // Una franja ya elegida NO se deshabilita: se puede volver
                      // a tocar para quitarla del carrito. Antes salía deshabilitada
                      // con aspecto de "ocupada" y quien cambiaba de opinión no
                      // tenía forma de deshacerla.
                      const deshabilitado = lleno || pasado;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            disabled={deshabilitado}
                            aria-pressed={ocupado}
                            title={
                              ocupado
                                ? 'Quitar del carrito'
                                : deshabilitado
                                  ? 'No disponible'
                                  : 'Agregar al carrito'
                            }
                            onClick={() => (ocupado ? quitarFranja(s) : agregarFranja(s))}
                            className={`relative w-full rounded-lg border px-2 py-2.5 text-center transition-colors ${
                              ocupado
                                ? 'cursor-pointer border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-200'
                                : lleno || pasado
                                  ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
                                  : 'cursor-pointer border-white/10 bg-white/[0.04] text-white hover:border-[#e3bd74]/50 hover:bg-white/10'
                            }`}
                          >
                            {/* Marca de "en tu carrito" con una X: sin un gesto
                                explícito no se entiende que tocarlo la quita. */}
                            {ocupado ? (
                              <span
                                aria-hidden="true"
                                className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500/25 text-[10px] font-bold text-emerald-200"
                              >
                                ×
                              </span>
                            ) : null}
                            {/* Rango completo: la franja es de 1 hora y el
                                cliente tiene que ver hasta cuándo entra. */}
                            <span className="block text-sm font-bold tabular-nums">
                              {formatoHora(s.startsAt)}
                            </span>
                            <span className="block text-[0.65rem] tabular-nums text-white/45">
                              a {formatoHora(s.endsAt)}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-white/50">
                              {ocupado
                                ? 'En el carrito'
                                : pasado
                                  ? 'Terminó'
                                  : lleno
                                  ? 'Completa'
                                  : `${s.free} libres`}
                          </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {aviso && (
              <p role="status" className="mt-4 rounded-lg border border-[#e3bd74]/25 bg-[#e3bd74]/10 px-3 py-2 text-xs text-[#e3bd74]">
                {aviso}
              </p>
            )}
          </div>

<footer className="border-t border-white/10 p-5">
              {/* Seguir comprando antes que ir al carrito: armando varias
                  atracciones se llega acá varias veces, y si el único camino es
                  "Listo" el cliente tiene que cerrar el modal del carrito y
                  volver a abrir el selector cada vez. */}
              <button
                type="button"
                onClick={onClose}
                className="mb-2 w-full cursor-pointer rounded-xl border border-white/15 bg-white/[0.04] py-3 text-sm font-bold text-white transition-colors hover:border-[#e3bd74]/50 hover:bg-white/10"
              >
                Seguir comprando
              </button>
              <button
                type="button"
                disabled={bloques.length === 0}
                onClick={() => {
                  // Antes solo cerraba el selector y el carrito quedaba oculto
                  // detras: el cliente pensaba que el boton no funcionaba. Ahora
                  // cierra esta pantalla y abre el carrito, que es lo que dice.
                  onClose();
                  abrirCarrito();
                }}
                className="w-full cursor-pointer rounded-xl bg-[#7a1f3d] py-3 text-sm font-bold text-white transition-colors hover:bg-[#8f2547] disabled:cursor-not-allowed disabled:opacity-40"
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