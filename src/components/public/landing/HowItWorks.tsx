import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'Elige tu instalación',
    desc: 'Explora canchas, piscinas, gimnasio o zona húmeda.',
  },
  {
    n: '02',
    title: 'Selecciona fecha y hora',
    desc: 'Disponibilidad en tiempo real, de 08:00 a 17:00 por franjas de 1 hora.',
  },
  {
    n: '03',
    title: 'Reserva y paga en línea',
    desc: 'Tu cupo se bloquea por 10 minutos mientras pagas de forma segura.',
  },
  {
    n: '04',
    title: 'Recibe tus códigos QR',
    desc: 'Un QR único por entrada, listo para ingresar sin filas.',
  },
];

export default function HowItWorks() {
  return (
    <section id="reservas" className="scroll-mt-20 border-t border-[#e7dfdd] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b98a3c]">
              <span>Reservas</span>
              <span className="inline-block h-px w-14 bg-[#b98a3c]/60" />
            </p>
            <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-[#161214] sm:text-4xl">
              Reserva en 4 pasos
            </h2>
            <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-[#5c565a]">
              Rápido, transparente y 100% digital. Tu ingreso al complejo es con código QR.
            </p>
          </div>
          <Link
            href="/servicios"
            className="group inline-flex w-fit items-center gap-2.5 rounded-[4px] bg-[#7a1f3d] px-7 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#631730]"
          >
            <span>Reservar ahora</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <ol className="mt-10 grid grid-cols-1 gap-0 border-t border-[#e7dfdd] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="omega-reveal border-b border-[#e7dfdd] py-8 pr-8 sm:border-r sm:pl-8 sm:first:pl-0 lg:border-b-0"
            >
              <span className="text-[13px] font-bold tracking-[0.2em] text-[#7a1f3d]">{s.n}</span>
              <h3 className="mt-3 text-[16px] font-extrabold uppercase tracking-wide text-[#161214]">
                {s.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#5c565a]">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
