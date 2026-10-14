import type { Metadata } from "next";
import { ChartColumn, Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCOP, formatNumber, formatPercent } from "@/components/admin/format";
import {
  getMetricasRango,
  getOcupacionPorFecha,
  getUsoReservas,
  listAccesses,
  listCustomers,
  listEmployees,
  listReservations,
  listServices,
} from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Reportes" };

interface ReportesSearchParams {
  desde?: string;
  hasta?: string;
  fecha?: string;
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<ReportesSearchParams>;
}) {
  const { desde, hasta, fecha } = await searchParams;
  // Secuencial para no presionar el pool de conexiones.
  const metricas = await getMetricasRango(desde, hasta);
  const ocupacion = await getOcupacionPorFecha(fecha);
  const uso = await getUsoReservas(desde, hasta);
  const reservations = await listReservations({ page: 1, pageSize: 1 });
  const accesses = await listAccesses({ page: 1, pageSize: 1 });
  const services = await listServices();
  const employees = await listEmployees();
  const customers = await listCustomers();

  const cards = [
    {
      tipo: "reservas",
      title: "Reservas",
      count: reservations.total,
      unit: "registros",
      text: "Cliente, servicio, horario, pago y estado. Puedes acotar por rango de fechas antes de descargar.",
      withDates: true,
    },
    {
      tipo: "accesos",
      title: "Accesos",
      count: accesses.total,
      unit: "registros",
      text: "Entradas validadas con QR: cliente, servicio, autorizador, fecha y hora exacta.",
      withDates: true,
    },
    {
      tipo: "servicios",
      title: "Servicios",
      count: services.length,
      unit: "instalaciones",
      text: "Catálogo completo con categoría, precio, capacidad y días con horario.",
      withDates: false,
    },
    {
      tipo: "empleados",
      title: "Empleados",
      count: employees.length,
      unit: "personas",
      text: "Asignación por zona y accesos validados. Sin información sensible.",
      withDates: false,
    },
    {
      tipo: "clientes",
      title: "Clientes",
      count: customers.total,
      unit: "cuentas",
      text: "Directorio operativo: contacto, documento y número de reservas.",
      withDates: false,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Reportes"
        description="Descarga los datos reales del sistema en CSV, listo para Excel. Los reportes de reservas y accesos aceptan rango de fechas."
      />

      {/* Fase 4 (§20, solo visualización): métricas por rango de fechas de
        franja. Sin exportación: el CSV de abajo no incluye estos desgloses. */}
      <section aria-label="Métricas" className="acard acard-pad space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="akpi-label">Métricas</p>
            <p className="akpi-context">
              Del {metricas.desde} al {metricas.hasta} (fecha de franja) · Ocupación del {ocupacion.fecha}
            </p>
          </div>
          <span aria-hidden="true" className="akpi-icon">
            <ChartColumn className="h-5 w-5" strokeWidth={1.9} />
          </span>
        </div>

        <form method="GET" action="/admin/reportes" className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
          <div>
            <label className="alabel" htmlFor="m-desde">Desde</label>
            <input id="m-desde" name="desde" type="date" defaultValue={metricas.desde} className="ainput" />
          </div>
          <div>
            <label className="alabel" htmlFor="m-hasta">Hasta</label>
            <input id="m-hasta" name="hasta" type="date" defaultValue={metricas.hasta} className="ainput" />
          </div>
          <div>
            <label className="alabel" htmlFor="m-fecha">Ocupación del día</label>
            <input id="m-fecha" name="fecha" type="date" defaultValue={ocupacion.fecha} className="ainput" />
          </div>
          <button type="submit" className="abtn abtn-secondary">
            Ver métricas
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="akpi-label">Ingresos del rango</p>
            <p className="akpi-value">{formatCOP(metricas.totalIngresosCop)}</p>
            <ul className="mt-2 space-y-1">
              {metricas.ingresosPorServicio.slice(0, 5).map((s) => (
                <li key={s.serviceId} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-[#6b625e]">{s.serviceName}</span>
                  <strong className="shrink-0">{formatCOP(s.totalCop)}</strong>
                </li>
              ))}
              {metricas.ingresosPorServicio.length === 0 ? (
                <li className="text-sm text-[#b8aca6]">Sin pagos exitosos en el rango.</li>
              ) : null}
            </ul>
            <p className="akpi-context mt-2">
              Por categoría: {metricas.ingresosPorCategoria.map((c) => `${c.categoryName} ${formatCOP(c.totalCop)}`).join(" · ") || "—"}
            </p>
          </div>
          <div>
            <p className="akpi-label">Reservas del rango</p>
            <p className="akpi-value">{formatNumber(metricas.totalReservas)}</p>
            <ul className="mt-2 space-y-1">
              {metricas.reservasPorServicio.slice(0, 5).map((s) => (
                <li key={s.serviceId} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-[#6b625e]">{s.serviceName}</span>
                  <strong className="shrink-0">{formatNumber(s.total)}</strong>
                </li>
              ))}
              {metricas.reservasPorServicio.length === 0 ? (
                <li className="text-sm text-[#b8aca6]">Sin reservas en el rango.</li>
              ) : null}
            </ul>
            <p className="akpi-context mt-2">
              Por categoría: {metricas.reservasPorCategoria.map((c) => `${c.categoryName} ${formatNumber(c.total)}`).join(" · ") || "—"}
            </p>
          </div>
          <div>
            <p className="akpi-label">Ocupación del {ocupacion.fecha}</p>
            <p className="akpi-value">
              {ocupacion.occupancyToday
                ? formatPercent(ocupacion.occupancyToday.used, ocupacion.occupancyToday.total)
                : "—"}
            </p>
            <p className="akpi-context">
              {ocupacion.occupancyToday
                ? `${formatNumber(ocupacion.occupancyToday.used)} de ${formatNumber(ocupacion.occupancyToday.total)} cupos`
                : "Sin franjas programadas"}
            </p>
            <ul className="mt-2 space-y-1">
              {ocupacion.occupancyByService.slice(0, 5).map((s) => (
                <li key={s.serviceId} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-[#6b625e]">{s.serviceName}</span>
                  <strong className="shrink-0">{formatPercent(s.used, s.total)}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="akpi-label">Uso de reservas</p>
            <p className="akpi-value">
              {formatNumber(uso.usadas)}{" "}
              <span className="text-sm font-semibold text-[#b8aca6]">utilizadas</span>
            </p>
            <p className="akpi-context">
              {formatNumber(uso.noUsadas)} no utilizadas (confirmadas pasadas sin ningún QR consumido).
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <section key={c.tipo} aria-label={`Reporte de ${c.title}`} className="acard acard-pad">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="akpi-label">{c.title}</p>
                <p className="akpi-value">
                  {formatNumber(c.count)}{" "}
                  <span className="text-sm font-semibold text-[#b8aca6]">{c.unit}</span>
                </p>
                <p className="akpi-context">{c.text}</p>
              </div>
              <span aria-hidden="true" className="akpi-icon">
                <FileSpreadsheet className="h-5 w-5" strokeWidth={1.9} />
              </span>
            </div>
            <form method="GET" action="/api/admin/export" className="mt-4">
              <input type="hidden" name="tipo" value={c.tipo} />
              {c.withDates ? (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="alabel" htmlFor={`r-desde-${c.tipo}`}>Desde</label>
                    <input id={`r-desde-${c.tipo}`} name="desde" type="date" className="ainput" />
                  </div>
                  <div>
                    <label className="alabel" htmlFor={`r-hasta-${c.tipo}`}>Hasta</label>
                    <input id={`r-hasta-${c.tipo}`} name="hasta" type="date" className="ainput" />
                  </div>
                </div>
              ) : null}
              <button type="submit" className="abtn abtn-secondary w-full">
                <Download className="h-4 w-4" />
                Descargar CSV
              </button>
            </form>
          </section>
        ))}
      </div>

      <p className="aalert aalert-info">
        Los archivos se generan con la información actual de la base de datos y separador compatible
        con Excel en español. No se incluye información sensible (contraseñas, tokens ni datos de
        Stripe).
      </p>
    </div>
  );
}
