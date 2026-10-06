import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AmbientBubbles from '@/components/AmbientBubbles';

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#14090f] text-white">
      {/* Filete dorado sutil + resplandor vinotinto de fondo */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d9b56c]/70 to-transparent" />
      <AmbientBubbles variant="gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[#7a1f3d]/25 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full border border-white/10"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="max-w-[640px]">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
            <span>Reserva en minutos</span>
            <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
          </p>
          <h2 className="mt-4 text-[28px] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-4xl">
            ¿Listo para vivir la experiencia Omega?
          </h2>
          <p className="mt-4 max-w-[520px] text-[14px] leading-relaxed text-white/60">
            Consulta la disponibilidad en tiempo real, asegura tu cupo por hora y
            recibe tus códigos QR en tu correo.
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
          <Link
            href="/servicios"
            className="group inline-flex items-center justify-center gap-2.5 rounded-[4px] bg-[#7a1f3d] px-8 py-4 text-[12px] font-bold uppercase tracking-[0.16em] text-white opacity-100 transition-colors hover:bg-[#8f2547] hover:text-white"
          >
            <span>Explorar y reservar</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/informacion"
            className="inline-flex items-center justify-center rounded-[4px] border border-white/25 px-8 py-4 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
          >
            Ver normas de ingreso
          </Link>
        </div>
      </div>
    </section>
  );
}
