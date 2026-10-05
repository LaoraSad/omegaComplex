import { Clock, QrCode, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ComplexInfo() {
  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
            Reglamento & Horarios
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
            Información Clave del Complejo
          </h2>
          <p className="text-sm sm:text-base text-[#6B7280]">
            Conoce los horarios oficiales, tiempos de acceso y normativas para disfrutar de tu visita sin contratiempos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Horarios y Mantenimiento */}
          <div className="p-7 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#7A1F3D]" />
            </div>
            <h3 className="font-extrabold text-xl text-[#1F1F1F]">
              Horarios de Operación
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm text-[#6B7280]">
              <p className="flex justify-between border-b border-[#E5E7EB] pb-1.5">
                <span>Martes a Domingo:</span>
                <span className="font-bold text-[#1F1F1F]">08:00 – 17:00</span>
              </p>
              <p className="flex justify-between border-b border-[#E5E7EB] pb-1.5">
                <span>Lunes:</span>
                <span className="font-bold text-[#7A1F3D]">Cerrado (Mantenimiento)</span>
              </p>
              <p className="text-xs text-[#1F1F1F] font-medium pt-1">
                * Si el lunes es día festivo, la jornada de mantenimiento preventivo se traslada automáticamente al día martes.
              </p>
            </div>
          </div>

          {/* Card 2: Reglas de Ingreso y Control de Acceso */}
          <div className="p-7 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
              <QrCode className="w-6 h-6 text-[#7A1F3D]" />
            </div>
            <h3 className="font-extrabold text-xl text-[#1F1F1F]">
              Control de Acceso QR
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#6B7280]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span><strong className="text-[#1F1F1F]">Horario estricto:</strong> Se permite el ingreso dentro del rango reservado (ej. 14:00 - 15:00).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span><strong className="text-[#1F1F1F]">Sin tolerancia:</strong> No se permite el acceso después de finalizar la franja horaria.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span><strong className="text-[#1F1F1F]">Llegada tardía:</strong> Puedes ingresar, pero solo disfrutarás del tiempo restante de tu reserva.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span><strong className="text-[#1F1F1F]">QR personal:</strong> Cada entrada emitida tiene un código QR único de un solo uso.</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Normas Específicas */}
          <div className="p-7 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#7A1F3D]/10 text-[#7A1F3D] flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-[#7A1F3D]" />
            </div>
            <h3 className="font-extrabold text-xl text-[#1F1F1F]">
              Normas Obligatorias
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-[#6B7280]">
              <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] space-y-0.5">
                <span className="font-bold text-[#7A1F3D] text-xs uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#7A1F3D]" />
                  <span>Piscinas:</span>
                </span>
                <p>Uso obligatorio de licras y gorro de natación para ingresar al agua.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] space-y-0.5">
                <span className="font-bold text-[#7A1F3D] text-xs uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#7A1F3D]" />
                  <span>Gimnasio:</span>
                </span>
                <p>No se permite menores de 12 años. Prohibido ingresar mojado. Obligatorio calzado deportivo.</p>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                * Reservas habilitadas con hasta 3 meses de anticipación máxima.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
