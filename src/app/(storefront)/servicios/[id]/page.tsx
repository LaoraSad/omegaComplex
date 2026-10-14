import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Compass, CreditCard, Users } from "lucide-react";
import AmbientBubbles from "@/components/AmbientBubbles";
import SectionDivider from "@/components/SectionDivider";
import { servicePhoto, panorama360 } from "@/features/catalog/service-images";
;
import PanoramaModal from "@/components/tour/PanoramaModal";
import Tour360 from "@/components/tour/Tour360";
import PanningImage from "@/components/tour/PanningImage";
import ReservaIsla from "./ReservaIsla";
import { getCatalogService } from "@/features/catalog";
import { NotFoundError } from "@/shared/http/errors";

export const metadata: Metadata = { title: "Detalle del servicio" };

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// El detalle se sirve renderizado: el servidor lee el servicio y manda el HTML
// con contenido. Solo el botón de reserva y el modal de franjas son cliente.
export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  let service;
  try {
    service = await getCatalogService(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const price = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(service.price);
  const image = service.imagen ?? servicePhoto(service.slug);
  const panorama = service.imagen ?? panorama360(service.slug);

  return (
    <div className="omega-dark-section relative min-h-screen overflow-hidden bg-[#0e0b0d] text-white">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="mixed" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/servicios" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition-colors hover:text-[#e3bd74]">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141013]">
              <div className="relative h-80 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
                {panorama && image ? (
                  <Tour360
                    src={panorama}
                    title={service.name}
                    subtitle={service.category.name}
                    trigger={<PanningImage src={image} alt={service.name} />}
                  />
                ) : image ? (
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
                  <span>
                    {panorama
                      ? 'Toca la imagen para recorrerla en 360°.'
                      : 'Inspecciona la imagen con el cursor o amplíala.'}
                  </span>
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

          <ReservaIsla service={service} />
        </div>
      </main>
    </div>
  );
}
