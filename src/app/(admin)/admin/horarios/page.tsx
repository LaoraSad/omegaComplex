import type { Metadata } from "next";
import { CalendarOff, Info } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatDate } from "@/components/admin/format";
import { listClosures, listServiceOptions, listServices } from "@/features/admin/admin.repository";
import { BlockFacilityForm, BlockFormHeader, ClosureDeleteButton, ScheduleDeleteButton, ScheduleForm } from "./HorariosClient";

export const metadata: Metadata = { title: "Horarios" };

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Orden visual Lun → Dom.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function HorariosPage() {
  const [services, closures, options] = await Promise.all([
    listServices(),
    listClosures(),
    listServiceOptions(),
  ]);
  const now = new Date();
  const upcoming = closures.filter((c) => new Date(c.dateTo) >= new Date(now.toDateString()));
  const past = closures.filter((c) => new Date(c.dateTo) < new Date(now.toDateString()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Horarios y disponibilidad"
        description="Horario semanal por instalación y bloqueos registrados. Todo proviene de la base de datos."
      />

      <section aria-label="Reglas generales" className="aalert aalert-info flex gap-2.5">
        <Info className="h-4 w-4 shrink-0" style={{ marginTop: "0.15rem" }} />
        <p className="m-0">
          Horario general del complejo: <strong>08:00 a 17:00</strong>. Los <strong>lunes</strong> el
          complejo permanece cerrado por mantenimiento; si el lunes es festivo, el mantenimiento se
          desplaza al <strong>martes</strong>.
        </p>
      </section>

      <section aria-label="Horario semanal" className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Horario semanal por instalación</h2>
            <p className="acard-sub">Apertura y cierre configurados para cada día.</p>
          </div>
        </div>
        {services.some((s) => s.serviceSchedules.length > 0) ? (
          <div className="atable-wrap" style={{ border: "none" }}>
            <table className="atable">
              <thead>
                <tr>
                  <th scope="col">Instalación</th>
                  {DAY_ORDER.map((d) => (
                    <th key={d} scope="col" className="text-center">{DAY_LABELS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const byDay = new Map(s.serviceSchedules.map((sc) => [sc.dayOfWeek, sc]));
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="block font-bold text-[#211a1d]">{s.name}</span>
                        <span className="block text-xs text-[#6f625e]">{s.category.name}</span>
                      </td>
                      {DAY_ORDER.map((d) => {
                        const sc = byDay.get(d);
                        return (
                          <td key={d} className="anum text-center text-xs">
                            {sc ? (
                              <span className="font-semibold text-[#7a1f3d]">
                                {sc.openTime.slice(0, 5)}–{sc.closeTime.slice(0, 5)}
                              </span>
                            ) : (
                              <span className="text-[#a89c97]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin horarios configurados"
            text="Cuando existan horarios semanales por instalación en el sistema, se mostrarán aquí día por día."
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section aria-label="Configurar horario semanal" className="acard acard-pad">
          <div className="acard-head">
            <div>
              <h2 className="acard-title">Definir horario semanal</h2>
              <p className="acard-sub">Cada instalación puede abrir y cerrar en días específicos. Las franjas del calendario se generan automáticamente.</p>
            </div>
          </div>
          <ScheduleForm services={options} />
          {services.map((service) => (
            <div key={service.id} className="mt-4 border-t border-[#f0e9e6] pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-bold text-[#211a1d]">{service.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_ORDER.map((day) => {
                  const schedule = service.serviceSchedules.find((s) => s.dayOfWeek === day);
                  return (
                    <div key={`${service.id}-${day}`} className="inline-flex items-center gap-2 rounded-full border border-[#e9dfdc] bg-[#fffaf8] px-2.5 py-1 text-xs text-[#4d413f]">
                      <span className="font-semibold">{DAY_LABELS[day]}</span>
                      {schedule ? (
                        <>
                          <span>{schedule.openTime.slice(0, 5)}–{schedule.closeTime.slice(0, 5)}</span>
                          <ScheduleDeleteButton serviceId={service.id} dayOfWeek={day} label={`${service.name} · ${DAY_LABELS[day]}`} />
                        </>
                      ) : (
                        <span className="text-[#a89c97]">cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section aria-label="Bloqueos vigentes" className="acard acard-pad">
          <div className="acard-head">
            <div>
              <h2 className="acard-title">Bloqueos vigentes y futuros</h2>
              <p className="acard-sub">Instalaciones bloqueadas manualmente por el administrador.</p>
            </div>
          </div>
          {upcoming.length > 0 ? (
            <ul className="divide-y divide-[#f0e9e6]">
              {upcoming.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#211a1d]">
                      {c.service ? c.service.name : "Todo el complejo"}
                    </p>
                    <p className="text-xs text-[#6f625e]">
                      {formatDate(c.dateFrom)} → {formatDate(c.dateTo)} · {c.reason}
                    </p>
                  </div>
                  <ClosureDeleteButton closure={c} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarOff}
              title="Sin bloqueos activos"
              text="No hay instalaciones bloqueadas en este momento. Usa el formulario para registrar un bloqueo por mantenimiento u otro motivo."
            />
          )}
          {past.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold text-[#7a1f3d]">
                Ver historial ({past.length})
              </summary>
              <ul className="mt-2 divide-y divide-[#f0e9e6]">
                {past.map((c) => (
                  <li key={c.id} className="py-2 text-xs text-[#6f625e]">
                    <span className="font-semibold text-[#211a1d]">
                      {c.service ? c.service.name : "Todo el complejo"}
                    </span>{" "}
                    · {formatDate(c.dateFrom)} → {formatDate(c.dateTo)} · {c.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <section aria-label="Registrar bloqueo" className="acard acard-pad">
          <BlockFormHeader />
          <p className="acard-sub" style={{ marginBottom: "1rem" }}>
            Bloquear una instalación es una acción importante: verifica instalación, fechas y motivo
            antes de confirmar.
          </p>
          <BlockFacilityForm services={options} />
        </section>
      </div>
    </div>
  );
}
