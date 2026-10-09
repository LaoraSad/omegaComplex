import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MapPin, ScanLine, UserCheck } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  fullName,
  initials,
} from "@/components/admin/format";
import {
  getEmployeeDetail,
  listEmployeeAccesses,
  listZoneOptions,
} from "@/features/admin/admin.repository";
import {
  EmployeeActiveToggle,
  EmployeePasswordForm,
  EmployeeProfileForm,
  EmployeeZoneEditor,
} from "../EmpleadosClient";

export const metadata: Metadata = { title: "Detalle de empleado" };

interface EmpleadoDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function EmpleadoDetailPage({ params, searchParams }: EmpleadoDetailPageProps) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const employee = await getEmployeeDetail(id);
  if (!employee) notFound();

  const [accesses, groups] = await Promise.all([
    listEmployeeAccesses(id, { page, pageSize: 10 }),
    listZoneOptions(),
  ]);

  const name = fullName(employee.user.firstName, employee.user.lastName);
  const isActive = employee.user.isActive && employee.isActive;
  const assignedIds = employee.assignments.map((a) => a.service.id);

  return (
    <div className="space-y-6">
      <Link href="/admin/empleados" className="abtn abtn-secondary" style={{ width: "fit-content" }}>
        <ArrowLeft className="h-4 w-4" />
        Volver a empleados
      </Link>

      <PageHeader
        eyebrow="Personas"
        title={name}
        description={`Alta en el sistema el ${formatDate(employee.user.createdAt)} · documento ${employee.document}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={`abadge abadge-${isActive ? "emerald" : "slate"}`}>
              <span aria-hidden="true" className="abadge-dot" />
              {isActive ? "Activo" : "Inactivo"}
            </span>
            <EmployeeActiveToggle employeeId={employee.id} name={name} isActive={isActive} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section aria-label="Resumen" className="acard acard-pad">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#7a1f3d] text-base font-bold text-white"
            >
              {initials(employee.user.firstName, employee.user.lastName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#211a1d]">{name}</p>
              <p className="truncate text-xs text-[#6f625e]">{employee.user.email}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#6f625e]">Documento</dt>
              <dd className="anum font-semibold">{employee.document}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#6f625e]">Teléfono</dt>
              <dd className="font-semibold">{employee.user.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#6f625e]">Accesos validados</dt>
              <dd className="anum font-semibold">{formatNumber(employee._count.accesses)}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-[10px] bg-[#faf8f7] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#6f625e]">
              <MapPin className="h-3 w-3" /> Zonas
            </p>
            {assignedIds.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {employee.assignments.map((a) => (
                  <li key={a.service.id} className="abadge abadge-wine">
                    {a.service.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-semibold text-[#92600a]">
                Sin zona asignada. No podrá validar ningún QR hasta asignarle una.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-4 xl:col-span-2">
          <EmployeeProfileForm
            employeeId={employee.id}
            values={{
              firstName: employee.user.firstName,
              lastName: employee.user.lastName,
              document: employee.document,
              email: employee.user.email,
              phone: employee.user.phone,
            }}
          />
          <EmployeePasswordForm employeeId={employee.id} />
        </div>
      </div>

      <EmployeeZoneEditor
        employeeId={employee.id}
        groups={groups}
        assignedIds={assignedIds}
      />

      <section aria-label="Accesos del empleado" className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Accesos de {name}</h2>
            <p className="acard-sub">
              Cada QR que validó este empleado, con fecha y hora exacta.
            </p>
          </div>
          <ScanLine className="h-5 w-5 text-[#7a1f3d]" />
        </div>

        {accesses.rows.length > 0 ? (
          <div>
            <div className="atable-wrap">
              <table className="atable">
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Servicio</th>
                    <th scope="col">QR</th>
                    <th scope="col">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.rows.map((a) => (
                    <tr key={a.id}>
                      <td className="anum whitespace-nowrap text-[0.8rem]">
                        {formatDateTime(a.accessedAt)}
                      </td>
                      <td className="font-bold text-[#211a1d]">
                        {fullName(
                          a.qrToken.reservation.customer.user.firstName,
                          a.qrToken.reservation.customer.user.lastName,
                        )}
                        <span className="block text-xs font-normal text-[#6f625e]">
                          Doc. {a.qrToken.reservation.customer.document}
                        </span>
                      </td>
                      <td>{a.qrToken.reservation.service.name}</td>
                      <td className="anum">QR #{a.qrToken.seqNo}</td>
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
                page={accesses.page}
                totalPages={accesses.totalPages}
                total={accesses.total}
                pageSize={accesses.pageSize}
                itemLabel="accesos"
              />
            </Suspense>
          </div>
        ) : (
          <EmptyState
            icon={UserCheck}
            title="Sin accesos registrados"
            text="Cuando este empleado valide un QR aparecerá aquí con la fecha y la hora exacta del ingreso."
          />
        )}
      </section>
    </div>
  );
}