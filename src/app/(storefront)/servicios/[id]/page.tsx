'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, Compass, CreditCard, Users } from 'lucide-react';
import AmbientBubbles from '@/components/AmbientBubbles';
import SectionDivider from '@/components/SectionDivider';
import { servicePhoto } from '@/components/admin/service-image';
import PanoramaModal from '@/components/tour/PanoramaModal';
import PanningImage from '@/components/tour/PanningImage';
import type { CatalogServiceRecord } from '@/features/catalog/catalog.types';

interface ApiResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = use(params);
  const [service, setService] = useState<CatalogServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadService() {
      try {
        const response = await fetch(`/api/services/${id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = (await response.json()) as ApiResult<CatalogServiceRecord>;
        if (!response.ok || result.error || !result.data) {
          throw new Error(result.error?.message ?? 'No fue posible cargar el servicio.');
        }
        setService(result.data);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'No fue posible cargar el servicio.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadService();
    return () => controller.abort();
  }, [id]);

  const price = service
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(service.price)
    : '';
  const image = service ? servicePhoto(service.slug) : null;

  return (
    <div className="omega-dark-section relative min-h-screen overflow-hidden bg-[#0e0b0d] text-white">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="mixed" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/servicios" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition-colors hover:text-[#e3bd74]">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        {loading ? (
          <p role="status" className="py-20 text-center text-white/60">Cargando servicio…</p>
        ) : error || !service ? (
          <div role="alert" className="rounded-xl border border-red-300/20 bg-red-950/30 p-6 text-center text-red-100">
            {error || 'Servicio no encontrado.'}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <section className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141013]">
                <div className="relative h-80 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
                  {image ? (
                    <PanoramaModal
                      src={image}
                      title={service.name}
                      subtitle={service.category.name}
                      trigger={<PanningImage src={image} alt={service.name} />}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#211a1d]" aria-hidden="true" />
                  )}
                </div>
                {image ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/55">
                    <Compass className="h-4 w-4 text-[#e3bd74]" />
                    <span>Inspecciona la imagen con el cursor o amplíala.</span>
                  </div>
                ) : null}
                <div className="space-y-4 p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e3bd74]">{service.category.name}</p>
                  <h1 className="text-3xl font-black uppercase text-white sm:text-4xl">{service.name}</h1>
                  <p className="leading-relaxed text-white/65">{service.description || 'Descripción no registrada.'}</p>
                  <SectionDivider />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                      <Users className="h-5 w-5 text-[#e3bd74]" />
                      <div><p className="text-xs text-white/50">Capacidad registrada</p><p className="font-bold">{service.capacity} personas</p></div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                      <CreditCard className="h-5 w-5 text-[#e3bd74]" />
                      <div><p className="text-xs text-white/50">Precio registrado</p><p className="font-bold">{price} COP</p></div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="rounded-xl border border-white/10 bg-[#141013] p-6">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                  <CalendarClock className="h-4 w-4 text-[#e3bd74]" /> Horarios registrados
                </h2>
                {service.serviceSchedules.length ? (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {service.serviceSchedules.map((schedule) => (
                      <li key={schedule.id} className="flex justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm">
                        <span className="capitalize text-white/65">{DAYS[schedule.dayOfWeek] ?? `Día ${schedule.dayOfWeek}`}</span>
                        <span className="font-semibold">{schedule.openTime}–{schedule.closeTime}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-white/55">No hay horarios configurados para este servicio.</p>}
              </section>
            </section>

            <aside className="h-fit rounded-xl border border-[#e3bd74]/25 bg-[#141013] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e3bd74]">Reservas</p>
              <h2 className="mt-2 text-xl font-black">Reserva en línea no disponible</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                La disponibilidad, los bloqueos y el pago aún no están conectados a servicios reales. No se confirmará ni cobrará ninguna reserva desde esta página.
              </p>
              <Link href="/servicios" className="mt-6 inline-flex items-center justify-center rounded-md border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]">
                Volver al catálogo
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}