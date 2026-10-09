"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Loader2,
  QrCode,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { etiquetaEstado, fecha, hora, type MisReserva } from "./reservas-view";

// ---------------------------------------------------------------------------
// Panel del cliente.
//
// Tema oscuro como el resto del storefront (.storefront-shell y
// .omega-dark-section): fondo #0e0b0d y texto #f5f1ec.
// ---------------------------------------------------------------------------

interface Props {
  reservas: MisReserva[];
}

export default function MisReservasView({ reservas }: Props) {
  const [pestana, setPestana] = useState<"futuras" | "historial">("futuras");
  const [pagando, setPagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  async function iniciarPago(id: string) {
    setAviso("");
    setPagando(id);
    try {
      const respuesta = await fetch(`/api/reservations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await respuesta.json();

      if (respuesta.ok) {
        // Cuando Stripe esté montado devolverá la url de checkout.
        const url = json?.data?.checkoutUrl as string | undefined;
        if (url) {
          window.location.assign(url);
          return;
        }
      }
      setAviso(json?.error?.message ?? "No se pudo iniciar el pago.");
    } catch {
      setAviso("Sin conexión con el servidor.");
    } finally {
      setPagando(null);
    }
  }

  const futuras = reservas.filter(
    (r) => r.esFutura && r.estado !== "used" && r.estado !== "expired",
  );
  const historial = reservas.filter(
    (r) => !r.esFutura || r.estado === "used" || r.estado === "expired",
  );
  const pendientes = reservas.filter((r) => r.estado === "pending_payment");
  const visibles = pestana === "futuras" ? futuras : historial;

  return (
    <div className="mega-dark-section relative min-h-screen overflow-hidden bg-[#0e0b0d] text-white">
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e3bd74]">
            Panel del cliente
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Mis reservas
          </h1>
          <p className="max-w-2xl text-sm text-white/60 sm:text-base">
            Consulta tus reservas vigentes, completa los pagos pendientes y revisa el estado de tus
            pases de acceso.
          </p>
        </header>

        {pendientes.length > 0 ? (
          <p
            role="status"
            className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />
            Tienes {pendientes.length} reserva{pendientes.length === 1 ? "" : "s"} sin pagar. Te
            guardamos el cupo 10 minutos desde que la creaste.
          </p>
        ) : null}

        {aviso ? (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            {aviso}
          </p>
        ) : null}

        <div className="mt-8 flex gap-6 border-b border-white/10">
          <PestanaButton
            activo={pestana === "futuras"}
            onClick={() => setPestana("futuras")}
            icono={<Calendar className="h-4 w-4" />}
            texto={`Próximas (${futuras.length})`}
          />
          <PestanaButton
            activo={pestana === "historial"}
            onClick={() => setPestana("historial")}
            icono={<History className="h-4 w-4" />}
            texto={`Historial (${historial.length})`}
          />
        </div>

        {visibles.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibles.map((r) => (
              <Tarjeta
                key={r.id}
                r={r}
                pagando={pagando === r.id}
                onPagar={() => iniciarPago(r.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-white/30" />
            <h2 className="text-lg font-bold text-white">
              {pestana === "futuras" ? "No tienes reservas próximas" : "Tu historial está vacío"}
            </h2>
            <p className="text-xs text-white/50">
              Explora las canchas, piscinas y zonas de bienestar para programar tu próxima visita.
            </p>
            <Link
              href="/servicios"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7a1f3d] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#631730]"
            >
              Explorar servicios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function PestanaButton({
  activo,
  onClick,
  icono,
  texto,
}: {
  activo: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={`flex cursor-pointer items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-colors ${
        activo
          ? "border-[#e3bd74] text-[#e3bd74]"
          : "border-transparent text-white/55 hover:text-white"
      }`}
    >
      {icono}
      <span>{texto}</span>
    </button>
  );
}

function Tarjeta({
  r,
  pagando,
  onPagar,
}: {
  r: MisReserva;
  pagando: boolean;
  onPagar: () => void;
}) {
  const estado = etiquetaEstado(r.estado);
  const IconoEstado =
    r.estado === "confirmed"
      ? CheckCircle2
      : r.estado === "pending_payment"
        ? AlertCircle
        : r.estado === "payment_rejected"
          ? XCircle
          : null;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#141013] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/40">
            Ref {r.id.slice(0, 8)}
          </p>
          <h3 className="mt-1 truncate text-base font-black uppercase text-white">
            {r.nombreServicio}
          </h3>
          <p className="text-xs font-bold text-[#e3bd74]">{r.nombreCategoria}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold ${estado.clases}`}
        >
          {IconoEstado ? <IconoEstado className="mr-1 inline h-3 w-3" /> : null}
          {estado.texto}
        </span>
      </div>

      <dl className="space-y-2 rounded-xl bg-white/[0.04] p-3.5 text-sm">
        <Fila icono={<Calendar className="h-3.5 w-3.5" />} etiqueta="Fecha" valor={fecha(r)} />
        <Fila icono={<Clock className="h-3.5 w-3.5" />} etiqueta="Horario" valor={hora(r.inicia, r.termina)} />
        <Fila icono={<Users className="h-3.5 w-3.5" />} etiqueta="Personas" valor={`${r.cupos}`} />
        <Fila icono={<Ticket className="h-3.5 w-3.5" />} etiqueta="Total" valor={r.total} />
      </dl>

      {/* Acción principal según el estado. */}
      {r.estado === "pending_payment" ? (
        <button
          type="button"
          onClick={onPagar}
          disabled={pagando}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7a1f3d] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#631730] disabled:opacity-60"
        >
          {pagando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {pagando ? "Conectando…" : "Pagar esta reserva"}
        </button>
      ) : null}

      {r.qrVigente ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-200">
            <QrCode className="h-3.5 w-3.5" />
            {r.qrEmitidos} pase(s) vigente(s)
          </p>
          <p className="mt-1 text-[0.7rem] text-emerald-100/70">
            {r.qrReferencia} · {r.qrUsados} ya usado(s)
          </p>
        </div>
      ) : r.estado === "used" ? (
        <p className="rounded-xl bg-white/[0.04] py-2 text-center text-xs font-medium text-white/50">
          Acceso completado
        </p>
      ) : r.pagado ? (
        <p className="rounded-xl bg-white/[0.04] py-2 text-center text-xs font-medium text-white/50">
          Sin QR disponible
        </p>
      ) : null}

      {r.estado === "pending_payment" ? (
        <p className="text-center text-[0.68rem] leading-relaxed text-white/35">
          El QR se genera al confirmar el pago.
        </p>
      ) : null}
    </article>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-white/50">
        {icono}
        <span className="text-xs">{etiqueta}</span>
      </dt>
      <dd className="text-xs font-bold text-white/90">{valor}</dd>
    </div>
  );
}