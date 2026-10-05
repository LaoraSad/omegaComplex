import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-tr from-[#7A1F3D] to-[#631730] text-white relative overflow-hidden">
      {/* Círculos de luz sutiles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#C8A96B]/15 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#C8A96B] font-bold text-xs uppercase tracking-wider border border-white/15">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Reserva en minutos</span>
        </span>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          ¿Listo para disfrutar de nuestras instalaciones?
        </h2>

        <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Consulta la disponibilidad en tiempo real, asegura tu cupo por hora y recibe tus códigos QR de acceso en tu correo electrónico.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/servicios"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-white text-[#7A1F3D] hover:bg-[#F5F5F5] font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>Explorar catálogo y reservar</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/informacion"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-transparent border border-white/30 hover:bg-white/10 text-white font-semibold text-base transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ver normas de ingreso</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
