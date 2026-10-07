'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockServices } from '@/lib/storefront/mock/services';
import { getAvailabilityForDate, TimeSlotAvailability } from '@/lib/storefront/api/availability';
import PanoramaModal from '@/components/tour/PanoramaModal';
import PanningImage from '@/components/tour/PanningImage';
import AmbientBubbles from '@/components/AmbientBubbles';
import SectionDivider from '@/components/SectionDivider';
import {
  ArrowLeft,
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
    <div className="omega-dark-section relative overflow-hidden bg-[#0e0b0d] text-white">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="mixed" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Botón de retorno */}
      <div className="mb-6">
        <Link
          href="/servicios"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/55 hover:text-[#e3bd74] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo de servicios</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Información del Servicio y Reglas (7 cols) */}
        <div className="lg:col-span-7">
          {/* Tarjeta principal del servicio */}
          <div className="omega-ring h-full">
          <div className="omega-ring-inner p-6 sm:p-8 space-y-6 bg-[#141013]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 bg-white/5 text-white/85">
                {service.categoryName}
              </span>
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#7A1F3D] text-white flex items-center gap-1.5 shadow-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Capacidad oficial: {service.capacity} personas</span>
              </span>
            </div>

            <div>
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
                <span>Publicación oficial</span>
                <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {service.name}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              {service.description}
            </p>

            {/* Foto del servicio (se puede ampliar) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#e3bd74]" />
                  <span>Fotografía del espacio:</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/40 hidden sm:inline">Toca la imagen para ampliarla</span>
                </div>
              </div>
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-black shadow-inner border border-white/10">
                <PanoramaModal src={service.panoramaUrl} title={service.name} subtitle={service.categoryName} trigger={
                  <PanningImage src={service.image} alt={service.name} />
                } />
              </div>
            </div>

            <SectionDivider />

            {/* Ficha técnica y reglas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[11px] uppercase font-bold text-white/45 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#e3bd74]" />
                  <span>Duración de la reserva</span>
                </span>
                <p className="font-extrabold text-white">
                  Franjas de 1 hora exacta
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[11px] uppercase font-bold text-white/45 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#e3bd74]" />
                  <span>Tarifa por hora</span>
                </span>
                <p className="font-extrabold text-[#e3bd74]">
                  {formattedPrice} COP
                </p>
              </div>
            </div>

            {/* Reglas oficiales si aplican */}
            {service.rules && service.rules.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-400/25 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span>Normas obligatorias de ingreso:</span>
                </h4>
                <ul className="text-xs sm:text-sm text-amber-100/85 space-y-1.5 font-medium">
                  {service.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#e3bd74] shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Columna Derecha: Flujo de Disponibilidad y Reserva (5 cols) */}
        <div className="lg:col-span-5">
          <div className="omega-ring h-full">
          <div className="omega-ring-inner p-6 sm:p-8 space-y-6 bg-[#141013]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
                  Paso a paso
                </span>
                <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">
                  Reserva tu Franja
                </h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#7A1F3D] text-white">
                Cobro por hora
              </span>
            </div>

            {/* PASO 1: SELECCIÓN DE FECHA Y HORARIO */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                {/* Selector de Fecha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#e3bd74]" />
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white [color-scheme:dark] placeholder-white/35 focus:outline-none focus:border-[#e3bd74] focus:shadow-[0_0_0_3px_rgba(227,189,116,0.18)] transition-all"
                  />
                  <p className="text-[11px] text-white/45 mt-1.5">
                    * El complejo opera de 08:00 a 17:00. Lunes cerrado por mantenimiento.
                  </p>
                </div>

                <SectionDivider />

                {/* Alerta de día de mantenimiento */}
                {isMaintenance ? (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/25 text-red-100 text-xs sm:text-sm space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Complejo cerrado por mantenimiento</span>
                    </p>
                    <p className="text-xs text-red-100/75">
                      Los lunes no se prestan servicios por jornada de mantenimiento general (si el lunes es festivo, se traslada al martes). Por favor selecciona otra fecha.
                    </p>
                  </div>
                ) : (
                  /* Selector de Franjas Horarias */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#e3bd74]" />
                        <span>2. Horario disponible (08:00 - 17:00):</span>
                      </label>
                      <span className="text-[11px] text-white/45">
                        {loadingAvailability ? 'Verificando...' : 'En tiempo real'}
                      </span>
                    </div>

                    {/* Guía de estados */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-white/50 pb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white/20" /> Ocupado
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Bloqueado (10m)
                      </span>
                    </div>

                    {/* Grid de franjas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availabilitySlots.map((slot) => {
                        const isAvailable = slot.status === 'disponible';
                        const isBlocked = slot.status === 'bloqueado';
                        const isSelected = selectedSlot === slot.timeSlot;

                        return (
                          <button
                            key={slot.timeSlot}
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot.timeSlot)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-[#7A1F3D] text-white border-[#e3bd74]/60 shadow-[0_0_24px_rgba(122,31,61,0.5)] cursor-pointer'
                                : isAvailable
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#e3bd74]/50 text-white cursor-pointer'
                                : isBlocked
                                ? 'bg-amber-500/10 border-amber-400/25 text-white/50 cursor-not-allowed opacity-75'
                                : 'bg-white/[0.03] border-white/10 text-white/30 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <p className="font-bold text-xs">{slot.timeSlot}</p>
                            <span className="text-[10px] font-semibold block mt-0.5 opacity-90">
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
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#e3bd74]" />
                          <span>3. Entradas requeridas:</span>
                        </label>
                        <span className="text-xs font-bold text-[#e3bd74]">
                          1 QR por persona
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-lg font-bold text-white border border-white/10 cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <span className="text-lg font-black text-white w-10 text-center">
                          {ticketsCount}
                        </span>
                        <button
                          onClick={() => setTicketsCount(Math.min(service.capacity, ticketsCount + 1))}
                          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-lg font-bold text-white border border-white/10 cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-white/45 mt-1">
                        Cada entrada generará un código QR individual e intransferible.
                      </p>
                    </div>

                    {/* Resumen de cobro */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between text-xs text-white/55">
                        <span>Servicio:</span>
                        <span className="font-semibold text-white">{service.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/55">
                        <span>Fecha y hora:</span>
                        <span className="font-semibold text-white">{selectedDate} ({selectedSlot})</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/55">
                        <span>Total entradas:</span>
                        <span className="font-semibold text-white">{ticketsCount} persona(s)</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline font-black text-base text-white">
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
                      className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#8f2547] text-white font-extrabold text-sm shadow-[0_10px_28px_rgba(122,31,61,0.4)] transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Continuar a Bloqueo y Pago →</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: BLOQUEO TEMPORAL DE 10 MINUTOS Y PAGO */}
            {bookingStep === 2 && (
              <div className="space-y-6">
                {isLockExpired ? (
                  <div className="p-6 rounded-2xl bg-red-500/10 border border-red-400/25 text-center space-y-3">
                    <Timer className="w-10 h-10 text-red-400 mx-auto" />
                    <h4 className="font-bold text-red-100 text-base">
                      El bloqueo de 10 minutos ha expirado
                    </h4>
                    <p className="text-xs text-red-100/70 leading-relaxed">
                      Para garantizar un aforo justo para todos los clientes, el cupo temporal se ha liberado. Por favor selecciona nuevamente tu horario.
                    </p>
                    <button
                      onClick={() => {
                        setBookingStep(1);
                        setSelectedSlot(null);
                        setIsLockExpired(false);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] text-white text-xs font-bold shadow-xs hover:bg-[#8f2547] cursor-pointer"
                    >
                      Volver a seleccionar horario
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Contador regresivo de bloqueo temporal */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          <span>Bloqueo temporal activo:</span>
                        </span>
                        <p className="text-xs text-amber-100/75">
                          Tu cupo está reservado exclusivamente para ti.
                        </p>
                      </div>
                      <div className="text-2xl font-black tabular-nums tracking-wide text-[#e3bd74] bg-black/40 px-3 py-1 rounded-xl border border-amber-400/25 shadow-2xs">
                        {formatLockTimer(lockSecondsRemaining)}
                      </div>
                    </div>

                    {/* Resumen de reserva */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-white/55">
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
                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline font-black text-base text-white">
                        <span>Monto total:</span>
                        <span className="text-xl text-[#e3bd74]">{formattedTotalPrice} COP</span>
                      </div>
                    </div>

                    {/* Proveedor de Pago Stripe */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-white block">
                        Pasarela de pago segura:
                      </span>
                      <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-300" />
                          <span className="font-black text-indigo-300 tracking-tight text-sm">stripe</span>
                          <span className="text-xs text-white/50 font-medium">Tarjeta débito / crédito (COP)</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Cifrado SSL</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setBookingStep(3);
                        }}
                        className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#8f2547] text-white font-black text-sm shadow-[0_10px_28px_rgba(122,31,61,0.4)] transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Pagar {formattedTotalPrice} COP con Stripe</span>
                        <span>→</span>
                      </button>

                      <button
                        onClick={() => setBookingStep(1)}
                        className="w-full py-2 text-xs font-semibold text-white/45 hover:text-white transition-colors cursor-pointer"
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
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-white uppercase tracking-tight">
                    ¡Reserva Confirmada!
                  </h4>
                  <p className="text-xs sm:text-sm text-white/55">
                    Hemos generado {ticketsCount} código(s) QR individual(es) para tu acceso.
                  </p>
                </div>

                {/* Tarjetas de códigos QR individuales */}
                <div className="space-y-3 pt-2">
                  {Array.from({ length: ticketsCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center gap-4 text-left"
                    >
                      <div className="w-16 h-16 rounded-xl bg-white border border-white/10 p-1 flex items-center justify-center shrink-0">
                        {/* Intencionalmente <img>: URL externa + QR (no optimizar ni recomprimir). */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=OMEGA-${service.id}-${selectedDate}-${idx + 1}`}
                          alt="Código QR de Entrada"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#e3bd74]">
                          Entrada {idx + 1} de {ticketsCount}
                        </span>
                        <p className="text-xs font-extrabold text-white truncate">
                          {service.name}
                        </p>
                        <p className="text-[11px] text-white/55">
                          {selectedDate} | {selectedSlot}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                        Válido
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-white/45">
                  Los códigos también fueron enviados a tu correo electrónico. Puedes consultarlos en cualquier momento en <strong>Mis reservas</strong>.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/mis-reservas"
                    className="flex-1 py-3 rounded-xl bg-[#7A1F3D] text-white font-bold text-xs hover:bg-[#8f2547] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Ver mis reservas</span>
                  </Link>
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedSlot(null);
                    }}
                    className="flex-1 py-3 rounded-xl border border-white/15 text-xs font-bold text-white hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    Hacer otra reserva
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
