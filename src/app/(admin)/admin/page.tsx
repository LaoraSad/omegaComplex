import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  QrCode,
  ScanLine,
  Users,
  Waves,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCOP,
  formatNumber,
  formatTime,
  fullName,
} from "@/components/admin/format";
import { servicePhoto } from "@/components/admin/service-image";
import { getDashboardOverview, listServices } from "@/features/admin/admin.repository";

export const metadata: Metadata = { title: "Panel" };

function InstVisual({ name }: { name: string }) {
  const photo = servicePhoto(name);
  if (!photo) {
    return (
      <span aria-hidden="true" className="opdash-image-fallback">
        <Waves className="h-8 w-8" strokeWidth={1.5} />
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
  return (
    <span className={`opdash-occupancy${compact ? " is-compact" : ""}`}>
      <span className="opdash-occupancy-label">
        <span>{compact ? "Ocupación hoy" : "Ocupación de hoy"}</span>
        <strong>{percent}%</strong>
      </span>
      <span className="opdash-occupancy-track" aria-hidden="true">
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
  const featured = services.find((service) => servicePhoto(service.name)) ?? services[0] ?? null;
  const serviceTiles = services.filter((service) => service.id !== featured?.id).slice(0, 4);
  const featuredOcc = featured ? occupancyById.get(featured.id) : undefined;
  const maxDailyReservations = Math.max(1, ...data.dailySeries.map((day) => day.total));
  const reservationsLast14Days = data.dailySeries.reduce((sum, day) => sum + day.total, 0);

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

      <div className="dash-body opdash-body">
        <header className="opdash-intro">
          <div>
            <p className="opdash-kicker">Omega Complex <span>·</span> Resumen de hoy</p>
            <h2>El pulso del complejo</h2>
            <p className="opdash-intro-copy">
              Reservas, instalaciones y accesos en una sola vista.
            </p>
          </div>
          <Link href="/admin/reportes" className="opdash-report-link">
            Explorar reportes <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </header>

        <section aria-label="Resumen de indicadores" className="opdash-metrics">
          <Link href="/admin/reservas" className="opdash-metric" data-tone="wine">
            <span className="opdash-metric-top">
              <span className="opdash-metric-icon"><CalendarDays className="h-5 w-5" /></span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 opdash-metric-link" />
            </span>
            <span className="opdash-metric-label">Reservas registradas</span>
            <strong className="opdash-metric-value">{formatNumber(data.totalReservations)}</strong>
            <span className="opdash-metric-note">
              {formatNumber(confirmed)} confirmadas · {formatNumber(pendingOnly + processing)} por pagar
            </span>
          </Link>

          <Link href="/admin/accesos" className="opdash-metric" data-tone="blue">
            <span className="opdash-metric-top">
              <span className="opdash-metric-icon"><ScanLine className="h-5 w-5" /></span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 opdash-metric-link" />
            </span>
            <span className="opdash-metric-label">Accesos de hoy</span>
            <strong className="opdash-metric-value">{formatNumber(data.accessesToday)}</strong>
            <span className="opdash-metric-note">
              {formatNumber(data.accessesAllowedToday)} permitidos · {formatNumber(data.accessesDeniedToday)} denegados
            </span>
          </Link>

          <Link href="/admin/servicios" className="opdash-metric" data-tone="aqua">
            <span className="opdash-metric-top">
              <span className="opdash-metric-icon"><Waves className="h-5 w-5" /></span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 opdash-metric-link" />
            </span>
            <span className="opdash-metric-label">Ocupación de hoy</span>
            <strong className="opdash-metric-value">
              {occupancyPercent !== null ? `${occupancyPercent}%` : "—"}
            </strong>
            <span className="opdash-metric-note">
              {data.occupancyToday
                ? `${formatNumber(data.occupancyToday.used)} de ${formatNumber(data.occupancyToday.total)} cupos`
                : "Sin franjas programadas"}
            </span>
          </Link>

          <Link href="/admin/reportes" className="opdash-metric" data-tone="gold">
            <span className="opdash-metric-top">
              <span className="opdash-metric-icon"><CircleDollarSign className="h-5 w-5" /></span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 opdash-metric-link" />
            </span>
            <span className="opdash-metric-label">Ingresos</span>
            <strong className="opdash-metric-value is-currency">{formatCOP(data.revenueCop)}</strong>
            <span className="opdash-metric-note">Pagos exitosos · COP</span>
          </Link>
        </section>

        {attention.length > 0 ? (
          <section aria-label="Pendientes operativos" className="opdash-attention">
            <div className="opdash-attention-heading">
              <span className="opdash-attention-icon"><Activity className="h-5 w-5" /></span>
              <span>
                <span className="opdash-attention-kicker">Seguimiento</span>
                <strong>Requiere atención</strong>
              </span>
              <span className="opdash-attention-count">{attention.length}</span>
            </div>
            <ul className="opdash-alert-list">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="opdash-alert-link">
                    <span className={`opdash-alert-count is-${item.tone}`}>{formatNumber(item.count)}</span>
                    <span className="opdash-alert-copy">
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </span>
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="opdash-clear-state">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            <span><strong>Sin pendientes prioritarios</strong><span>La operación no requiere acciones urgentes.</span></span>
          </div>
        )}

        <section aria-label="Ocupación por servicio" className="opdash-installations">
          <div className="opdash-section-heading">
            <div>
              <p className="opdash-section-kicker">Dentro del complejo</p>
              <h2>Ocupación por servicio</h2>
              <p>Capacidad y reservas de las instalaciones para hoy.</p>
            </div>
            <Link href="/admin/servicios" className="opdash-section-link">
              Ver instalaciones <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {featured ? (
            <div className="opdash-service-gallery">
              <article className="opdash-service-feature">
                <Link
                  href={`/admin/servicios/${featured.id}`}
                  className="opdash-media-frame is-feature"
                  aria-label={`Ver instalación ${featured.name}`}
                >
                  <InstVisual name={featured.name} />
                  <span className="opdash-media-category">{featured.category.name}</span>
                  <span className="opdash-media-index">01</span>
                  <span className="opdash-media-cta" aria-hidden="true">
                    Ver instalación <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
                <span className="opdash-feature-content">
                  <span className="opdash-feature-kicker">Instalación destacada</span>
                  <Link
                    href={`/admin/servicios/${featured.id}`}
                    className="opdash-feature-name opdash-feature-name-link"
                  >
                    {featured.name}
                  </Link>
                  <span className="opdash-feature-capacity">
                    <Users aria-hidden="true" className="h-4 w-4" />
                    Capacidad para {formatNumber(featured.capacity)} personas
                  </span>
                  {featuredOcc ? (
                    <InstOcc used={featuredOcc.used} total={featuredOcc.total} />
                  ) : (
                    <span className="opdash-no-schedule">Sin franjas programadas hoy</span>
                  )}
                  <span className="opdash-feature-actions">
                    <Link href={`/admin/servicios/${featured.id}`} className="opdash-feature-action is-primary">
                      Ver servicio <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/reservas?servicio=${featured.id}`}
                      className="opdash-feature-action is-ghost"
                    >
                      Ver reservas
                    </Link>
                  </span>
                </span>
              </article>

              <div className="opdash-service-tiles">
                {serviceTiles.map((service, index) => {
                  const occupancy = occupancyById.get(service.id);
                  return (
                    <Link
                      href={`/admin/servicios/${service.id}`}
                      className="opdash-service-tile"
                      key={service.id}
                      aria-label={`Ver instalación ${service.name}`}
                    >
                      <span className="opdash-media-frame">
                        <InstVisual name={service.name} />
                        <span className="opdash-media-index">{String(index + 2).padStart(2, "0")}</span>
                        <span className="opdash-media-cta" aria-hidden="true">
                          Ver <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </span>
                      <span className="opdash-tile-content">
                        <span className="opdash-tile-category">{service.category.name}</span>
                        <span className="opdash-tile-name">{service.name}</span>
                        <span className="opdash-tile-meta">
                          {occupancy
                            ? `${Math.round((occupancy.used / Math.max(occupancy.total, 1)) * 100)}% ocupado hoy`
                            : `Capacidad ${formatNumber(service.capacity)} personas`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="opdash-empty-state">
              <EmptyState title="Sin servicios configurados" text="Las instalaciones aparecerán aquí cuando estén disponibles." />
            </div>
          )}
        </section>

        <section aria-label="Reservas y tendencia" className="opdash-lower-grid">
          <div className="opdash-panel opdash-reservations-panel">
            <div className="opdash-panel-heading">
              <div>
                <p className="opdash-section-kicker">Agenda</p>
                <h2>Reservas recientes</h2>
              </div>
              <Link href="/admin/reservas" aria-label="Ver todas las reservas" className="opdash-icon-link">
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            {data.recentReservations.length > 0 ? (
              <ul className="opdash-reservation-list">
                {data.recentReservations.slice(0, 5).map((reservation) => (
                  <li key={reservation.id}>
                    <Link href={`/admin/reservas/${reservation.id}`} className="opdash-reservation-row">
                      <span className="opdash-reservation-time">
                        <Clock3 aria-hidden="true" className="h-4 w-4" />
                        {formatTime(reservation.startsAt)}
                      </span>
                      <span className="opdash-reservation-copy">
                        <strong>{fullName(reservation.customer.user.firstName, reservation.customer.user.lastName)}</strong>
                        <span>{reservation.service.name} · {reservation.quantity} {reservation.quantity === 1 ? "persona" : "personas"}</span>
                      </span>
                      <StatusBadge kind="reservation" value={reservation.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Inbox} title="No hay reservas recientes" text="Las reservas nuevas aparecerán aquí." />
            )}
          </div>

          <div className="opdash-panel opdash-trend-panel">
            <div className="opdash-panel-heading">
              <div>
                <p className="opdash-section-kicker">Últimas dos semanas</p>
                <h2>Ritmo de reservas</h2>
              </div>
              <span className="opdash-trend-total">{formatNumber(reservationsLast14Days)}</span>
            </div>
            <p className="opdash-trend-caption">Reservas creadas por día</p>
            <div className="opdash-chart" role="list" aria-label="Reservas creadas durante los últimos 14 días">
              {data.dailySeries.map((day) => (
                <span className="opdash-chart-day" role="listitem" key={day.date} title={`${day.label}: ${day.total} reservas`}>
                  <span className="opdash-chart-track">
                    <span
                      className="opdash-chart-bar"
                      style={{ height: `${day.total > 0 ? Math.max((day.total / maxDailyReservations) * 100, 8) : 3}%` }}
                    />
                  </span>
                  <span className="opdash-chart-label">{day.label}</span>
                </span>
              ))}
            </div>
            <Link href="/admin/reportes" className="opdash-trend-link">
              Abrir reportes <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-label="Accesos recientes" className="opdash-panel opdash-access-panel">
          <div className="opdash-panel-heading">
            <div>
              <p className="opdash-section-kicker">Control de ingreso</p>
              <h2>Accesos recientes</h2>
            </div>
            <Link href="/admin/accesos" className="opdash-section-link">
              Ver todos <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          {data.recentAccesses.length > 0 ? (
            <ul className="opdash-access-list">
              {data.recentAccesses.slice(0, 5).map((access) => (
                <li key={access.id}>
                  <Link
                    href={`/admin/reservas/${access.qrToken.reservationId}`}
                    className="opdash-access-row"
                    aria-label={`Ver reserva de ${fullName(access.qrToken.reservation.customer.user.firstName, access.qrToken.reservation.customer.user.lastName)}`}
                  >
                    <span className="opdash-access-time">{formatTime(access.accessedAt)}</span>
                    <span className="opdash-access-copy">
                      <strong>{fullName(access.qrToken.reservation.customer.user.firstName, access.qrToken.reservation.customer.user.lastName)}</strong>
                      <span>{access.qrToken.reservation.service.name}</span>
                    </span>
                    <span className="opdash-access-employee">
                      Validó {fullName(access.employee.user.firstName, access.employee.user.lastName)}
                    </span>
                    <StatusBadge kind="access" value={access.result} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={QrCode} title="No hay accesos recientes" text="Cada QR validado aparecerá en esta lista." />
          )}
        </section>
      </div>
    </div>
  );
}
