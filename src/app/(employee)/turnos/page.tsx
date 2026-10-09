import type { Metadata } from "next";
import Link from "next/link";
import { CircleSlash, MapPin, ScanLine } from "lucide-react";

import { formatClock } from "@/features/access/access-dates";
import { findEmployeeByUserId, listEmployeeShifts } from "@/features/access/access.repository";
import { getSession } from "@/shared/auth/session";

export const metadata: Metadata = { title: "Mis zonas" };

const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Dia de la semana de hoy en America/Bogota (0 = domingo, igual que el esquema). */
function todayDayOfWeek(ref: Date): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", weekday: "short" })
    .format(ref)
    .slice(0, 3);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

/**
 * Vista del empleado: donde le toca estar y a que hora abre cada zona.
 *
 * Antes se confundia "Libre / Casi llena / Completa" con el turno del empleado,
 * pero esos estados describen los cupos que le quedan a un CLIENTE para reservar,
 * no el turno de quien valida. Aqui solo se muestra la hora y si la zona abre
 * hoy: lo que el empleado necesita para saber donde estar.
 */
export default async function TurnosPage() {
  const session = await getSession();
  if (!session) return null;

  const now = new Date();
  const hoy = todayDayOfWeek(now);
  const employee = await findEmployeeByUserId(session.userId);
  if (!employee) return null;

  const zonas = await listEmployeeShifts(employee.id, now);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Mis zonas</h1>
        <p className="text-sm text-white/55">Dónde debes validar y a qué hora abre cada una.</p>
      </header>

      {zonas.length === 0 ? (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <CircleSlash className="h-4 w-4 text-amber-300" />
            No tienes zonas asignadas
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/65">
            Pide al administrador que te asigne al menos una instalación. Sin zonas no puedes validar
            ningún QR.
          </p>
        </section>
      ) : (
        <>
          {zonas.map((zona) => {
            const horarioHoy = zona.weekly.find((w) => w.dayOfWeek === hoy);
            const franjasHoy = zona.todaySlots;
            const franjasFuturas = franjasHoy.filter((s) => s.endsAt > now).length;

            return (
              <section
                key={zona.serviceId}
                aria-label={zona.serviceName}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                {/* Cabecera: el nombre de la zona es lo primero que se lee. */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-[#c8a96b]">
                      {zona.categoryName}
                    </p>
                    <h2 className="mt-0.5 truncate text-base font-extrabold text-white">
                      {zona.serviceName}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] font-bold text-white/70">
                    {zona.capacity} personas
                  </span>
                </div>

                {/* Hoy: una sola línea con la respuesta. */}
                <div className="px-4 py-3">
                  {horarioHoy ? (
                    <p className="flex items-center gap-2 text-sm">
                      <span className="text-white/50">Hoy</span>
                      <span className="font-bold tabular-nums text-white">
                        {horarioHoy.openTime} – {horarioHoy.closeTime}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${
                          franjasFuturas > 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {franjasFuturas > 0
                          ? `Abierta · ${franjasFuturas} franja${franjasFuturas === 1 ? "" : "s"} por delante`
                          : "Cerrada por hoy"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="text-white/50">Hoy</span>{" "}
                      <span className="font-bold text-white/60">No abre</span>
                    </p>
                  )}
                </div>

                {/* Semana: una fila por día, el de hoy resaltado. */}
                <div className="border-t border-white/10 px-4 py-3">
                  <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-wider text-white/35">
                    Horario de la semana
                  </p>
                  <ul className="grid grid-cols-7 gap-1">
                    {DAY_ORDER.map((d) => {
                      const sc = zona.weekly.find((w) => w.dayOfWeek === d);
                      const esHoy = d === hoy;
                      return (
                        <li
                          key={d}
                          className={`rounded-lg px-0.5 py-1.5 text-center ${
                            esHoy
                              ? "bg-[#c8a96b] text-[#1a1214]"
                              : sc
                                ? "bg-white/5"
                                : "bg-transparent"
                          }`}
                        >
                          <span
                            className={`block text-[0.62rem] font-bold ${
                              esHoy ? "text-[#1a1214]" : sc ? "text-white/70" : "text-white/25"
                            }`}
                          >
                            {DAY_LABELS[d]}
                          </span>
                          <span
                            className={`block text-[0.62rem] font-semibold tabular-nums ${
                              esHoy ? "text-[#1a1214]" : sc ? "text-white/55" : "text-white/20"
                            }`}
                          >
                            {sc ? sc.openTime : "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Próximas franjas: cuándo cae la siguiente, no cuántas quedan. */}
                {franjasHoy.filter((s) => s.endsAt > now).length > 0 ? (
                  <div className="border-t border-white/10 px-4 py-3">
                    <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-wider text-white/35">
                      Franjas que vienen
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {franjasHoy
                        .filter((s) => s.endsAt > now)
                        .map((s) => (
                          <li
                            key={s.id}
                            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/70"
                          >
                            {formatClock(s.startsAt)} – {formatClock(s.endsAt)}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-white/45">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Si alguien entra con un QR de otra zona, llévalo a esa zona: el ingreso no se
              bloquea, solo se le indica dónde debe estar.
            </p>
          </section>

          <Link
            href="/validar"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#7a1f3d] p-4 text-sm font-bold text-white transition-colors hover:bg-[#631730]"
          >
            <ScanLine className="h-4 w-4" />
            Ir a validar un QR
          </Link>
        </>
      )}
    </div>
  );
}