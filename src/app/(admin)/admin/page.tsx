import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  QrCode,
  ScanLine,
  Waves,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCOP,
  formatNumber,
  formatTime,
  fullName,
  initials,
} from "@/components/admin/format";
import { servicePhoto } from "@/components/admin/service-image";
import type { ServiceRow } from "@/features/admin/admin.types";
import { getDashboardOverview, listServices } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Panel" };

function InstVisual({ name }: { name: string }) {
  const photo = servicePhoto(name);
  if (!photo) {
    return (
      <span aria-hidden="true" className="ainst-fallback">
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={photo}
      alt=""
      width={880}
      height={550}
      loading="lazy"
      sizes="(max-width: 1024px) 100vw, 50vw"
    />
  );
}

function InstOcc({ used, total, compact }: { used: number; total: number; compact?: boolean }) {
  const percent = total > 0 ? Math.round((used / total) * 100) : null;
  if (percent === null) return null;
  if (compact) {
    return (
      <>
        <span className="ainst-card2-meta block">Hoy {percent}% ocupado</span>
        <span className="ainst-track" aria-hidden="true">
          <span style={{ width: `${Math.min(percent, 100)}%` }} />
        </span>
      </>
    );
  }
  return (
    <span className="ainst-occ">
      <span className="ainst-occ-top">
        <span>Ocupación de hoy</span>
        <strong>{percent}%</strong>
      </span>
      <span className="ainst-track" aria-hidden="true">
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </span>
    </span>
  );
}

export default async function AdminDashboardPage() {
  // Secuencial para no presionar el pool de conexiones.
  const data = await getDashboardOverview();
  const services = await listServices();

  const confirmed = data.reservationsByStatus.confirmed ?? 0;
  const pendingOnly = data.reservationsByStatus.pending_payment ?? 0;
  const processing = data.reservationsByStatus.payment_processing ?? 0;

  const occupancyPercent = data.occupancyToday
    ? Math.round((data.occupancyToday.used / Math.max(data.occupancyToday.total, 1)) * 100)
    : null;
  const confirmedShare =
    data.totalReservations > 0 ? Math.round((confirmed / data.totalReservations) * 100) : 0;

  const attention: Array<{ label: string; detail: string; count: number; href: string; tone: string }> = [];
  if (pendingOnly > 0) {
    attention.push({
      label: "Pendientes de pago",
      detail: "Reservas en espera de pago",
      count: pendingOnly,
      href: "/admin/reservas?estado=pending_payment",
      tone: "amber",
    });
  }
  if (processing > 0) {
    attention.push({
      label: "Procesando pago",
      detail: "Pagos en curso con tarjeta",
      count: processing,
      href: "/admin/reservas?estado=payment_processing",
      tone: "blue",
    });
  }
  if (data.accessesDeniedToday > 0) {
    attention.push({
      label: "Accesos denegados hoy",
      detail: "Revisar motivo en accesos",
      count: data.accessesDeniedToday,
      href: "/admin/accesos?resultado=denied",
      tone: "rose",
    });
  }
  if (data.holdsActive > 0) {
    attention.push({
      label: "Retenciones activas",
      detail: "Ventana de 10 minutos",
      count: data.holdsActive,
      href: "/admin/reservas",
      tone: "slate",
    });
  }

  const occupancyById = new Map(data.occupancyByService.map((s) => [s.serviceId, s]));
  const featured: ServiceRow | null = services[0] ?? null;
  const rest = services.slice(1, 6);
  const featuredOcc = featured ? occupancyById.get(featured.id) : undefined;

  const activity = [
    ...data.recentAccesses.map((a) => ({
      id: `a-${a.id}`,
      time: a.accessedAt,
      title: "Acceso registrado",
      detail: `${fullName(a.qrToken.reservation.customer.user.firstName, a.qrToken.reservation.customer.user.lastName)} · ${a.qrToken.reservation.service.name}`,
    })),
    ...data.recentReservations.map((r) => ({
      id: `r-${r.id}`,
      time: r.createdAt,
      title: r.status === "confirmed" ? "Reserva confirmada" : "Reserva registrada",
      detail: `${fullName(r.customer.user.firstName, r.customer.user.lastName)} · ${r.service.name}`,
    })),
  ]
    .sort((x, y) => +new Date(y.time) - +new Date(x.time))
    .slice(0, 7);

  return (
    <div className="dash-stack">
      {/* Hero: hero-admin.png oficial (el titulo vive en la imagen) */}
      <section aria-label="Panel de administración" className="aops-hero-photo is-designed">
        <Image
          src="/hero-admin.png"
          alt="Panel de administración — Operación diaria de Omega Complex"
          fill
          priority
          sizes="100vw"
          className="aops-hero-img"
        />
        <h1 className="sr-only">Panel de administración de Omega Complex</h1>
        <div className="aops-hero-actions">
          <Link href="/admin/reservas" className="abtn abtn-light">
            <CalendarDays className="h-4 w-4" />
            Ver reservas
          </Link>
          <Link href="/admin/reportes" className="abtn abtn-primary">
            Exportar datos
          </Link>
        </div>
      </section>

      {/* El cuerpo conserva el ancho de lectura; solo el hero es full-bleed. */}
      <div className="dash-body">
      {/* Métricas */}
      <section aria-label="Métricas" className="akpi-grid">
        <Link href="/admin/reservas" className="akpi-card">
          <span className="akpi-top">
            <span aria-hidden="true" className="akpi-disc is-rose">
              <CalendarDays className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="akpi-main">
              <span className="akpi-name block">Reservas registradas</span>
              <span className="akpi-number block">{formatNumber(data.totalReservations)}</span>
            </span>
            <span aria-hidden="true" className="akpi-go">
              <ChevronRight className="h-4 w-4" />
            </span>
          </span>
          <span className="akpi-foot">
            <span>
              <strong>{formatNumber(confirmed)}</strong> confirmadas ·{" "}
              <strong>{formatNumber(pendingOnly + processing)}</strong> por pagar
            </span>
          </span>
          <span className="akpi-bar" aria-hidden="true">
            <span style={{ width: `${confirmedShare}%` }} />
          </span>
        </Link>

        <Link href="/admin/accesos" className="akpi-card">
          <span className="akpi-top">
            <span aria-hidden="true" className="akpi-disc is-blue">
              <ScanLine className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="akpi-main">
              <span className="akpi-name block">Accesos de hoy</span>
              <span className="akpi-number block">{formatNumber(data.accessesToday)}</span>
            </span>
            <span aria-hidden="true" className="akpi-go">
              <ChevronRight className="h-4 w-4" />
            </span>
          </span>
          <span className="akpi-foot">
            <span>
              <strong>{formatNumber(data.accessesAllowedToday)}</strong> permitidos ·{" "}
              <strong>{formatNumber(data.accessesDeniedToday)}</strong> denegados
            </span>
          </span>
        </Link>

        <Link href="/admin/servicios" className="akpi-card">
          <span className="akpi-top">
            <span aria-hidden="true" className="akpi-disc is-amber">
              <Waves className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="akpi-main">
              <span className="akpi-name block">Ocupación de hoy</span>
              <span className="akpi-number block">
                {occupancyPercent !== null ? `${occupancyPercent}%` : "—"}
              </span>
            </span>
            <span aria-hidden="true" className="akpi-go">
              <ChevronRight className="h-4 w-4" />
            </span>
          </span>
          <span className="akpi-foot">
            <span>
              {data.occupancyToday ? (
                <>
                  <strong>{formatNumber(data.occupancyToday.used)}</strong> de{" "}
                  <strong>{formatNumber(data.occupancyToday.total)}</strong> cupos en franja
                </>
              ) : (
                "Sin franjas para hoy"
              )}
            </span>
          </span>
          {occupancyPercent !== null ? (
            <span className="akpi-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(occupancyPercent, 100)}%` }} />
            </span>
          ) : null}
        </Link>

        <Link href="/admin/reportes" className="akpi-card">
          <span className="akpi-top">
            <span aria-hidden="true" className="akpi-disc is-emerald">
              <CircleDollarSign className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="akpi-main">
              <span className="akpi-name block">Ingresos</span>
              <span className="akpi-number block" style={{ fontSize: "1.35rem", paddingTop: "0.25rem" }}>
                {formatCOP(data.revenueCop)}
              </span>
            </span>
            <span aria-hidden="true" className="akpi-go">
              <ChevronRight className="h-4 w-4" />
            </span>
          </span>
          <span className="akpi-foot">
            <span>Pagos exitosos con tarjeta · COP</span>
          </span>
        </Link>
      </section>

      {/* Atención */}
      {attention.length > 0 ? (
        <section aria-label="Requiere atención">
          <div className="asection-head">
            <p className="asection-kicker">Operación</p>
          </div>
          <h2 className="admin-section-title">Requiere atención</h2>
          <ul className="mt-1">
            {attention.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="aattention-row">
                  <span aria-hidden="true" className={`aattention-dot is-${item.tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#211a1d]">{item.label}</span>
                    <span className="block truncate text-xs text-[#6f625e]">{item.detail}</span>
                  </span>
                  <span className="anum text-lg font-extrabold text-[#211a1d]">
                    {formatNumber(item.count)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#a89c97]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Instalaciones: bloque principal a todo el ancho */}
      <section aria-label="Instalaciones">
          <div className="asection-head">
            <p className="asection-kicker">Instalaciones</p>
            <Link href="/admin/servicios" className="asection-link">
              Ver servicios
            </Link>
          </div>
          <h2 className="admin-section-title">Ocupación por servicio</h2>
          <p className="admin-section-sub">Estado actual de las instalaciones.</p>
          {services.length > 0 ? (
            <>
              {featured ? (
                <Link href="/admin/servicios" className="ainst-feature">
                  <span className="ainst-feature-photo">
                    <InstVisual name={featured.name} />
                  </span>
                  <span className="ainst-feature-body">
                    <span className="ainst-feature-cat block">
                      {featured.category.name} · Instalación principal
                    </span>
                    <span className="ainst-feature-name block">{featured.name}</span>
                    <span className="ainst-feature-meta block">
                      Capacidad: {formatNumber(featured.capacity)} personas
                    </span>
                    {featuredOcc ? (
                      <InstOcc used={featuredOcc.used} total={featuredOcc.total} />
                    ) : (
                      <span className="ainst-feature-meta block">Sin franjas para hoy</span>
                    )}
                  </span>
                </Link>
              ) : null}
              <ul className="ainst-subgrid">
                {rest.map((s, i) => {
                  const occ = occupancyById.get(s.id);
                  const layout =
                    i === rest.length - 1 && rest.length % 2 === 1
                      ? "side"
                      : i % 2 === 0
                        ? "top"
                        : "bottom";
                  return (
                    <li key={s.id}>
                      <Link href="/admin/servicios" className="ainst-card2" data-layout={layout}>
                        <span className="ainst-card2-photo">
                          <InstVisual name={s.name} />
                        </span>
                        <span className="ainst-card2-body">
                          <span className="ainst-card2-name block">{s.name}</span>
                          <span className="ainst-card2-meta block">
                            Capacidad: {formatNumber(s.capacity)} personas
                          </span>
                          {occ ? (
                            <InstOcc used={occ.used} total={occ.total} compact />
                          ) : (
                            <span className="ainst-card2-meta block">Sin franjas para hoy</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="mt-3 rounded-[14px] border border-dashed border-[#d8cfcc] px-4 py-6">
              <EmptyState
                title="Sin servicios configurados"
                text="Cuando existan servicios en la base de datos aparecerán aquí."
              />
            </div>
          )}
      </section>

      {/* Reservas + actividad */}
      <section aria-label="Reservas y actividad" className="dash-grid-main">
        <div>
          <div className="asection-head">
            <p className="asection-kicker">Reservas</p>
            <Link href="/admin/reservas" className="asection-link">
              Ver todas
            </Link>
          </div>
          <h2 className="admin-section-title">Reservas recientes</h2>
          <p className="admin-section-sub">Últimas reservas del día.</p>
          {data.recentReservations.length > 0 ? (
            <ul className="atimeline mt-2">
              {data.recentReservations.slice(0, 5).map((r) => (
                <li key={r.id} className="atimeline-row">
                  <Link href={`/admin/reservas/${r.id}`} className="atimeline-link">
                    <span className="anum w-11 shrink-0 text-[0.8rem] font-bold text-[#211a1d]">
                      {formatTime(r.startsAt)}
                    </span>
                    <span aria-hidden="true" className="atimeline-avatar">
                      {initials(r.customer.user.firstName, r.customer.user.lastName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#211a1d]">
                        {fullName(r.customer.user.firstName, r.customer.user.lastName)}
                      </span>
                      <span className="block truncate text-xs text-[#6f625e]">
                        {r.service.name} · {r.quantity} {r.quantity === 1 ? "persona" : "personas"}
                      </span>
                    </span>
                    <StatusBadge kind="reservation" value={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-[14px] border border-dashed border-[#d8cfcc] px-4 py-6">
              <EmptyState
                icon={Inbox}
                title="No hay reservas recientes"
                text="Las reservas nuevas de los clientes aparecerán aquí."
              />
            </div>
          )}
        </div>

        <div>
          <div className="asection-head">
            <p className="asection-kicker">Sistema</p>
          </div>
          <h2 className="admin-section-title">Actividad reciente</h2>
          <p className="admin-section-sub">Últimas acciones en el sistema.</p>
          {activity.length > 0 ? (
            <ul className="afeed">
              {activity.map((item) => (
                <li key={item.id} className="afeed-row">
                  <p className="afeed-time">{formatTime(item.time)}</p>
                  <p className="afeed-title">{item.title}</p>
                  <p className="afeed-detail">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-[14px] border border-dashed border-[#d8cfcc] px-4 py-6">
              <EmptyState
                title="Sin actividad reciente"
                text="La actividad real del sistema aparecerá aquí."
              />
            </div>
          )}
        </div>
      </section>

      {/* Accesos a todo el ancho */}
      <section aria-label="Accesos recientes" className="dash-gap-lg">
        <div>
          <div className="asection-head">
            <p className="asection-kicker">Ingresos</p>
            <Link href="/admin/accesos" className="asection-link">
              Ver todos
            </Link>
          </div>
          <h2 className="admin-section-title">Accesos recientes</h2>
          <p className="admin-section-sub">Últimos registros de ingreso.</p>
          {data.recentAccesses.length > 0 ? (
            <div className="atable-wrap mt-3">
              <table className="atable">
                <thead>
                  <tr>
                    <th scope="col">Hora</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Servicio</th>
                    <th scope="col">Empleado</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAccesses.slice(0, 6).map((a) => (
                    <tr key={a.id}>
                      <td className="anum whitespace-nowrap text-[0.8rem] font-bold">
                        {formatTime(a.accessedAt)}
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="atimeline-avatar" style={{ width: "1.9rem", height: "1.9rem", fontSize: "0.6rem" }}>
                            {initials(
                              a.qrToken.reservation.customer.user.firstName,
                              a.qrToken.reservation.customer.user.lastName,
                            )}
                          </span>
                          <span className="font-bold text-[#211a1d]">
                            {fullName(
                              a.qrToken.reservation.customer.user.firstName,
                              a.qrToken.reservation.customer.user.lastName,
                            )}
                          </span>
                        </span>
                      </td>
                      <td>{a.qrToken.reservation.service.name}</td>
                      <td>{fullName(a.employee.user.firstName, a.employee.user.lastName)}</td>
                      <td>
                        <StatusBadge kind="access" value={a.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-[14px] border border-dashed border-[#d8cfcc] px-4 py-6">
              <EmptyState
                icon={QrCode}
                title="No hay accesos recientes"
                text="Cada QR validado quedará registrado con fecha, hora y autorizador."
              />
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
