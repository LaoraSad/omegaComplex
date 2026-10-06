import Link from 'next/link';
import {
  Clock,
  QrCode,
  Users,
  Hourglass,
  Ban,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function InfoPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
          Guía del Usuario
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
          Información del Complejo y Normas
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] max-w-xl mx-auto">
          Todo lo que necesitas saber antes de tu visita a Omega Complex: horarios, acceso con QR y reglamento por áreas.
        </p>
      </div>

      {/* Sección 1: Horarios y Mantenimiento */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#7A1F3D]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1F1F1F]">Horario General y Mantenimiento</h2>
            <p className="text-xs text-[#6B7280]">Operación continua por horas programadas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#1F1F1F]">
          <div className="p-5 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A1F3D]">
              Atención al público
            </span>
            <p className="text-2xl font-black">08:00 – 17:00</p>
            <p className="text-xs text-[#6B7280]">
              Abierto de Martes a Domingo. Todas las reservas se coordinan en franjas exactas de 1 hora.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A1F3D]">
              Jornada de Mantenimiento
            </span>
            <p className="text-2xl font-black text-[#7A1F3D]">Lunes Cerrado</p>
            <p className="text-xs text-[#6B7280]">
              El complejo permanece cerrado los lunes por mantenimiento técnico. Si el lunes coincide con día festivo, la jornada de mantenimiento se traslada al día martes.
            </p>
          </div>
        </div>
      </div>

      {/* Sección 2: Protocolo de Control de Acceso QR */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
            <QrCode className="w-5 h-5 text-[#7A1F3D]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1F1F1F]">Protocolo de Ingreso con Código QR</h2>
            <p className="text-xs text-[#6B7280]">Reglas oficiales de validación y control de acceso</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-[#1F1F1F]">
          <div className="p-4 rounded-xl bg-[#F5F5F5] flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#7A1F3D] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Ventana de ingreso autorizada:</strong>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
                El cliente puede ingresar dentro de su horario reservado (ejemplo: si reservaste de 14:00 a 15:00, puedes acceder a las 14:00, 14:15 o 14:30).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F5F5] flex items-start gap-3">
            <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Sin período de tolerancia posterior:</strong>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
                No se permite el acceso después de que haya finalizado la franja horaria reservada.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F5F5] flex items-start gap-3">
            <Hourglass className="w-5 h-5 text-[#C8A96B] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Llegadas tardías:</strong>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
                Si llegas tarde dentro de tu horario, podrás ingresar, pero únicamente disfrutarás del tiempo restante de tu reserva. No se extienden horarios.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F5F5] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Un código QR por entrada:</strong>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
                Cada entrada genera un código QR individual de un solo uso. Si reservas para acompañantes, recibirás la cantidad exacta de códigos QR requeridos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Capacidades Oficiales por Área */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
            <Users className="w-5 h-5 text-[#7A1F3D]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1F1F1F]">Capacidades Oficiales de Aforo</h2>
            <p className="text-xs text-[#6B7280]">Límites máximos por sesión para garantizar comodidad y seguridad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="font-extrabold text-sm text-[#1F1F1F] block">🏊 Piscinas</span>
            <ul className="space-y-1 text-[#6B7280]">
              <li>Piscina infantil: <strong>100</strong></li>
              <li>Piscina de olas: <strong>100</strong></li>
              <li>Toboganes Piscina 1: <strong>30</strong></li>
              <li>Toboganes Piscina 2: <strong>20</strong></li>
              <li>Toboganes Piscina 3: <strong>20</strong></li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="font-extrabold text-sm text-[#1F1F1F] block">⚽ Canchas</span>
            <ul className="space-y-1 text-[#6B7280]">
              <li>Microfútbol (4 canchas): <strong>14 c/u</strong></li>
              <li>Fútbol 11: <strong>22</strong></li>
              <li>Polideportivos (2 canchas): <strong>12 c/u</strong></li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="font-extrabold text-sm text-[#1F1F1F] block">🏋️ Gimnasio</span>
            <ul className="space-y-1 text-[#6B7280]">
              <li>Sala principal: <strong>40</strong></li>
              <li className="pt-2 text-[11px] text-[#7A1F3D] font-bold">Mayores de 12 años</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-2">
            <span className="font-extrabold text-sm text-[#1F1F1F] block">🧖 Zona Húmeda</span>
            <ul className="space-y-1 text-[#6B7280]">
              <li>Baño Turco: <strong>30</strong></li>
              <li>Sauna: <strong>30</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botón CTA */}
      <div className="text-center pt-4">
        <Link
          href="/servicios"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <span>Consultar disponibilidad y reservar</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
