'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CatalogServiceRecord } from '@/features/catalog/catalog.types';
import { Users, ArrowRight } from 'lucide-react';
import { servicePhoto } from '@/components/admin/service-image';

interface ServiceCardProps {
  service: CatalogServiceRecord;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const image = servicePhoto(service.slug);
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(service.price);

  return (
    <div className="omega-ring group h-full">
      <div className="omega-ring-inner flex h-full flex-col bg-[#141013] backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1">
      <Link href={`/servicios/${service.id}`} className="relative block h-56 overflow-hidden bg-[#0a0103]" aria-label={`Ver ${service.name}`}>
        {image ? (
          <Image
            src={image}
            alt={service.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 bg-[#211a1d]" aria-hidden="true" />
        )}

        {/* Overlay sutil para legibilidad de títulos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none z-10" />

        {/* Badge de Capacidad oficial */}
        <span className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full text-xs font-bold bg-[#7A1F3D] text-white shadow-xs flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>Aforo: {service.capacity}</span>
        </span>

        {/* Nombre y categoría sobre la imagen */}
        <div className="absolute bottom-3 left-4 right-4 z-20 text-white">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74] block mb-0.5">
            {service.category.name}
          </span>
          <h3 className="font-black text-xl leading-tight drop-shadow-md text-white">
            {service.name}
          </h3>
        </div>
      </Link>

      {/* Cuerpo de la tarjeta */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed line-clamp-2">
            {service.description || 'Descripción no registrada.'}
          </p>
        </div>

        {/* Precio y Acciones */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/45">Precio registrado</span>
              <p className="text-lg font-black text-white">
                {formattedPrice} COP
              </p>
            </div>

          </div>

          <Link
            href={`/servicios/${service.id}`}
            className="w-full py-3.5 rounded-xl bg-[#7a1f3d] hover:bg-[#8f2547] text-white font-bold text-sm text-center shadow-[0_10px_28px_rgba(122,31,61,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Ver servicio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
