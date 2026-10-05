import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactRound, Download, Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatDate, formatNumber, fullName } from "@/components/admin/format";
import { listCustomers } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Clientes" };

interface ClientesPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const { rows, total } = await listCustomers(q);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personas"
        title="Clientes"
        description={`Directorio de cuentas del sistema · ${formatNumber(total)} en total. Se muestra solo la información necesaria para la operación.`}
        actions={
          <a href="/api/admin/export?tipo=clientes" download className="abtn abtn-secondary">
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        }
      />

      <form method="GET" action="/admin/clientes" className="acard acard-pad" role="search">
        <div className="afilters">
          <div className="afield afield-grow">
            <label className="alabel" htmlFor="c-q">Buscar cliente</label>
            <input
              id="c-q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Nombre, documento o correo…"
              className="ainput"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="abtn abtn-primary">
              <Search className="h-4 w-4" />
              Buscar
            </button>
            {q ? (
              <Link href="/admin/clientes" className="abtn abtn-secondary">
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {rows.length > 0 ? (
        <div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Nacimiento</th>
                  <th scope="col">Reservas</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="font-bold text-[#211a1d]">
                      {fullName(c.user.firstName, c.user.lastName)}
                    </td>
                    <td className="anum">{c.document ?? "—"}</td>
                    <td>
                      <span className="block max-w-56 truncate">{c.user.email}</span>
                      <span className="block text-xs text-[#6f625e]">{c.user.phone ?? "Sin teléfono"}</span>
                    </td>
                    <td className="anum whitespace-nowrap text-[0.8rem]">
                      {c.birthDate ? formatDate(c.birthDate) : "—"}
                    </td>
                    <td className="anum">{formatNumber(c._count.reservations)}</td>
                    <td>
                      <span className={`abadge ${c.user.isActive ? "abadge-emerald" : "abadge-slate"}`}>
                        <span aria-hidden="true" className="abadge-dot" />
                        {c.user.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Suspense>
            <p className="apagination-info pt-4">
              Mostrando {rows.length} de {formatNumber(total)} clientes (máximo 100 por búsqueda).
            </p>
          </Suspense>
        </div>
      ) : (
        <div className="acard">
          <EmptyState
            icon={ContactRound}
            title={q ? "Sin resultados para esta búsqueda" : "No hay clientes registrados"}
            text="Cuando las personas creen su cuenta aparecerán aquí con documento, contacto y sus reservas."
          />
        </div>
      )}
    </div>
  );
}
