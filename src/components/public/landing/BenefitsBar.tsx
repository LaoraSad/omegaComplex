import { Trophy, Users, CalendarCheck, HeartPulse } from 'lucide-react';
import AmbientBubbles from '@/components/public/landing/AmbientBubbles';

const ITEMS = [
  {
    icon: Trophy,
    title: 'Instalaciones de primer nivel',
    desc: 'Espacios diseñados para tu rendimiento.',
  },
  {
    icon: Users,
    title: 'Comunidad deportiva',
    desc: 'Personas que comparten tu misma pasión.',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas en línea',
    desc: 'Rápido, seguro y desde donde estés.',
  },
  {
    icon: HeartPulse,
    title: 'Bienestar integral',
    desc: 'Deporte, salud y estilo de vida.',
  },
];

export default function BenefitsBar() {
  return (
    <section className="omega-dark-section-2 relative overflow-hidden border-white/10 text-white" aria-label="Beneficios de Omega Complex">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="gold" />
      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:px-12">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex items-start gap-4 py-7 pr-6 sm:px-6 lg:first:pl-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d9b56c]/35 bg-white/[0.04]">
              <it.icon className="h-5 w-5 text-[#e3bd74]" strokeWidth={1.6} />
            </span>
            <div>
              <h3 className="text-[12px] font-bold uppercase leading-snug tracking-[0.12em] text-white">
                {it.title}
              </h3>
              <p className="mt-1 text-[13px] leading-snug text-white/60">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
