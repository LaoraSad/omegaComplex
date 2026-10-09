import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin, Search, UserRoundSearch } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatNumber, fullName, initials } from "@/components/admin/format";
import { listEmployees, listZoneOptions } from "@/features/admin/admin.repository";
import { EmployeeCreateSection } from "./EmpleadosClient";

export const metadata: Metadata = { title: "Empleados" };

interface EmpleadosPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function EmpleadosPage({ searchParams }: EmpleadosPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const [employees, groups] = await Promise.all([listEmployees(q), listZoneOptions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personas"
        title="Empleados"
        description="Cada empleado tiene una zona asignada y solo valida QR de esa zona. Aquí ves la asignación real del sistema."
        actions={<EmployeeCreateSection groups={groups} />}
      />

      <form method="GET" action="/admin/empleados" className="acard acard-pad" role="search">
        <div className="afilters">
          <div className="afield afield-grow">
            <label className="alabel" htmlFor="e-q">Buscar empleado</label>
            <input
              id="e-q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Nombre o documento…"
              className="ainput"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="abtn abtn-primary">
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>
      </form>

      {employees.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <li key={e.id} className="acard acard-pad flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7a1f3d] text-sm font-bold text-white"
                >
                  {initials(e.user.firstName, e.user.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#211a1d]">
                    <Link
                      href={`/admin/empleados/${e.id}`}
                      className="hover:text-[#7a1f3d] hover:underline"
                    >
                      {fullName(e.user.firstName, e.user.lastName)}
                    </Link>
                  </p>
                  <p className="truncate text-xs text-[#6f625e]">{e.user.email}</p>
                </div>
                <span
                  className={`abadge ml-auto ${e.user.isActive && e.isActive ? "abadge-emerald" : "abadge-slate"}`}
                >
                  <span aria-hidden="true" className="abadge-dot" />
                  {e.user.isActive && e.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6f625e]">Documento</dt>
                  <dd className="anum font-semibold">{e.document}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6f625e]">Teléfono</dt>
                  <dd className="font-semibold">{e.user.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6f625e]">Accesos validados</dt>
                  <dd className="anum font-semibold">{formatNumber(e._count.accesses)}</dd>
                </div>
              </dl>
              <div className="rounded-[10px] bg-[#faf8f7] p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#6f625e]">
                  <MapPin className="h-3 w-3" /> Zona asignada
                </p>
                {e.assignments.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {e.assignments.map((a) => (
                      <li key={a.service.id} className="abadge abadge-wine">
                        {a.service.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-[#92600a]">Sin zona asignada en el sistema.</p>
                )}
              </div>
              <Link href={`/admin/empleados/${e.id}`} className="asection-link inline-flex items-center gap-1">
                Gestionar empleado <ArrowUpRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="acard">
          <EmptyState
            icon={UserRoundSearch}
            title={q ? "Sin resultados para esta búsqueda" : "No hay empleados registrados"}
            text="Cuando existan empleados en el sistema aparecerán aquí con su zona asignada y sus accesos validados."
          />
        </div>
      )}
    </div>
  );
}
