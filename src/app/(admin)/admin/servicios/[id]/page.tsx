import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, ScanLine, Users, Waves } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCOP,
  formatDateTime,
  formatNumber,
  fullName,
} from "@/components/admin/format";
import { servicePhoto } from "@/components/admin/service-image";
import {
  bogotaDayRange,
  getServiceDetail,
  listAccesses,
  listReservations,
} from "@/features/admin/admin.repository";
import { db } from "@/shared/lib/db";

export const metadata: Metadata = { title: "Detalle de servicio" };

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

const DAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  0: "Dom",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function ServicioDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  const service = await getServiceDetail(id);
  if (!service) notFound();

  const photo = servicePhoto(service.slug);
  const byDay = new Map(service.serviceSchedules.map((sc) => [sc.dayOfWeek, sc]));

  const { start: todayStart, end: todayEnd } = bogotaDayRange();
  const [reservations, accesses, todaySlots] = await Promise.all([
    listReservations({ serviceId: service.id, pageSize: 5 }),
    listAccesses({ serviceId: service.id, pageSize: 5 }),
    db.serviceSlot.findMany({
      where: { serviceId: service.id, startsAt: { gte: todayStart, lt: todayEnd } },
      select: { capacity: true, bookedCount: true, heldCount: true },
    }),
  ]);

  const used = todaySlots.reduce((sum, s) => sum + s.bookedCount + s.heldCount, 0);
  const total = todaySlots.reduce((sum, s) => sum + s.capacity, 0);
  const occupancy = total > 0 ? Math.round((used / total) * 100) : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/servicios" className="abtn abtn-secondary" style={{ width: "fit-content" }}>
        <ArrowLeft className="h-4 w-4" />
        Volver a servicios
      </Link>

      <PageHeader
        eyebrow={service.category.name}
        title={service.name}
        description={
          service.description ??
          `Capacidad para ${formatNumber(service.capacity)} personas · ${formatCOP(service.price)} por reserva.`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/reservas?servicio=${service.id}`} className="abtn abtn-primary">
              <CalendarDays className="h-4 w-4" />
              Ver reservas
            </Link>
            <Link href={`/admin/accesos?servicio=${service.id}`} className="abtn abtn-secondary">
              <ScanLine className="h-4 w-4" />
              Ver accesos
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section aria-label="Fotografía y capacidad" className="acard overflow-hidden xl:col-span-3">
          <div className="relative aspect-[16/9] w-full bg-[#e8f1ed]">
            {photo ? (
              <Image
                src={photo}
                alt={`Fotografía de ${service.name}`}
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-[#317a75]">
                <Waves className="h-10 w-10" strokeWidth={1.5} />
              </span>
            )}
          </div>
          <div className="acard-pad">
            <dl className="grid grid-cols-3 gap-2 rounded-[10px] bg-[#faf8f7] p-3 text-center">
              <div>
                <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Capacidad</dt>
                <dd className="anum text-base font-extrabold">{formatNumber(service.capacity)}</dd>
              </div>
              <div className="border-x border-[#e8e1de]">
                <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Precio</dt>
                <dd className="anum text-base font-extrabold">{formatCOP(service.price)}</dd>
              </div>
              <div>
                <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Ocupación hoy</dt>
                <dd className="anum text-base font-extrabold">
                  {occupancy !== null ? `${occupancy}%` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#6f625e]">
              <Users className="h-3 w-3" /> Horario semanal
            </p>
            {service.serviceSchedules.length > 0 ? (
              <ol className="mt-1.5 grid grid-cols-7 gap-1" aria-label={`Horario de ${service.name}`}>
                {DAY_ORDER.map((d) => {
                  const sc = byDay.get(d);
                  return (
                    <li
                      key={d}
                      title={sc ? `${DAY_LABELS[d]}: ${sc.openTime}–${sc.closeTime}` : `${DAY_LABELS[d]}: cerrado`}
                      className={`rounded-md border px-0.5 py-1 text-center ${
                        sc ? "border-[#e3c3cf] bg-[#f6e8ed]" : "border-[#f0e9e6] bg-[#faf8f7]"
                      }`}
                    >
                      <span className="block text-[0.6rem] font-bold text-[#6f625e]">{DAY_LABELS[d]}</span>
                      <span className={`block text-[0.6rem] font-semibold ${sc ? "text-[#7a1f3d]" : "text-[#a89c97]"}`}>
                        {sc ? sc.openTime.slice(0, 5) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-1.5 text-xs text-[#a89c97]">Sin horario configurado en el sistema.</p>
            )}
          </div>
        </section>

        <section aria-label="Reservas del servicio" className="acard acard-pad xl:col-span-2">
          <div className="acard-head">
            <div>
              <h2 className="acard-title">Reservas recientes</h2>
              <p className="acard-sub">Solo de esta instalación.</p>
            </div>
            <Link
              href={`/admin/reservas?servicio=${service.id}`}
              className="asection-link inline-flex items-center gap-1"
            >
              Ver todas <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {reservations.rows.length > 0 ? (
            <ul className="divide-y divide-[#f0e9e6]">
              {reservations.rows.map((r) => (
                <li key={r.id} className="py-2.5">
                  <Link href={`/admin/reservas/${r.id}`} className="group flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {fullName(r.customer.user.firstName, r.customer.user.lastName)}
                      </span>
                      <span className="block truncate text-xs text-[#6f625e]">
                        {formatDateTime(r.startsAt)} · {formatNumber(r.quantity)}{" "}
                        {r.quantity === 1 ? "cupo" : "cupos"}
                      </span>
                    </span>
                    <StatusBadge kind="reservation" value={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin reservas" text="Esta instalación aún no tiene reservas registradas." />
          )}
        </section>
      </div>

      <section aria-label="Accesos del servicio" className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Accesos recientes</h2>
            <p className="acard-sub">Entradas validadas con QR para esta instalación.</p>
          </div>
          <Link
            href={`/admin/accesos?servicio=${service.id}`}
            className="asection-link inline-flex items-center gap-1"
          >
            Ver todos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        {accesses.rows.length > 0 ? (
          <ul className="divide-y divide-[#f0e9e6]">
            {accesses.rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="font-semibold">
                  {fullName(
                    a.qrToken.reservation.customer.user.firstName,
                    a.qrToken.reservation.customer.user.lastName,
                  )}{" "}
                  <span className="font-normal text-[#6f625e]">
                    · {formatDateTime(a.accessedAt)} · QR #{a.qrToken.seqNo}
                  </span>
                </span>
                <StatusBadge kind="access" value={a.result} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin accesos" text="Cuando se valide un QR de esta instalación aparecerá aquí." />
        )}
      </section>
    </div>
  );
}
