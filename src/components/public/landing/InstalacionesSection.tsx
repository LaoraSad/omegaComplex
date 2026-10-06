import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Users } from 'lucide-react';
import AmbientBubbles from '@/components/AmbientBubbles';
import type { Service } from '@/types/storefront/omega';

interface Props {
  services: Service[];
}

export default function InstalacionesSection({ services }: Props) {
  /* Reutiliza el mapeo instalación → imagen ya definido en el backend/mock. */
  const items = services.slice(0, 4);

  return (
    <section id="instalaciones" className="omega-dark-section relative scroll-mt-20 overflow-hidden py-16 sm:py-20">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="mixed" />
      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
              <span>Nuestras instalaciones</span>
              <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
            </p>
            <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[42px]">
              Todo lo que necesitas
              <br />
              en un solo lugar
            </h2>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <p className="max-w-[340px] text-right text-[13px] leading-relaxed text-white/60 max-lg:text-left">
              Instalaciones modernas, seguras y diseñadas para que vivas el
              deporte como debe ser.
            </p>
            <Link
              href="/servicios"
              className="group inline-flex items-center gap-2.5 rounded-[4px] border border-white/25 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
            >
              <span>Ver todas las instalaciones</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Galería editorial: la fotografía es protagonista */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((s) => (
            <article key={s.id} className="omega-card omega-card-dark group relative overflow-hidden rounded-[6px]">
              <Link href={`/servicios/${s.id}`} aria-label={`Reservar ${s.name}`} className="block">
                <div className="relative h-[320px] overflow-hidden sm:h-[340px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                  {/* overlay sutil inferior para legibilidad */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  {s.tour360Id && (
                    <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                      Vista 360°
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <div>
                      <h3 className="text-[15px] font-extrabold uppercase leading-tight tracking-wide text-white">
                        {s.name}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-white/65">
                        <Users className="h-3.5 w-3.5 text-[#e3bd74]" />
                        <span>
                          {s.capacity} persona{s.capacity === 1 ? '' : 's'}
                          {s.categoryId === 'cat-canchas' && s.capacity === 14 ? ' c/u' : ''}
                        </span>
                      </p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white transition-all group-hover:border-[#e3bd74] group-hover:bg-[#e3bd74] group-hover:text-[#1d1214]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
