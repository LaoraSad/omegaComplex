type Tone = "emerald" | "amber" | "rose" | "blue" | "slate" | "wine";

const RESERVATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: "Pendiente de pago", tone: "amber" },
  payment_processing: { label: "Procesando pago", tone: "blue" },
  confirmed: { label: "Confirmada", tone: "emerald" },
  payment_rejected: { label: "Rechazada", tone: "rose" },
  expired: { label: "Expirada", tone: "slate" },
  used: { label: "Utilizada", tone: "wine" },
};

const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pendiente", tone: "amber" },
  succeeded: { label: "Exitoso", tone: "emerald" },
  failed: { label: "Fallido", tone: "rose" },
};

const QR_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Activo", tone: "emerald" },
  used: { label: "Utilizado", tone: "slate" },
  expired: { label: "Expirado", tone: "amber" },
};

const ACCESS_RESULT: Record<string, { label: string; tone: Tone }> = {
  allowed: { label: "Permitido", tone: "emerald" },
  denied: { label: "Denegado", tone: "rose" },
};

const HOLD_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Activa", tone: "blue" },
  released: { label: "Liberada", tone: "slate" },
  consumed: { label: "Consumida", tone: "emerald" },
};

const CHANNEL: Record<string, { label: string; tone: Tone }> = {
  online: { label: "En línea", tone: "blue" },
  in_person: { label: "Presencial", tone: "wine" },
};

const PAYMENT_METHOD: Record<string, { label: string; tone: Tone }> = {
  card: { label: "Tarjeta", tone: "slate" },
  cash: { label: "Efectivo", tone: "slate" },
};

const MAPS = {
  reservation: RESERVATION_STATUS,
  payment: PAYMENT_STATUS,
  qr: QR_STATUS,
  access: ACCESS_RESULT,
  hold: HOLD_STATUS,
  channel: CHANNEL,
  paymentMethod: PAYMENT_METHOD,
} as const;

export type StatusBadgeKind = keyof typeof MAPS;

interface StatusBadgeProps {
  kind: StatusBadgeKind;
  value: string;
}

/** Etiqueta de estado con texto + punto (nunca depende solo del color). */
export function StatusBadge({ kind, value }: StatusBadgeProps) {
  const entry = MAPS[kind][value] ?? { label: value, tone: "slate" as Tone };
  return (
    <span className={`abadge abadge-${entry.tone}`}>
      <span aria-hidden="true" className="abadge-dot" />
      {entry.label}
    </span>
  );
}
