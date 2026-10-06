'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockServices } from '@/lib/storefront/mock/services';
import { getAvailabilityForDate, TimeSlotAvailability } from '@/lib/storefront/api/availability';
import PanoramaModal from '@/components/tour/PanoramaModal';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Botón de retorno */}
      <div className="mb-6">
        <Link
          href="/servicios"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6B7280] hover:text-[#7A1F3D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo de servicios</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Columna Izquierda: Información del Servicio y Reglas (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Tarjeta principal con visor 360 interactivo integrado */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F5F5F5] text-[#1F1F1F] border border-[#E5E7EB]">
                {service.categoryName}
              </span>
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#7A1F3D] text-white flex items-center gap-1.5 shadow-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Capacidad oficial: {service.capacity} personas</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
              {service.name}
            </h1>

            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              {service.description}
            </p>

            {/* Visor 360 en el detalle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#7A1F3D]" />
                  <span>Vista Inmersiva 360° en Vivo:</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#6B7280] hidden sm:inline">Gira o arrastra con el cursor</span>
                </div>
              </div>
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-black shadow-inner border border-[#E5E7EB]">
                <PanoramaModal src={service.panoramaUrl} title={service.name} trigger={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                } />
              </div>
            </div>

            {/* Ficha técnica y reglas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E5E7EB]">
              <div className="p-4 rounded-xl bg-[#F5F5F5] space-y-1">
                <span className="text-[11px] uppercase font-bold text-[#6B7280] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#7A1F3D]" />
                  <span>Duración de la reserva</span>
                </span>
                <p className="font-extrabold text-[#1F1F1F]">
                  Franjas de 1 hora exacta
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F5F5F5] space-y-1">
                <span className="text-[11px] uppercase font-bold text-[#6B7280] flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#7A1F3D]" />
                  <span>Tarifa por hora</span>
                </span>
                <p className="font-extrabold text-[#7A1F3D]">
                  {formattedPrice} COP
                </p>
              </div>
            </div>

            {/* Reglas oficiales si aplican */}
            {service.rules && service.rules.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Normas obligatorias de ingreso:</span>
                </h4>
                <ul className="text-xs sm:text-sm text-amber-900/90 space-y-1.5 font-medium">
                  {service.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#7A1F3D] shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Flujo de Disponibilidad y Reserva (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
                  Paso a paso
                </span>
                <h3 className="text-xl font-extrabold text-[#1F1F1F]">
                  Reserva tu Franja
                </h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5F5F5] text-[#7A1F3D]">
                Cobro por hora
              </span>
            </div>

            {/* PASO 1: SELECCIÓN DE FECHA Y HORARIO */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                {/* Selector de Fecha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F1F1F] mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#7A1F3D]" />
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
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#7A1F3D]"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1.5">
                    * El complejo opera de 08:00 a 17:00. Lunes cerrado por mantenimiento.
                  </p>
                </div>

                {/* Alerta de día de mantenimiento */}
                {isMaintenance ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Complejo cerrado por mantenimiento</span>
                    </p>
                    <p className="text-xs">
                      Los lunes no se prestan servicios por jornada de mantenimiento general (si el lunes es festivo, se traslada al martes). Por favor selecciona otra fecha.
                    </p>
                  </div>
                ) : (
                  /* Selector de Franjas Horarias */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#7A1F3D]" />
                        <span>2. Horario disponible (08:00 - 17:00):</span>
                      </label>
                      <span className="text-[11px] text-[#6B7280]">
                        {loadingAvailability ? 'Verificando...' : 'En tiempo real'}
                      </span>
                    </div>

                    {/* Guía de estados */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-[#6B7280] pb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#E5E7EB]" /> Ocupado
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
                                ? 'bg-[#7A1F3D] text-white border-[#7A1F3D] shadow-xs'
                                : isAvailable
                                ? 'bg-[#F5F5F5] hover:bg-white border-[#E5E7EB] text-[#1F1F1F] cursor-pointer'
                                : isBlocked
                                ? 'bg-amber-50/50 border-amber-200 text-[#6B7280] cursor-not-allowed opacity-75'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
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
                  <div className="pt-4 border-t border-[#E5E7EB] space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#7A1F3D]" />
                          <span>3. Entradas requeridas:</span>
                        </label>
                        <span className="text-xs font-bold text-[#7A1F3D]">
                          1 QR por persona
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                          className="w-10 h-10 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E7EB] text-lg font-bold border border-[#E5E7EB] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-lg font-black text-[#1F1F1F] w-10 text-center">
                          {ticketsCount}
                        </span>
                        <button
                          onClick={() => setTicketsCount(Math.min(service.capacity, ticketsCount + 1))}
                          className="w-10 h-10 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E7EB] text-lg font-bold border border-[#E5E7EB] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        Cada entrada generará un código QR individual e intransferible.
                      </p>
                    </div>

                    {/* Resumen de cobro */}
                    <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>Servicio:</span>
                        <span className="font-semibold text-[#1F1F1F]">{service.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>Fecha y hora:</span>
                        <span className="font-semibold text-[#1F1F1F]">{selectedDate} ({selectedSlot})</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>Total entradas:</span>
                        <span className="font-semibold text-[#1F1F1F]">{ticketsCount} persona(s)</span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E7EB] flex justify-between items-baseline font-black text-base text-[#1F1F1F]">
                        <span>Total a pagar:</span>
                        <span className="text-xl text-[#7A1F3D]">{formattedTotalPrice} COP</span>
                      </div>
                    </div>

                    {/* Botón para iniciar bloqueo temporal y pago */}
                    <button
                      onClick={() => {
                        setBookingStep(2);
                        setLockSecondsRemaining(600);
                        setIsLockExpired(false);
                      }}
                      className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-extrabold text-sm shadow-md transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2"
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
                  <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                    <Timer className="w-10 h-10 text-red-600 mx-auto" />
                    <h4 className="font-bold text-red-900 text-base">
                      El bloqueo de 10 minutos ha expirado
                    </h4>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Para garantizar un aforo justo para todos los clientes, el cupo temporal se ha liberado. Por favor selecciona nuevamente tu horario.
                    </p>
                    <button
                      onClick={() => {
                        setBookingStep(1);
                        setSelectedSlot(null);
                        setIsLockExpired(false);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#7A1F3D] text-white text-xs font-bold shadow-xs hover:bg-[#631730] cursor-pointer"
                    >
                      Volver a seleccionar horario
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Contador regresivo de bloqueo temporal */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                          <span>Bloqueo temporal activo:</span>
                        </span>
                        <p className="text-xs text-amber-800">
                          Tu cupo está reservado exclusivamente para ti.
                        </p>
                      </div>
                      <div className="text-2xl font-black tabular-nums tracking-wide text-[#7A1F3D] bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-2xs">
                        {formatLockTimer(lockSecondsRemaining)}
                      </div>
                    </div>

                    {/* Resumen de reserva */}
                    <div className="p-5 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2.5 text-xs text-[#6B7280]">
                      <div className="flex justify-between">
                        <span>Servicio:</span>
                        <span className="font-bold text-[#1F1F1F]">{service.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horario:</span>
                        <span className="font-bold text-[#1F1F1F]">{selectedDate} / {selectedSlot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entradas individuales:</span>
                        <span className="font-bold text-[#1F1F1F]">{ticketsCount} QR</span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E7EB] flex justify-between items-baseline font-black text-base text-[#1F1F1F]">
                        <span>Monto total:</span>
                        <span className="text-xl text-[#7A1F3D]">{formattedTotalPrice} COP</span>
                      </div>
                    </div>

                    {/* Proveedor de Pago Stripe */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] block">
                        Pasarela de pago segura:
                      </span>
                      <div className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-700" />
                          <span className="font-black text-indigo-700 tracking-tight text-sm">stripe</span>
                          <span className="text-xs text-[#6B7280] font-medium">Tarjeta débito / crédito (COP)</span>
                        </div>
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Cifrado SSL</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setBookingStep(3);
                        }}
                        className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-black text-sm shadow-md transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Pagar {formattedTotalPrice} COP con Stripe</span>
                        <span>→</span>
                      </button>

                      <button
                        onClick={() => setBookingStep(1)}
                        className="w-full py-2 text-xs font-semibold text-[#6B7280] hover:text-[#1F1F1F] transition-colors cursor-pointer"
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
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-[#1F1F1F]">
                    ¡Reserva Confirmada!
                  </h4>
                  <p className="text-xs sm:text-sm text-[#6B7280]">
                    Hemos generado {ticketsCount} código(s) QR individual(es) para tu acceso.
                  </p>
                </div>

                {/* Tarjetas de códigos QR individuales */}
                <div className="space-y-3 pt-2">
                  {Array.from({ length: ticketsCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-4 text-left"
                    >
                      <div className="w-16 h-16 rounded-xl bg-white border border-[#E5E7EB] p-1 flex items-center justify-center shrink-0">
                        {/* Intencionalmente <img>: URL externa + QR (no optimizar ni recomprimir). */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=OMEGA-${service.id}-${selectedDate}-${idx + 1}`}
                          alt="Código QR de Entrada"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A1F3D]">
                          Entrada {idx + 1} de {ticketsCount}
                        </span>
                        <p className="text-xs font-extrabold text-[#1F1F1F] truncate">
                          {service.name}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {selectedDate} | {selectedSlot}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Válido
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-[#6B7280]">
                  Los códigos también fueron enviados a tu correo electrónico. Puedes consultarlos en cualquier momento en <strong>Mis reservas</strong>.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/mis-reservas"
                    className="flex-1 py-3 rounded-xl bg-[#7A1F3D] text-white font-bold text-xs hover:bg-[#631730] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Ver mis reservas</span>
                  </Link>
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedSlot(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#1F1F1F] hover:bg-[#F5F5F5] cursor-pointer"
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
  );
}
