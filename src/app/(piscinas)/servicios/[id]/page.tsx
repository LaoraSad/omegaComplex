'use client';

import { useState, useEffect, use, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockServices } from '@/lib/piscinas/mock/services';
import { getAvailability, createReservation, type AvailabilitySlot } from '@/lib/api/reservations';
import PanoramaClient from '@/components/piscinas/PanoramaClient';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  Check,
  Compass,
  ShieldCheck,
  CreditCard,
  Maximize2,
  XCircle,
  Loader2,
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

  // Fecha seleccionada (por defecto hoy en zona horaria Colombia)
  const todayStr = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }, []);

  const maxAllowedDate = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const d = new Date(Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day)));
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }, []);

  // Fecha seleccionada (por defecto hoy en zona horaria Colombia)
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Estados de disponibilidad
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  // Track selected time range: { start: "08:00", end: "11:00" } or null
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);

  // Cantidad de entradas / acompañantes
  const [ticketsCount, setTicketsCount] = useState<number>(1);

  // Estado del flujo de reserva (1: Config, 2: Pago, 3: Confirmado con QRs)
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Cargar disponibilidad al cambiar fecha o servicio
  useEffect(() => {
    let isMounted = true;
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;
      setLoadingAvailability(true);
      getAvailability(service.id, selectedDate).then((res) => {
        if (!isMounted) return;
        setIsMaintenance(res.isMaintenanceDay);
        setAvailabilitySlots(res.slots);
        setLoadingAvailability(false);
      }).catch(() => {
        if (!isMounted) return;
        setIsMaintenance(false);
        setAvailabilitySlots([]);
        setLoadingAvailability(false);
      });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [service.id, selectedDate]);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(service.pricePerHour);
  }, [service.pricePerHour]);

  const totalPrice = useMemo(() => {
    if (!selectedRange) return service.pricePerHour * ticketsCount;
    const startHour = parseInt(selectedRange.start.split(':')[0], 10);
    const endHour = parseInt(selectedRange.end.split(':')[0], 10);
    const hours = endHour - startHour;
    return service.pricePerHour * hours * ticketsCount;
  }, [service.pricePerHour, ticketsCount, selectedRange]);

  const formattedTotalPrice = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(totalPrice);
  }, [totalPrice]);

  const handlePayment = useCallback(async () => {
    if (paymentLoading || !selectedRange) return;
    
    setPaymentLoading(true);
    setPaymentError(null);
    
    try {
      // Create dates with explicit Colombia timezone offset (-05:00)
      const startsAt = `${selectedDate}T${selectedRange.start}:00-05:00`;
      const endsAt = `${selectedDate}T${selectedRange.end}:00-05:00`;
      
      const result = await createReservation({
        serviceId: service.id,
        startsAt,
        endsAt,
        quantity: ticketsCount,
        channel: 'online',
      });
      
      if (result.stripeCheckoutUrl) {
        window.location.href = result.stripeCheckoutUrl;
      } else {
        setPaymentError("No se pudo crear la sesión de pago. Intenta nuevamente.");
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string; status?: number };
      if (error.status === 401) {
        setPaymentError("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
      } else if (error.code === "INVALID_RESERVATION_STATUS") {
        setPaymentError("Esta reserva ya no está disponible.");
      } else {
        setPaymentError(error.message || "Error al procesar el pago. Intenta nuevamente.");
      }
    } finally {
      setPaymentLoading(false);
    }
  }, [service.id, selectedDate, selectedRange, ticketsCount, paymentLoading]);

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
                  {service.tour360Id && (
                    <Link
                      href={`/tour/${service.tour360Id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1F3D] hover:text-[#5a162d] bg-[#7A1F3D]/5 hover:bg-[#7A1F3D]/10 px-2.5 py-1 rounded-lg transition-colors border border-[#7A1F3D]/15"
                      title="Abrir recorrido interactivo dedicado"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Tour dedicado</span>
                    </Link>
                  )}
                </div>
              </div>
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-black shadow-inner border border-[#E5E7EB]">
                <PanoramaClient src={service.panoramaUrl} caption={service.name} />
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
                      const newDate = e.target.value;
                      const dateObj = new Date(`${newDate}T00:00:00`);
                      const dayOfWeek = dateObj.getDay();
                      
                      if (dayOfWeek === 1) {
                        // Lunes = mantenimiento
                        setDateError('No disponible (mantenimiento)');
                        setSelectedRange(null);
                        setAvailabilitySlots([]);
                        return;
                      }
                      
                      setDateError(null);
                      setSelectedRange(null);
                      setLoadingAvailability(true);
                      setSelectedDate(newDate);
                    }}
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#7A1F3D]"
                  />
                  {dateError && (
                    <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{dateError}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-[#6B7280] mt-1.5">
                    * El complejo opera de 08:00 a 17:00. Lunes cerrado por mantenimiento.
                  </p>
                </div>

                {isMaintenance && !dateError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Complejo cerrado por mantenimiento</span>
                    </p>
                    <p className="text-xs">
                      Los lunes no se prestan servicios por jornada de mantenimiento general. Por favor selecciona otra fecha.
                    </p>
                  </div>
                )}

                {availabilitySlots.length > 0 && (
                  /* Selector de Franjas Horarias */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#7A1F3D]" />
                        <span>
                          2. Horario disponible:
                          {availabilitySlots.length > 0 && (
                            <>
                              <span className="text-[#7A1F3D] ml-1">
                                ({new Date(availabilitySlots[0].startsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} - {new Date(availabilitySlots[availabilitySlots.length - 1].endsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            </>
                          )}
                        </span>
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
                    </div>

                    {/* Grid de franjas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availabilitySlots.map((slot) => {
                        const startTime = new Date(slot.startsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(slot.endsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                        const timeSlot = `${startTime} - ${endTime}`;
                        const isAvailable = slot.availableCapacity > 0;
                        const isInRange = selectedRange && startTime >= selectedRange.start && endTime <= selectedRange.end;
                        const isRangeStart = selectedRange && startTime === selectedRange.start;
                        const isRangeEnd = selectedRange && endTime === selectedRange.end;

                        return (
                          <button
                            key={slot.slotId}
                            disabled={!isAvailable}
                            onClick={() => {
                              if (!isAvailable) return;
                              if (!selectedRange) {
                                // First selection - start a new range
                                setSelectedRange({ start: startTime, end: endTime });
                              } else if (startTime === selectedRange.start && endTime === selectedRange.end) {
                                // Clicking the only selected slot - clear
                                setSelectedRange(null);
                              } else if (startTime < selectedRange.start) {
                                // Extend range backwards
                                setSelectedRange({ start: startTime, end: selectedRange.end });
                              } else if (endTime > selectedRange.end) {
                                // Extend range forwards
                                setSelectedRange({ start: selectedRange.start, end: endTime });
                              } else {
                                // Clicking inside range - shrink to this slot
                                setSelectedRange({ start: startTime, end: endTime });
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                              isInRange
                                ? isRangeStart && isRangeEnd
                                  ? 'bg-[#7A1F3D] text-white border-[#7A1F3D] shadow-xs'
                                  : isRangeStart
                                  ? 'bg-[#7A1F3D] text-white border-[#7A1F3D] shadow-xs rounded-r-none'
                                  : isRangeEnd
                                  ? 'bg-[#7A1F3D] text-white border-[#7A1F3D] shadow-xs rounded-l-none'
                                  : 'bg-[#7A1F3D]/80 text-white border-[#7A1F3D] shadow-xs'
                                : isAvailable
                                ? 'bg-[#F5F5F5] hover:bg-white border-[#E5E7EB] text-[#1F1F1F] cursor-pointer'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <p className="font-bold text-xs">{timeSlot}</p>
                            <span className="text-[10px] font-semibold block mt-0.5 opacity-90">
                              {isAvailable
                                ? `${slot.availableCapacity} cupos libres`
                                : 'Agotado'}
                            </span>
                            {isInRange && !isRangeStart && (
                              <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cantidad de entradas / acompañantes */}
                {selectedRange && !isMaintenance && (
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
                        <span className="font-semibold text-[#1F1F1F]">
                          {selectedDate} ({selectedRange.start} - {selectedRange.end})
                        </span>
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

                    {/* Botón para iniciar pago */}
                    <button
                      onClick={() => {
                        setBookingStep(2);
                      }}
                      className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-extrabold text-sm shadow-md transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Continuar a Pago →</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: BLOQUEO TEMPORAL DE 10 MINUTOS Y PAGO */}
            {bookingStep === 2 && selectedRange && (
              <div className="space-y-6">
                {/* Resumen de reserva */}
                <div className="p-5 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2.5 text-xs text-[#6B7280]">
                  <div className="flex justify-between">
                    <span>Servicio:</span>
                    <span className="font-bold text-[#1F1F1F]">{service.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horario:</span>
                    <span className="font-bold text-[#1F1F1F]">
                      {selectedDate} / {selectedRange.start} - {selectedRange.end} ({parseInt(selectedRange.end.split(':')[0], 10) - parseInt(selectedRange.start.split(':')[0], 10)}h)
                    </span>
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

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-black text-sm shadow-md transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <span>Pagar {formattedTotalPrice} COP con Stripe</span>
                        <span>→</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setPaymentError(null);
                    }}
                    disabled={paymentLoading}
                    className="w-full py-2 text-xs font-semibold text-[#6B7280] hover:text-[#1F1F1F] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar y cambiar franja
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
