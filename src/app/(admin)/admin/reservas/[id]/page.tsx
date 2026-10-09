import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hourglass } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCOP,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  fullName,
} from "@/components/admin/format";
import { getReservationDetail } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Detalle de reserva" };

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservaDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const r = await getReservationDetail(id);
  if (!r) notFound();

  const activeHold = r.holds.find((h) => h.status === "active");

  return (
    <div className="space-y-6">
      <Link href="/admin/reservas" className="abtn abtn-secondary" style={{ width: "fit-content" }}>
        <ArrowLeft className="h-4 w-4" />
        Volver a reservas
      </Link>

      <PageHeader
        eyebrow="Reserva"
        title={`${fullName(r.customer.user.firstName, r.customer.user.lastName)} · ${r.service.name}`}
        description={`Creada el ${formatDateTime(r.createdAt)} · ${formatNumber(r.quantity)} ${r.quantity === 1 ? "cupo" : "cupos"} · ${formatCOP(r.totalCop)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge kind="reservation" value={r.status} />
            <StatusBadge kind="channel" value={r.channel} />
          </div>
        }
      />

      {activeHold ? (
        <p className="aalert aalert-info flex items-center gap-2">
          <Hourglass className="h-4 w-4 shrink-0" />
          Retención temporal activa: vence el {formatDateTime(activeHold.expiresAt)}. Al expirar se
          libera la disponibilidad y el cliente puede reintentar.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section aria-label="Cliente y servicio" className="acard acard-pad space-y-5">
          <div>
            <h2 className="acard-title">Cliente</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Nombre</dt>
                <dd className="font-semibold">{fullName(r.customer.user.firstName, r.customer.user.lastName)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Documento</dt>
                <dd className="font-semibold">{r.customer.document ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Correo</dt>
                <dd className="max-w-[60%] truncate font-semibold">{r.customer.user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Teléfono</dt>
                <dd className="font-semibold">{r.customer.user.phone ?? "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-[#f0e9e6] pt-4">
            <h2 className="acard-title">Servicio y horario</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Servicio</dt>
                <dd className="font-semibold">{r.service.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Categoría</dt>
                <dd className="font-semibold">{r.service.category.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Fecha</dt>
                <dd className="font-semibold">{formatDate(r.startsAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f625e]">Hora</dt>
                <dd className="font-semibold">
                  {formatTime(r.startsAt)} – {formatTime(r.endsAt)}
                </dd>
              </div>
              {r.creator ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6f625e]">Venta física por</dt>
                  <dd className="font-semibold">
                    {fullName(r.creator.firstName, r.creator.lastName)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section aria-label="Pagos" className="acard acard-pad">
          <h2 className="acard-title">Pagos · COP con tarjeta</h2>
          <p className="acard-sub">Intentos registrados para esta reserva.</p>
          {r.payments.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#f0e9e6]">
              {r.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="anum text-sm font-bold">{formatCOP(p.amountCop)}</p>
                    <p className="text-xs text-[#6f625e]">
                      <StatusBadge kind="paymentMethod" value={p.method} /> · {formatDateTime(p.createdAt)}
                      {p.paidAt ? ` · pagado ${formatDateTime(p.paidAt)}` : ""}
                    </p>
                  </div>
                  <StatusBadge kind="payment" value={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#6f625e]">Esta reserva no tiene pagos registrados.</p>
          )}
        </section>
      </div>

      <section aria-label="QR y accesos" className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Códigos QR y accesos</h2>
            <p className="acard-sub">
              Cada entrada tiene su propio QR de un solo uso. Sin reingreso ni reactivaciones.
            </p>
          </div>
          <span className="abadge abadge-slate">
            {formatNumber(r.qrTokens.length)} {r.qrTokens.length === 1 ? "código" : "códigos"}
          </span>
        </div>
        {r.qrTokens.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {r.qrTokens.map((qr) => (
              <li key={qr.id} className="rounded-[10px] border border-[#f0e9e6] bg-[#faf8f7] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">QR #{qr.seqNo}</p>
                  <StatusBadge kind="qr" value={qr.status} />
                </div>
                {qr.accesses.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {qr.accesses.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#6f625e]">
                          {formatDateTime(a.accessedAt)} ·{" "}
                          {fullName(a.employee.user.firstName, a.employee.user.lastName)}
                          {a.denialReason ? ` · ${a.denialReason}` : ""}
                        </span>
                        <StatusBadge kind="access" value={a.result} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#6f625e]">
                    {qr.status === "active"
                      ? "Aún no se ha usado este código."
                      : qr.usedAt
                        ? `Utilizado el ${formatDateTime(qr.usedAt)}.`
                        : "Código expirado sin uso."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6f625e]">Esta reserva aún no tiene códigos QR emitidos.</p>
        )}
      </section>
    </div>
  );
}
