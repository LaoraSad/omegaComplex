import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, ScanSearch, Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatDateTime,
  fullName,
} from "@/components/admin/format";
import { listAccesses, listServiceOptions } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Accesos" };

interface AccesosPageProps {
  searchParams: Promise<{
    resultado?: string;
    servicio?: string;
    desde?: string;
    hasta?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AccesosPage({ searchParams }: AccesosPageProps) {
  const params = await searchParams;
  const filters = {
    result: params.resultado || undefined,
    serviceId: params.servicio || undefined,
    from: params.desde || undefined,
    to: params.hasta || undefined,
    q: params.q || undefined,
    page: params.page ? Number(params.page) : 1,
  };
  const hasFilters = Boolean(filters.result || filters.serviceId || filters.from || filters.to || filters.q);

  const [result, services] = await Promise.all([
    listAccesses(filters),
    listServiceOptions(),
  ]);

  const exportQuery = new URLSearchParams();
  if (filters.result) exportQuery.set("resultado", filters.result);
  if (filters.serviceId) exportQuery.set("servicio", filters.serviceId);
  if (filters.from) exportQuery.set("desde", filters.from);
  if (filters.to) exportQuery.set("hasta", filters.to);
  if (filters.q) exportQuery.set("q", filters.q);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title="Accesos"
        description="Cada entrada validada con QR: cliente, servicio, código, empleado autorizador, fecha y hora exacta."
        actions={
          <a
            href={`/api/admin/export?tipo=accesos&${exportQuery.toString()}`}
            download
            className="abtn abtn-secondary"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        }
      />

      <form method="GET" action="/admin/accesos" className="acard acard-pad" role="search">
        <div className="afilters">
          <div className="afield afield-grow">
            <label className="alabel" htmlFor="a-q">Buscar</label>
            <input
              id="a-q"
              name="q"
              type="search"
              defaultValue={filters.q ?? ""}
              placeholder="Cliente o documento…"
              className="ainput"
              autoComplete="off"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="a-resultado">Resultado</label>
            <select id="a-resultado" name="resultado" defaultValue={filters.result ?? ""} className="aselect">
              <option value="">Permitidos y denegados</option>
              <option value="allowed">Permitido</option>
              <option value="denied">Denegado</option>
            </select>
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="a-servicio">Servicio</label>
            <select id="a-servicio" name="servicio" defaultValue={filters.serviceId ?? ""} className="aselect">
              <option value="">Todos los servicios</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="a-desde">Desde</label>
            <input id="a-desde" name="desde" type="date" defaultValue={filters.from ?? ""} className="ainput" />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="a-hasta">Hasta</label>
            <input id="a-hasta" name="hasta" type="date" defaultValue={filters.to ?? ""} className="ainput" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="abtn abtn-primary">
              <Search className="h-4 w-4" />
              Filtrar
            </button>
            {hasFilters ? (
              <Link href="/admin/accesos" className="abtn abtn-secondary">
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
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Servicio</th>
                  <th scope="col">QR</th>
                  <th scope="col">Autorizó</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((a) => (
                  <tr key={a.id}>
                    <td className="anum whitespace-nowrap text-[0.8rem]">{formatDateTime(a.accessedAt)}</td>
                    <td className="font-bold text-[#211a1d]">
                      {fullName(
                        a.qrToken.reservation.customer.user.firstName,
                        a.qrToken.reservation.customer.user.lastName,
                      )}
                    </td>
                    <td>{a.qrToken.reservation.service.name}</td>
                    <td className="anum">QR #{a.qrToken.seqNo}</td>
                    <td>{fullName(a.employee.user.firstName, a.employee.user.lastName)}</td>
                    <td>
                      <StatusBadge kind="access" value={a.result} />
                      {a.denialReason ? (
                        <span className="block text-xs text-[#6f625e]">{a.denialReason}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Suspense>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              itemLabel="accesos"
            />
          </Suspense>
        </div>
      ) : (
        <div className="acard">
          <EmptyState
            icon={ScanSearch}
            title={hasFilters ? "Sin resultados para estos filtros" : "Aún no hay accesos registrados"}
            text="Cada QR validado por un empleado quedará registrado con fecha, hora exacta y autorizador. Recuerda: cada QR es de un solo uso, sin reingreso."
            action={
              hasFilters ? (
                <Link href="/admin/accesos" className="abtn abtn-secondary">
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
