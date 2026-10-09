// Se usa el formateador de 24 h del módulo de acceso, no el del panel: así el
// cliente ve "08:00 - 09:00" igual que en el catálogo y en el modal, y no
// "8:00 a. m. a 9:00 a. m.".
import { formatClock } from "@/features/access/access-dates";
import { formatCOP, formatDate } from "@/components/admin/format";
import type { CustomerReservation } from "@/features/reservations/reservations.repository";

/** Reserva serializada al cliente: evita mandar Date por la frontera RSC. */
export type MisReserva = {
  id: string;
  estado: string;
  serviceId: string;
  nombreServicio: string;
  nombreCategoria: string;
  slugCategoria: string;
  inicia: string;
  termina: string;
  cupos: number;
  total: string;
  /** Cantidad de QR emitidos; 0 si todavia no se pagaron. */
  qrEmitidos: number;
  qrUsados: number;
  /** Referencia corta del QR activo, para mostrarlo sin exponer el token. */
  qrReferencia: string | null;
  qrVigente: boolean;
  pagado: boolean;
  esFutura: boolean;
};

const ETIQUETA: Record<string, { texto: string; clases: string }> = {
  pending_payment: {
    texto: "Pendiente de pago",
    clases: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  },
  payment_processing: {
    texto: "Pago en proceso",
    clases: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  },
  confirmed: {
    texto: "Confirmada",
    clases: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  },
  payment_rejected: {
    texto: "Pago rechazado",
    clases: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  },
  expired: { texto: "Expirada", clases: "border-white/15 bg-white/5 text-white/60" },
  used: { texto: "Utilizada", clases: "border-white/15 bg-white/5 text-white/60" },
};

export function etiquetaEstado(estado: string) {
  return (
    ETIQUETA[estado] ?? {
      texto: estado,
      clases: "border-gray-200 bg-gray-100 text-gray-700",
    }
  );
}

/** Convierte una reserva de Prisma en el shape que usa la vista. */
export function toMisReserva(r: CustomerReservation, now = new Date()): MisReserva {
  const usados = r.qrTokens.filter((q) => q.status === "used").length;
  const vigente = r.qrTokens.filter((q) => q.status === "active").length;

  return {
    id: r.id,
    estado: r.status,
    serviceId: r.serviceId,
    nombreServicio: r.service.name,
    nombreCategoria: r.service.category.name,
    slugCategoria: r.service.category.slug,
    inicia: r.startsAt.toISOString(),
    termina: r.endsAt.toISOString(),
    cupos: r.quantity,
    total: formatCOP(r.totalCop),
    qrEmitidos: r.qrTokens.length,
    qrUsados: usados,
    qrReferencia: vigente > 0 ? `#${r.qrTokens.find((q) => q.status === "active")!.seqNo}` : null,
    qrVigente: vigente > 0,
    pagado: r.payments.some((p) => p.status === "succeeded"),
    esFutura: r.endsAt >= now,
  };
}

export function fecha(reserva: MisReserva): string {
  return formatDate(reserva.inicia);
}

export function hora(inicio: string, fin: string): string {
  return `${formatClock(inicio)} – ${formatClock(fin)}`;
}

export function formatearFechaCorta(iso: string): string {
  return formatDate(iso);
}