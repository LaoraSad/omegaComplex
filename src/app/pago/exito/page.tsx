'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getReservationById, type Reservation } from '@/lib/api/reservations';
import { CheckCircle2, Loader2, QrCode, Clock, Calendar, Users, ArrowRight, XCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    if (!reservationId) {
      setTimeout(() => {
        setError("ID de reserva no encontrado");
        setLoading(false);
      }, 0);
      return;
    }

    const fetchReservation = async () => {
      try {
        let attempts = 0;
        let data: Reservation | null = null;
        
        while (attempts < 10) {
          data = await getReservationById(reservationId);
          if (data.status === 'confirmed' && data.tickets.length > 0) {
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }
        
        if (data) {
          setReservation(data);
        } else {
          setError("No se pudo confirmar la reserva. Contacta soporte.");
        }
      } catch {
        setError("Error al cargar la reserva");
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#7A1F3D] animate-spin mx-auto" />
          <p className="text-[#6B7280]">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md mx-auto text-center space-y-4 bg-white p-8 rounded-2xl border border-[#E5E7EB]">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1F1F1F]">No se pudo verificar el pago</h2>
          <p className="text-[#6B7280]">{error || "La reserva no se encontró o aún está pendiente."}</p>
          <Link
            href="/mis-reservas"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7A1F3D] text-white text-xs font-bold hover:bg-[#631730]"
          >
            <span>Ver mis reservas</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-[#1F1F1F]">¡Pago Exitoso!</h1>
          <p className="text-[#6B7280]">Tu reserva ha sido confirmada y los códigos QR están listos.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#F5F5F5] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Referencia</span>
              <span className="font-bold text-[#1F1F1F]">{reservation.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7A1F3D]" />
                <span>Fecha</span>
              </span>
              <span className="font-bold text-[#1F1F1F]">{reservation.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7A1F3D]" />
                <span>Horario</span>
              </span>
              <span className="font-bold text-[#1F1F1F]">{reservation.timeSlot}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7A1F3D]" />
                <span>Entradas</span>
              </span>
              <span className="font-bold text-[#1F1F1F]">{reservation.ticketsCount} persona(s)</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-[#E5E7EB]">
              <span className="text-[#6B7280]">Servicio</span>
              <span className="font-bold text-[#1F1F1F]">{reservation.serviceName}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB]">
            <h3 className="font-bold text-[#1F1F1F] mb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#7A1F3D]" />
              <span>Códigos QR de Acceso</span>
            </h3>
            <p className="text-xs text-[#6B7280] mb-3">Presenta estos códigos al ingresar. Cada QR es de un solo uso.</p>
            
            <div className="space-y-3">
              {reservation.tickets.map((ticket, idx) => (
                <div key={ticket.ticketId} className="p-4 rounded-xl bg-[#F5F5F5] border border-[#E5E7EB] flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-white border border-[#E5E7EB] p-1 flex items-center justify-center shrink-0">
                    <img
                      src={ticket.qrCodeUrl}
                      alt={`QR Entrada ${ticket.ticketNumber}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#7A1F3D]">Entrada {ticket.ticketNumber} de {reservation.tickets.length}</p>
                    <p className="font-mono text-xs text-[#1F1F1F] truncate">{ticket.qrCodeValue}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Válido</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/mis-reservas"
            className="flex-1 py-3 rounded-xl bg-[#7A1F3D] text-white font-bold text-sm hover:bg-[#631730] transition-colors flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            <span>Ver todas mis reservas</span>
          </Link>
          <Link
            href="/servicios"
            className="flex-1 py-3 rounded-xl bg-white border border-[#E5E7EB] text-sm font-bold text-[#1F1F1F] hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2"
          >
            <span>Seguir explorando</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#7A1F3D] animate-spin mx-auto" />
          <p className="text-[#6B7280]">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}