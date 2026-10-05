import type { Metadata } from "next";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatNumber } from "@/components/admin/format";
import {
  listAccesses,
  listCustomers,
  listEmployees,
  listReservations,
  listServices,
} from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  // Secuencial para no presionar el pool de conexiones.
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <section key={c.tipo} aria-label={`Reporte de ${c.title}`} className="acard acard-pad">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="akpi-label">{c.title}</p>
                <p className="akpi-value">
                  {formatNumber(c.count)}{" "}
                  <span className="text-sm font-semibold text-[#6f625e]">{c.unit}</span>
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
