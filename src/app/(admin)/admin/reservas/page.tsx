import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarX2, Download, Eye, Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCOP,
  formatDateTime,
  formatNumber,
  fullName,
} from "@/components/admin/format";
import { listReservations, listServiceOptions } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Reservas" };

interface ReservasPageProps {
  searchParams: Promise<{
    estado?: string;
    servicio?: string;
    canal?: string;
    desde?: string;
    hasta?: string;
    q?: string;
    page?: string;
  }>;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "confirmed", label: "Confirmada" },
  { value: "pending_payment", label: "Pendiente de pago" },
  { value: "payment_processing", label: "Procesando pago" },
  { value: "used", label: "Utilizada" },
  { value: "expired", label: "Expirada" },
  { value: "payment_rejected", label: "Rechazada" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "Todos los canales" },
  { value: "online", label: "En línea" },
  { value: "in_person", label: "Presencial" },
];

export default async function ReservasPage({ searchParams }: ReservasPageProps) {
  const params = await searchParams;
  const filters = {
    status: params.estado || undefined,
    serviceId: params.servicio || undefined,
    channel: params.canal || undefined,
    from: params.desde || undefined,
    to: params.hasta || undefined,
    q: params.q || undefined,
    page: params.page ? Number(params.page) : 1,
  };
  const hasFilters = Boolean(
    filters.status || filters.serviceId || filters.channel || filters.from || filters.to || filters.q,
  );

  const [result, services] = await Promise.all([
    listReservations(filters),
    listServiceOptions(),
  ]);

  const exportQuery = new URLSearchParams();
  if (filters.status) exportQuery.set("estado", filters.status);
  if (filters.serviceId) exportQuery.set("servicio", filters.serviceId);
  if (filters.channel) exportQuery.set("canal", filters.channel);
  if (filters.from) exportQuery.set("desde", filters.from);
  if (filters.to) exportQuery.set("hasta", filters.to);
  if (filters.q) exportQuery.set("q", filters.q);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title="Reservas"
        description="Cliente, servicio, fecha, pago y QR de cada reserva. Los datos son los del sistema, sin excepción."
        actions={
          <a
            href={`/api/admin/export?tipo=reservas&${exportQuery.toString()}`}
            download
            className="abtn abtn-secondary"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        }
      />

      <form method="GET" action="/admin/reservas" className="acard acard-pad" role="search">
        <div className="afilters">
          <div className="afield afield-grow">
            <label className="alabel" htmlFor="f-q">Buscar</label>
            <input
              id="f-q"
              name="q"
              type="search"
              defaultValue={filters.q ?? ""}
              placeholder="Cliente, documento, correo o servicio…"
              className="ainput"
              autoComplete="off"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="f-estado">Estado</label>
            <select id="f-estado" name="estado" defaultValue={filters.status ?? ""} className="aselect">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="f-servicio">Servicio</label>
            <select id="f-servicio" name="servicio" defaultValue={filters.serviceId ?? ""} className="aselect">
              <option value="">Todos los servicios</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="f-canal">Canal</label>
            <select id="f-canal" name="canal" defaultValue={filters.channel ?? ""} className="aselect">
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="f-desde">Desde</label>
            <input id="f-desde" name="desde" type="date" defaultValue={filters.from ?? ""} className="ainput" />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="f-hasta">Hasta</label>
            <input id="f-hasta" name="hasta" type="date" defaultValue={filters.to ?? ""} className="ainput" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="abtn abtn-primary">
              <Search className="h-4 w-4" />
              Filtrar
            </button>
            {hasFilters ? (
              <Link href="/admin/reservas" className="abtn abtn-secondary">
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {result.rows.length > 0 ? (
        <div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Servicio</th>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Cupos</th>
                  <th scope="col">Total</th>
                  <th scope="col">Pago</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => {
                  const latestPayment = r.payments[0];
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="block font-bold text-[#211a1d]">
                          {fullName(r.customer.user.firstName, r.customer.user.lastName)}
                        </span>
                        <span className="block text-xs text-[#6f625e]">
                          {r.customer.document ?? r.customer.user.email}
                        </span>
                      </td>
                      <td>
                        <span className="block font-semibold">{r.service.name}</span>
                        <span className="block text-xs text-[#6f625e]">{r.service.category.name}</span>
                      </td>
                      <td className="anum whitespace-nowrap text-[0.8rem]">{formatDateTime(r.startsAt)}</td>
                      <td className="anum">{formatNumber(r.quantity)}</td>
                      <td className="anum font-bold">{formatCOP(r.totalCop)}</td>
                      <td>
                        {latestPayment ? (
                          <StatusBadge kind="payment" value={latestPayment.status} />
                        ) : (
                          <span className="text-xs text-[#a89c97]">Sin pagos</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge kind="reservation" value={r.status} />
                      </td>
                      <td>
                        <Link
                          href={`/admin/reservas/${r.id}`}
                          aria-label={`Ver detalle de la reserva de ${fullName(r.customer.user.firstName, r.customer.user.lastName)}`}
                          className="aicon-btn"
                          style={{ border: "1px solid #e8e1de" }}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Suspense>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              itemLabel="reservas"
            />
          </Suspense>
        </div>
      ) : (
        <div className="acard">
          <EmptyState
            icon={CalendarX2}
            title={hasFilters ? "Sin resultados para estos filtros" : "No hay reservas para este período"}
            text={
              hasFilters
                ? "Prueba con otro servicio, estado, rango de fechas o término de búsqueda."
                : "Cuando los clientes creen reservas, aparecerán aquí con su estado, pago y QR asociados."
            }
            action={
              hasFilters ? (
                <Link href="/admin/reservas" className="abtn abtn-secondary">
                  Limpiar filtros
                </Link>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
