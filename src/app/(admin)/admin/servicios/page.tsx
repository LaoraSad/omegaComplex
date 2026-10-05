import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCOP, formatNumber } from "@/components/admin/format";
import { listServices } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Servicios" };

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

export default async function ServiciosPage() {
  const services = await listServices();
  const byCategory = new Map<string, typeof services>();
  for (const s of services) {
    const list = byCategory.get(s.category.name) ?? [];
    list.push(s);
    byCategory.set(s.category.name, list);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Servicios e instalaciones"
        description="Capacidad, precio y horarios reales de cada instalación. Los valores vienen de la base de datos."
        actions={
          <Link href="/admin/horarios" className="abtn abtn-secondary">
            Gestionar horarios
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {services.length === 0 ? (
        <div className="acard">
          <EmptyState
            icon={Building2}
            title="No hay servicios configurados"
            text="Cuando existan servicios en la base de datos aparecerán aquí con su capacidad, precio, categoría y horarios."
          />
        </div>
      ) : (
        [...byCategory.entries()].map(([category, items]) => (
          <section key={category} aria-label={category} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="admin-section-title">{category}</h2>
              <span className="abadge abadge-slate">
                {formatNumber(items.length)} {items.length === 1 ? "servicio" : "servicios"}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => {
                const byDay = new Map(s.serviceSchedules.map((sc) => [sc.dayOfWeek, sc]));
                return (
                  <li key={s.id} className="acard acard-pad flex flex-col gap-3">
                    <div>
                      <p className="akpi-label" style={{ color: "#7a1f3d" }}>{s.category.name}</p>
                      <h3 className="admin-section-title" style={{ marginTop: "0.2rem" }}>{s.name}</h3>
                      {s.description ? (
                        <p className="admin-section-sub" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {s.description}
                        </p>
                      ) : null}
                    </div>
                    <dl className="grid grid-cols-3 gap-2 rounded-[10px] bg-[#faf8f7] p-3 text-center">
                      <div>
                        <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Capacidad</dt>
                        <dd className="anum text-base font-extrabold">{formatNumber(s.capacity)}</dd>
                      </div>
                      <div className="border-x border-[#e8e1de]">
                        <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Precio</dt>
                        <dd className="anum text-base font-extrabold">{formatCOP(s.price)}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.66rem] font-bold uppercase tracking-wider text-[#6f625e]">Próx. reservas</dt>
                        <dd className="anum text-base font-extrabold">{formatNumber(s._count.reservations)}</dd>
                      </div>
                    </dl>
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#6f625e]">
                        <Users className="h-3 w-3" /> Horario semanal
                      </p>
                      {s.serviceSchedules.length > 0 ? (
                        <ol className="grid grid-cols-7 gap-1" aria-label={`Horario de ${s.name}`}>
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
                                  {sc ? `${sc.openTime.slice(0, 5)}` : "—"}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="text-xs text-[#a89c97]">Sin horario configurado en el sistema.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
