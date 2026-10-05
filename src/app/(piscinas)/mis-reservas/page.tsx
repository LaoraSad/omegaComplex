'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Reservation, ReservationStatus } from '@/types/piscinas/omega';
import { getUserReservations } from '@/lib/piscinas/api/reservations';
import {
  QrCode,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  History,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedTab, setSelectedTab] = useState<'futuras' | 'historial'>('futuras');
  const [selectedQRReservation, setSelectedQRReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    getUserReservations().then(setReservations);
  }, []);

  const now = new Date();

  const futureReservations = reservations.filter((r) => {
    const resDate = new Date(r.date + 'T23:59:59');
    return resDate >= now && r.status !== 'used' && r.status !== 'expired';
  });

  const historyReservations = reservations.filter((r) => {
    const resDate = new Date(r.date + 'T23:59:59');
    return resDate < now || r.status === 'used' || r.status === 'expired';
  });

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmada</span>
          </span>
        );
      case 'pending_payment':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pendiente de pago</span>
          </span>
        );
      case 'payment_processing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Pago en proceso
          </span>
        );
      case 'payment_rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Pago rechazado</span>
          </span>
        );
      case 'used':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            Utilizada
          </span>
        );
      case 'expired':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            Expirada
          </span>
        );
      default:
        return null;
    }
  };

  const displayedList = selectedTab === 'futuras' ? futureReservations : historyReservations;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Encabezado */}
      <div className="mb-10 text-center sm:text-left space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
          Panel del Cliente
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
          Mis Reservas y Pases QR
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] max-w-2xl">
          Consulta tus reservas vigentes, descarga o presenta tus códigos QR para el acceso y revisa tu historial de visitas.
        </p>
      </div>

      {/* Pestañas: Reservas futuras vs Historial */}
      <div className="flex border-b border-[#E5E7EB] mb-8 gap-6">
        <button
          onClick={() => setSelectedTab('futuras')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            selectedTab === 'futuras'
              ? 'border-[#7A1F3D] text-[#7A1F3D]'
              : 'border-transparent text-[#6B7280] hover:text-[#1F1F1F]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Reservas futuras ({futureReservations.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('historial')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            selectedTab === 'historial'
              ? 'border-[#7A1F3D] text-[#7A1F3D]'
              : 'border-transparent text-[#6B7280] hover:text-[#1F1F1F]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial anterior ({historyReservations.length})</span>
        </button>
      </div>

      {/* Listado de reservas */}
      {displayedList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Ref: {res.id}
                  </span>
                  {getStatusBadge(res.status)}
                </div>

                <div>
                  <h3 className="text-lg font-black text-[#1F1F1F]">
                    {res.serviceName}
                  </h3>
                  <span className="text-xs text-[#7A1F3D] font-bold">
                    {res.categoryName}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F5F5] space-y-2 text-xs text-[#1F1F1F]">
                  <p className="flex justify-between items-center">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#7A1F3D]" />
                      <span>Fecha:</span>
                    </span>
                    <span className="font-bold">{res.date}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7A1F3D]" />
                      <span>Horario:</span>
                    </span>
                    <span className="font-bold">{res.timeSlot}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#7A1F3D]" />
                      <span>Entradas:</span>
                    </span>
                    <span className="font-bold">{res.ticketsCount} personas</span>
                  </p>
                </div>
              </div>

              {/* Botón para ver QRs */}
              {res.status === 'confirmed' ? (
                <button
                  onClick={() => setSelectedQRReservation(res)}
                  className="w-full py-3 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver {res.tickets.length} Código(s) QR</span>
                </button>
              ) : (
                <div className="text-center py-2 text-xs text-[#6B7280] font-medium bg-[#F5F5F5] rounded-xl">
                  {res.status === 'used' ? 'Acceso completado' : 'Sin QR disponible'}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E7EB] p-8 max-w-md mx-auto space-y-4">
          <Calendar className="w-12 h-12 text-[#6B7280] mx-auto opacity-50" />
          <h3 className="font-bold text-lg text-[#1F1F1F]">
            No tienes reservas {selectedTab === 'futuras' ? 'programadas' : 'en tu historial'}
          </h3>
          <p className="text-xs text-[#6B7280]">
            Puedes explorar las canchas, piscinas y zonas de bienestar para programar tu próxima visita.
          </p>
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7A1F3D] text-white text-xs font-bold hover:bg-[#631730] cursor-pointer"
          >
            <span>Explorar servicios disponibles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Modal / Visor de Códigos QR individuales */}
      {selectedQRReservation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#E5E7EB] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8A96B] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Pases de Acceso Oficial</span>
                </span>
                <h3 className="text-xl font-black text-[#1F1F1F]">
                  {selectedQRReservation.serviceName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQRReservation(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] text-[#1F1F1F] font-bold text-sm flex items-center justify-center hover:bg-[#E5E7EB] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280]">
              Presenta estos códigos en tu teléfono al momento de ingresar. El personal del complejo escaneará cada QR para autorizar el ingreso.
            </p>

            <div className="space-y-4">
              {selectedQRReservation.tickets.map((tkt, idx) => (
                <div
                  key={tkt.ticketId}
                  className="p-5 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
                >
                  <div className="w-28 h-28 rounded-xl bg-white border border-[#E5E7EB] p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tkt.qrCodeUrl}
                      alt={`QR Entrada ${tkt.ticketNumber}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#7A1F3D]/10 text-[#7A1F3D] inline-block">
                      Entrada {idx + 1} de {selectedQRReservation.tickets.length}
                    </span>
                    <p className="font-mono text-xs text-[#1F1F1F] font-bold pt-1">
                      {tkt.qrCodeValue}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Horario: {selectedQRReservation.timeSlot}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center sm:justify-start gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Válido para 1 solo ingreso</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedQRReservation(null)}
                className="w-full py-3 bg-[#1F1F1F] text-white text-xs font-bold rounded-xl hover:bg-black cursor-pointer"
              >
                Cerrar pases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
