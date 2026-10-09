import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Users } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCOP, formatNumber } from "@/components/admin/format";
import { servicePhoto } from "@/components/admin/service-image";
import { listServices } from "@/features/admin/admin.repository";
import AmbientBubbles from "@/components/AmbientBubbles";
import SectionDivider from "@/components/SectionDivider";

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
        <div className="omega-dark-panel px-5 py-8 sm:px-8">
          <div aria-hidden="true" className="omega-cta-glow" />
          <AmbientBubbles variant="mixed" />
          <div className="relative space-y-10">
            <div className="space-y-2">
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
                <span>Nuestras instalaciones</span>
                <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                Todo lo que necesitas en un solo lugar
              </h2>
            </div>

            {[...byCategory.entries()].map(([category, items], ci) => (
              <section key={category} aria-label={category} className="space-y-4">
                {ci > 0 ? <SectionDivider /> : null}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    {category}
                  </h3>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
                    {formatNumber(items.length)} {items.length === 1 ? "servicio" : "servicios"}
                  </span>
                </div>
                <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((s) => {
                    const byDay = new Map(s.serviceSchedules.map((sc) => [sc.dayOfWeek, sc]));
                    const photo = servicePhoto(s.slug);
                    return (
                      <li key={s.id} id={`servicio-${s.id}`} className="omega-ring h-full scroll-mt-24">
                        <article className="omega-ring-inner flex h-full flex-col overflow-hidden bg-[#141013]">
                          {photo ? (
                            <Link
                              href={`/admin/servicios/${s.id}`}
                              className="relative block h-44 shrink-0 overflow-hidden"
                              aria-label={`Ver ${s.name}`}
                            >
                              <Image
                                src={photo}
                                alt={s.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.05]"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                              <p className="absolute bottom-3 left-4 right-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
                                {s.category.name}
                              </p>
                            </Link>
                          ) : null}
                          <div className="flex flex-1 flex-col gap-3 p-5">
                            <div>
                              {!photo ? (
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
                                  {s.category.name}
                                </p>
                              ) : null}
                              <h4 className="mt-1 text-lg font-black leading-tight text-white">
                                <Link href={`/admin/servicios/${s.id}`} className="transition-colors hover:text-[#e3bd74]">
                                  {s.name}
                                </Link>
                              </h4>
                              {s.description ? (
                                <p className="mt-1 text-xs leading-relaxed text-white/60" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {s.description}
                                </p>
                              ) : null}
                            </div>
                            <dl className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                              <div>
                                <dt className="text-[0.62rem] font-bold uppercase tracking-wider text-white/50">Capacidad</dt>
                                <dd className="anum text-base font-extrabold text-white">{formatNumber(s.capacity)}</dd>
                              </div>
                              <div className="border-x border-white/10">
                                <dt className="text-[0.62rem] font-bold uppercase tracking-wider text-white/50">Precio</dt>
                                <dd className="anum text-base font-extrabold text-[#e3bd74]">{formatCOP(s.price)}</dd>
                              </div>
                              <div>
                                <dt className="text-[0.62rem] font-bold uppercase tracking-wider text-white/50">Próx. reservas</dt>
                                <dd className="anum text-base font-extrabold text-white">{formatNumber(s._count.reservations)}</dd>
                              </div>
                            </dl>
                            <div>
                              <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-white/50">
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
                                          sc ? "border-[#e3bd74]/40 bg-[#e3bd74]/10" : "border-white/10 bg-white/5"
                                        }`}
                                      >
                                        <span className="block text-[0.6rem] font-bold text-white/50">{DAY_LABELS[d]}</span>
                                        <span className={`block text-[0.6rem] font-semibold ${sc ? "text-[#e3bd74]" : "text-white/30"}`}>
                                          {sc ? `${sc.openTime.slice(0, 5)}` : "—"}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ol>
                              ) : (
                                <p className="text-xs text-white/40">Sin horario configurado en el sistema.</p>
                              )}
                            </div>
                            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                              <Link
                                href={`/admin/servicios/${s.id}`}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
                                style={{ minHeight: "2.4rem" }}
                              >
                                Ver instalación
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/admin/reservas?servicio=${s.id}`}
                                aria-label={`Ver reservas de ${s.name}`}
                                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#7a1f3d] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#8f2547]"
                                style={{ minHeight: "2.4rem" }}
                              >
                                Reservas
                              </Link>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
