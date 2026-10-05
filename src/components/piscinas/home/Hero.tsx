import Link from 'next/link';
import { ArrowRight, Clock, Layers, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F5F5F5] to-white border-b border-[#E5E7EB] py-16 md:py-24">
      {/* Detalle visual sutil de fondo */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 rounded-full bg-[#7A1F3D]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 rounded-full bg-[#C8A96B]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Lado izquierdo: Textos y CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Badge de identidad */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#7A1F3D]">
                Complejo Deportivo y Recreativo
              </span>
            </div>

            {/* Título principal */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1F1F1F] tracking-tight leading-[1.1]">
              Vive la experiencia <br />
              <span className="text-[#7A1F3D] inline-block mt-1">Omega Complex</span>
            </h1>

            {/* Texto secundario */}
            <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Accede a modernas canchas de fútbol y polideportivos, piscinas recreativas y de olas, gimnasio equipado y zona húmeda. Consulta disponibilidad en tiempo real, reserva por hora y obtén tus códigos QR de acceso inmediato.
            </p>

            {/* Botones de acción (CTAs) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/servicios"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-bold text-base shadow-sm transition-all active:scale-95 text-center flex items-center justify-center gap-2.5 group"
              >
                <span>Reservar ahora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#servicios"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-[#F5F5F5] text-[#1F1F1F] font-semibold text-base border border-[#E5E7EB] hover:border-[#7A1F3D]/30 transition-all text-center"
              >
                Ver servicios
              </Link>
            </div>

            {/* Métricas rápidas y datos de confianza */}
            <div className="pt-8 border-t border-[#E5E7EB] grid grid-cols-3 gap-4 text-center lg:text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#7A1F3D]">
                  <Clock className="w-4 h-4 text-[#7A1F3D]" />
                  <p className="text-xl sm:text-2xl font-black text-[#1F1F1F]">08:00 - 17:00</p>
                </div>
                <p className="text-xs text-[#6B7280] font-medium">Horario oficial</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#7A1F3D]">
                  <Layers className="w-4 h-4 text-[#7A1F3D]" />
                  <p className="text-xl sm:text-2xl font-black text-[#7A1F3D]">4 Áreas</p>
                </div>
                <p className="text-xs text-[#6B7280] font-medium">Piscinas, Canchas, Gym, Spa</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#C8A96B]">
                  <QrCode className="w-4 h-4 text-[#C8A96B]" />
                  <p className="text-xl sm:text-2xl font-black text-[#C8A96B]">100% Digital</p>
                </div>
                <p className="text-xs text-[#6B7280] font-medium">Ingreso con QR único</p>
              </div>
            </div>
          </div>

          {/* Lado derecho: Tarjeta de presentación visual */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl bg-white p-4 shadow-xl border border-[#E5E7EB]">
              {/* Contenedor preparado para recibir la imagen oficial */}
              <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#7A1F3D] to-[#1F1F1F] flex flex-col justify-between p-6 text-white">
                {/* Badge de capacidad */}
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C8A96B]" />
                    <span>Instalaciones de primer nivel</span>
                  </span>
                  <span className="w-8 h-8 rounded-full bg-[#C8A96B] text-[#1F1F1F] font-black text-xs flex items-center justify-center shadow-xs">
                    Ω
                  </span>
                </div>

                {/* Info sobreimpreso */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white leading-tight">
                    Canchas, Piscinas y Espacios de Bienestar
                  </h3>
                  <p className="text-white/80 text-xs leading-relaxed">
                    Reserva con hasta 3 meses de anticipación. Control de aforo garantizado para una experiencia segura y cómoda.
                  </p>
                </div>
              </div>

              {/* Pequeño preview de estado del complejo */}
              <div className="mt-4 p-3.5 bg-[#F5F5F5] rounded-xl flex items-center justify-between text-xs text-[#1F1F1F] font-medium border border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Disponible para reservas hoy</span>
                </div>
                <span className="text-[#7A1F3D] font-bold">Cobro por hora</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
