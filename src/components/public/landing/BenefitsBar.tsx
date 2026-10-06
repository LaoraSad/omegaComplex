import { Trophy, Users, CalendarCheck, HeartPulse } from 'lucide-react';

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
    <section className="bg-[#5d1228] text-white" aria-label="Beneficios de Omega Complex">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:px-12">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex items-start gap-4 py-7 pr-6 sm:px-6 lg:first:pl-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d9b56c]/60">
              <it.icon className="h-5 w-5 text-[#e3bd74]" strokeWidth={1.6} />
            </span>
            <div>
              <h3 className="text-[12px] font-bold uppercase leading-snug tracking-[0.12em]">
                {it.title}
              </h3>
              <p className="mt-1 text-[13px] leading-snug text-white/70">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
