'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockServices } from '@/lib/storefront/mock/services';
import { getAvailabilityForDate, TimeSlotAvailability } from '@/lib/storefront/api/availability';
import PanoramaClient from '@/components/tour/PanoramaClient';
import SectionDivider from '@/components/SectionDivider';
import AmbientBubbles from '@/components/AmbientBubbles';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  Users,
  QrCode,
  AlertTriangle,
  Check,
  CheckCircle2,
  Lock,
  Compass,
  Timer,
  ShieldCheck,
  CreditCard,
  Maximize2,
} from 'lucide-react';

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = use(params);
  const service = mockServices.find((s) => s.id === id);

  if (!service) {
    notFound();
  }

  // Fecha seleccionada (por defecto hoy)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Estados de disponibilidad
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlotAvailability[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Cantidad de entradas / acompañantes
  const [ticketsCount, setTicketsCount] = useState<number>(1);

  // Estado del flujo de reserva (1: Config, 2: Bloqueo 10 min, 3: Confirmado con QRs)
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState<number>(600); // 10 minutos = 600s
  const [isLockExpired, setIsLockExpired] = useState(false);

  // Instalaciones relacionadas (misma categoría, imágenes reales existentes)
  const relatedServices = useMemo(
    () => mockServices.filter((s) => s.categoryId === service.categoryId && s.id !== service.id).slice(0, 4),
    [service.categoryId, service.id],
  );

  // Cargar disponibilidad al cambiar fecha o servicio
  useEffect(() => {
    let isMounted = true;
    getAvailabilityForDate(service.id, selectedDate).then((res) => {
      if (!isMounted) return;
      setIsMaintenance(res.isMaintenanceDay);
      setAvailabilitySlots(res.slots);
      setLoadingAvailability(false);
    });

    return () => {
      isMounted = false;
    };
  }, [service.id, selectedDate]);

  // Temporizador de bloqueo temporal de 10 minutos (Requerimiento 14)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bookingStep === 2 && lockSecondsRemaining > 0) {
      timer = setInterval(() => {
        setLockSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsLockExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [bookingStep, lockSecondsRemaining]);

  const maxAllowedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3); // Máximo 3 meses de anticipación (Requerimiento 11)
    return d.toISOString().split('T')[0];
  }, []);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(service.pricePerHour);
  }, [service.pricePerHour]);

  const totalPrice = useMemo(() => {
    return service.pricePerHour * ticketsCount;
  }, [service.pricePerHour, ticketsCount]);

  const formattedTotalPrice = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(totalPrice);
  }, [totalPrice]);

  const formatLockTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0e0b0d] text-[#f5f1ec] antialiased">
      {/* ============ HERO DE LA INSTALACIÓN ============ */}
      <section className="omega-hero relative -mt-20 flex min-h-[82svh] items-end overflow-hidden pt-20">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={service.image} alt="" className="omega-kenburns h-full w-full object-cover" />
          {/* Mismo tratamiento sutil de la Home para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/62 via-black/28 to-black/10" />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/75 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-14 pt-12 sm:px-8 lg:px-12">
          <Link
            href="/servicios"
            className="omega-fade-up inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/70 transition-colors hover:text-[#e3bd74]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al catálogo</span>
          </Link>

          <p
            className="omega-fade-up mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]"
            style={{ animationDelay: '90ms' }}
          >
            <span>{service.categoryName}</span>
            <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
          </p>
          <h1
            className="omega-fade-up mt-3 max-w-[800px] text-[38px] font-black uppercase leading-[0.98] tracking-tight text-white sm:text-6xl"
            style={{ animationDelay: '150ms' }}
          >
            {service.name}
          </h1>
          <p
            className="omega-fade-up mt-4 max-w-[560px] text-[15px] leading-relaxed text-white/85"
            style={{ animationDelay: '220ms' }}
          >
            {service.description}
          </p>

          <div
            className="omega-fade-up mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-bold uppercase tracking-[0.18em] text-white/80"
            style={{ animationDelay: '280ms' }}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[#e3bd74]" />
              <span>{service.capacity} personas</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#e3bd74]" />
              <span>{formattedPrice} / hora</span>
            </span>
          </div>

          <div className="omega-fade-up mt-7 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: '340ms' }}>
            <a
              href="#reserva"
              className="group inline-flex items-center justify-center gap-2.5 rounded-[4px] bg-[#7a1f3d] px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#8f2547]"
            >
              <span>Reservar ahora</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            {service.tour360Id && (
              <Link
                href={`/tour/${service.tour360Id}`}
                className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-white/25 px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
              >
                <Maximize2 className="h-4 w-4" />
                <span>Tour 360°</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ============ INFORMACIÓN DE LA INSTALACIÓN ============ */}
      <section className="omega-dark-section relative overflow-hidden py-16 sm:py-20">
        <AmbientBubbles variant="mixed" />
        <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
            <span>La instalación</span>
            <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
          </p>
          <h2 className="mt-3 max-w-[640px] text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl">
            Todo lo que debes saber
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Ficha */}
            <div className="omega-card-dark rounded-[6px] p-7">
              <Clock className="h-6 w-6 text-[#e3bd74]" strokeWidth={1.6} />
              <h3 className="mt-4 text-[15px] font-extrabold uppercase tracking-wide text-white">
                Ficha de la instalación
              </h3>
              <dl className="mt-4 space-y-2.5 text-[13px] text-white/60">
                <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <dt>Capacidad</dt>
                  <dd className="font-bold text-white">{service.capacity} personas</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <dt>Duración</dt>
                  <dd className="font-bold text-white">Franjas de 1 hora</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <dt>Tarifa</dt>
                  <dd className="font-bold text-[#e3bd74]">{formattedPrice} / hora</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Categoría</dt>
                  <dd className="font-bold text-white">{service.categoryName}</dd>
                </div>
              </dl>
            </div>

            {/* Vista 360 */}
            <div className="omega-card-dark overflow-hidden rounded-[6px]">
              <div className="flex items-center justify-between px-7 pt-7">
                <h3 className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide text-white">
                  <Compass className="h-5 w-5 text-[#e3bd74]" />
                  <span>Vista 360°</span>
                </h3>
                {service.tour360Id && (
                  <Link
                    href={`/tour/${service.tour360Id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#e3bd74] transition-colors hover:text-white"
                  >
                    <span>Tour completo</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              <div className="p-5">
                <div className="h-64 overflow-hidden rounded-[4px] bg-black">
                  <PanoramaClient src={service.panoramaUrl} caption={service.name} />
                </div>
                <p className="mt-3 px-2 text-[12px] text-white/50">
                  Gira o arrastra para explorar el espacio antes de reservar.
                </p>
              </div>
            </div>

            {/* Normas */}
            <div className="omega-card-dark rounded-[6px] p-7">
              <ShieldCheck className="h-6 w-6 text-[#e3bd74]" strokeWidth={1.6} />
              <h3 className="mt-4 text-[15px] font-extrabold uppercase tracking-wide text-white">
                Normas de ingreso
              </h3>
              {service.rules && service.rules.length > 0 ? (
                <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-white/60">
                  {service.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e3bd74]" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-[13px] leading-relaxed text-white/60">
                  Consulta las normas generales del complejo en la sección de información.
                </p>
              )}
              <div className="mt-5 border-t border-white/10 pt-4 text-[12px] leading-relaxed text-white/50">
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#e3bd74]" />
                  <span>Reservas hasta con 3 meses de anticipación.</span>
                </p>
                <p className="mt-1.5">Horario: 08:00 – 17:00 · Lunes cerrado.</p>
              </div>
            </div>
          </div>

          {/* Horarios del servicio (datos reales) */}
          {service.schedules && service.schedules.length > 0 && (
            <div className="mt-5 omega-card-dark rounded-[6px] p-7">
              <h3 className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide text-white">
                <Clock className="h-5 w-5 text-[#e3bd74]" />
                <span>Franjas horarias</span>
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {service.schedules.map((s) => (
                  <span
                    key={s}
                    className="rounded-[4px] border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-bold tracking-wide text-white/80"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {service.availableDays && service.availableDays.length > 0 && (
                <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-white/50">
                  Días habilitados: <span className="font-bold text-white/80">{service.availableDays.join(' · ')}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ============ GALERÍA: MISMA CATEGORÍA ============ */}
      {relatedServices.length > 0 && (
        <>
          <SectionDivider />
          <section className="omega-dark-section-2 relative overflow-hidden py-16 sm:py-20">
            <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
                    <span>También en {service.categoryName}</span>
                    <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
                  </p>
                  <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl">
                    Sigue explorando
                  </h2>
                </div>
                <Link
                  href="/servicios"
                  className="group inline-flex w-fit items-center gap-2.5 rounded-[4px] border border-white/25 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
                >
                  <span>Ver todas las instalaciones</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {relatedServices.map((s) => (
                  <article key={s.id} className="omega-card omega-card-dark group relative overflow-hidden rounded-[6px]">
                    <Link href={`/servicios/${s.id}`} aria-label={`Ver ${s.name}`} className="block">
                      <div className="relative h-[280px] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.image}
                          alt={s.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                          <div>
                            <h3 className="text-[15px] font-extrabold uppercase leading-tight tracking-wide text-white">
                              {s.name}
                            </h3>
                            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-white/65">
                              <Users className="h-3.5 w-3.5 text-[#e3bd74]" />
                              <span>{s.capacity} personas</span>
                            </p>
                          </div>
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-all group-hover:border-[#e3bd74] group-hover:bg-[#e3bd74] group-hover:text-[#1d1214]">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <SectionDivider />

      {/* ============ RESERVA ============ */}
      <section id="reserva" className="relative scroll-mt-20 overflow-hidden bg-[#14090f] py-16 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[#7a1f3d]/25 blur-[110px]"
        />
        <div className="relative mx-auto max-w-[900px] px-5 sm:px-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
              <span>Reserva tu franja</span>
              <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
            </p>
            <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl">
              Asegura tu espacio
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-white/60">
              Disponibilidad en tiempo real, cobro por hora y códigos QR de acceso inmediato.
            </p>
          </div>

          <div className="omega-card-dark mt-10 rounded-[6px] p-6 sm:p-8">
            {/* PASO 1: SELECCIÓN DE FECHA Y HORARIO */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                {/* Selector de Fecha */}
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                    <Calendar className="h-4 w-4 text-[#e3bd74]" />
                    <span>1. Selecciona la fecha (hasta 3 meses):</span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    max={maxAllowedDate}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedSlot(null);
                      setLoadingAvailability(true);
                      setSelectedDate(e.target.value);
                    }}
                    className="w-full rounded-[4px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white [color-scheme:dark] focus:border-[#e3bd74] focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-white/50">
                    * El complejo opera de 08:00 a 17:00. Lunes cerrado por mantenimiento.
                  </p>
                </div>

                {/* Alerta de día de mantenimiento */}
                {isMaintenance ? (
                  <div className="space-y-1 rounded-[4px] border border-red-400/30 bg-red-500/10 p-4 text-xs text-red-200 sm:text-sm">
                    <p className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span>Complejo cerrado por mantenimiento</span>
                    </p>
                    <p className="text-xs text-red-200/80">
                      Los lunes no se prestan servicios por jornada de mantenimiento general (si el lunes es festivo, se traslada al martes). Por favor selecciona otra fecha.
                    </p>
                  </div>
                ) : (
                  /* Selector de Franjas Horarias */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                        <Clock className="h-4 w-4 text-[#e3bd74]" />
                        <span>2. Horario disponible (08:00 - 17:00):</span>
                      </label>
                      <span className="text-[11px] text-white/50">
                        {loadingAvailability ? 'Verificando...' : 'En tiempo real'}
                      </span>
                    </div>

                    {/* Guía de estados */}
                    <div className="flex flex-wrap gap-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Disponible
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-white/20" /> Ocupado
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Bloqueado (10m)
                      </span>
                    </div>

                    {/* Grid de franjas */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {availabilitySlots.map((slot) => {
                        const isAvailable = slot.status === 'disponible';
                        const isBlocked = slot.status === 'bloqueado';
                        const isSelected = selectedSlot === slot.timeSlot;

                        return (
                          <button
                            key={slot.timeSlot}
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot.timeSlot)}
                            className={`rounded-[4px] border p-3 text-left transition-all ${
                              isSelected
                                ? 'border-[#7A1F3D] bg-[#7A1F3D] text-white'
                                : isAvailable
                                ? 'cursor-pointer border-white/10 bg-white/5 text-white hover:border-[#e3bd74]'
                                : isBlocked
                                ? 'cursor-not-allowed border-amber-400/20 bg-amber-500/5 text-white/40 opacity-75'
                                : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/30 opacity-60'
                            }`}
                          >
                            <p className="text-xs font-bold">{slot.timeSlot}</p>
                            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider opacity-80">
                              {isAvailable
                                ? `${slot.availableCapacity} cupos libres`
                                : isBlocked
                                ? 'Bloqueo temporal'
                                : 'Agotado'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cantidad de entradas / acompañantes */}
                {selectedSlot && !isMaintenance && (
                  <div className="space-y-4 border-t border-white/10 pt-6">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                          <Users className="h-4 w-4 text-[#e3bd74]" />
                          <span>3. Entradas requeridas:</span>
                        </label>
                        <span className="text-xs font-bold text-[#e3bd74]">
                          1 QR por persona
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                          className="h-10 w-10 cursor-pointer rounded-[4px] border border-white/10 bg-white/5 text-lg font-bold text-white transition-colors hover:border-[#e3bd74]"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-lg font-black text-white">
                          {ticketsCount}
                        </span>
                        <button
                          onClick={() => setTicketsCount(Math.min(service.capacity, ticketsCount + 1))}
                          className="h-10 w-10 cursor-pointer rounded-[4px] border border-white/10 bg-white/5 text-lg font-bold text-white transition-colors hover:border-[#e3bd74]"
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-white/50">
                        Cada entrada generará un código QR individual e intransferible.
                      </p>
                    </div>

                    {/* Resumen de cobro */}
                    <div className="space-y-2 rounded-[4px] border border-white/10 bg-white/5 p-4">
                      <div className="flex justify-between text-xs text-white/50">
                        <span>Servicio:</span>
                        <span className="font-semibold text-white">{service.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/50">
                        <span>Fecha y hora:</span>
                        <span className="font-semibold text-white">{selectedDate} ({selectedSlot})</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/50">
                        <span>Total entradas:</span>
                        <span className="font-semibold text-white">{ticketsCount} persona(s)</span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-white/10 pt-2 text-base font-black text-white">
                        <span>Total a pagar:</span>
                        <span className="text-xl text-[#e3bd74]">{formattedTotalPrice} COP</span>
                      </div>
                    </div>

                    {/* Botón para iniciar bloqueo temporal y pago */}
                    <button
                      onClick={() => {
                        setBookingStep(2);
                        setLockSecondsRemaining(600);
                        setIsLockExpired(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-[#7A1F3D] py-4 text-center text-sm font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8f2547]"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Continuar a bloqueo y pago</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: BLOQUEO TEMPORAL DE 10 MINUTOS Y PAGO */}
            {bookingStep === 2 && (
              <div className="space-y-6">
                {isLockExpired ? (
                  <div className="space-y-3 rounded-[4px] border border-red-400/30 bg-red-500/10 p-6 text-center">
                    <Timer className="mx-auto h-10 w-10 text-red-400" />
                    <h4 className="text-base font-bold text-red-200">
                      El bloqueo de 10 minutos ha expirado
                    </h4>
                    <p className="text-xs leading-relaxed text-red-200/80">
                      Para garantizar un aforo justo para todos los clientes, el cupo temporal se ha liberado. Por favor selecciona nuevamente tu horario.
                    </p>
                    <button
                      onClick={() => {
                        setBookingStep(1);
                        setSelectedSlot(null);
                        setIsLockExpired(false);
                      }}
                      className="cursor-pointer rounded-[4px] bg-[#7A1F3D] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#8f2547]"
                    >
                      Volver a seleccionar horario
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Contador regresivo de bloqueo temporal */}
                    <div className="flex items-center justify-between rounded-[4px] border border-amber-400/25 bg-amber-500/10 p-4">
                      <div className="space-y-0.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                          <Timer className="h-3.5 w-3.5 animate-pulse text-amber-300" />
                          <span>Bloqueo temporal activo:</span>
                        </span>
                        <p className="text-xs text-amber-200/80">
                          Tu cupo está reservado exclusivamente para ti.
                        </p>
                      </div>
                      <div className="rounded-[4px] border border-amber-400/25 bg-black/40 px-3 py-1 text-2xl font-black tabular-nums tracking-wide text-[#e3bd74]">
                        {formatLockTimer(lockSecondsRemaining)}
                      </div>
                    </div>

                    {/* Resumen de reserva */}
                    <div className="space-y-2.5 rounded-[4px] border border-white/10 bg-white/5 p-5 text-xs text-white/50">
                      <div className="flex justify-between">
                        <span>Servicio:</span>
                        <span className="font-bold text-white">{service.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horario:</span>
                        <span className="font-bold text-white">{selectedDate} / {selectedSlot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entradas individuales:</span>
                        <span className="font-bold text-white">{ticketsCount} QR</span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-white/10 pt-2 text-base font-black text-white">
                        <span>Monto total:</span>
                        <span className="text-xl text-[#e3bd74]">{formattedTotalPrice} COP</span>
                      </div>
                    </div>

                    {/* Proveedor de Pago Stripe */}
                    <div className="space-y-3">
                      <span className="block text-xs font-bold uppercase tracking-wider text-white">
                        Pasarela de pago segura:
                      </span>
                      <div className="flex items-center justify-between rounded-[4px] border border-white/10 bg-white/5 p-3.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-indigo-300" />
                          <span className="text-sm font-black tracking-tight text-indigo-200">stripe</span>
                          <span className="text-xs font-medium text-white/50">Tarjeta débito / crédito (COP)</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Cifrado SSL</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setBookingStep(3);
                        }}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-[#7A1F3D] py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8f2547]"
                      >
                        <span>Pagar {formattedTotalPrice} COP con Stripe</span>
                        <span>→</span>
                      </button>

                      <button
                        onClick={() => setBookingStep(1)}
                        className="w-full cursor-pointer py-2 text-xs font-semibold text-white/50 transition-colors hover:text-white"
                      >
                        Cancelar y cambiar franja
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO 3: CONFIRMACIÓN Y EMISIÓN DE CÓDIGOS QR */}
            {bookingStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                    ¡Reserva confirmada!
                  </h4>
                  <p className="text-xs text-white/60 sm:text-sm">
                    Hemos generado {ticketsCount} código(s) QR individual(es) para tu acceso.
                  </p>
                </div>

                {/* Tarjetas de códigos QR individuales */}
                <div className="space-y-3 pt-2">
                  {Array.from({ length: ticketsCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center gap-4 rounded-[4px] border border-white/10 bg-white/5 p-4 text-left sm:flex-row"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border border-white/10 bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=OMEGA-${service.id}-${selectedDate}-${idx + 1}`}
                          alt="Código QR de Entrada"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-center sm:text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#e3bd74]">
                          Entrada {idx + 1} de {ticketsCount}
                        </span>
                        <p className="truncate text-xs font-extrabold text-white">
                          {service.name}
                        </p>
                        <p className="text-[11px] text-white/50">
                          {selectedDate} | {selectedSlot}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Válido
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-white/50">
                  Los códigos también fueron enviados a tu correo electrónico. Puedes consultarlos en cualquier momento en <strong>Mis reservas</strong>.
                </p>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Link
                    href="/mis-reservas"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-[#7A1F3D] py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8f2547]"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Ver mis reservas</span>
                  </Link>
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedSlot(null);
                    }}
                    className="flex-1 cursor-pointer rounded-[4px] border border-white/15 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
                  >
                    Hacer otra reserva
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
