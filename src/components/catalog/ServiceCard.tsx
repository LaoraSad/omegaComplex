'use client';

import Link from 'next/link';
import { Service } from '@/types/storefront/omega';
import PanoramaModal from '@/components/tour/PanoramaModal';
import { Users, ArrowRight, Compass, AlertCircle, Check } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(service.pricePerHour);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#e3bd74]/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_24px_rgba(201,169,107,0.12)]">
      {/* Cabecera: Visor 360 interactivo en vivo */}
      <div className="relative h-56 bg-[#0a0103] overflow-hidden">
        {/* Vista previa en plano; al tocarla se abre la ventana 360 responsive */}
        <PanoramaModal src={service.panoramaUrl} title={service.name} trigger={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
        } />

        {/* Overlay sutil para legibilidad de títulos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none z-10" />

        {/* Badge 360° interactivo */}
        <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#e3bd74] animate-ping" />
          <Compass className="w-3.5 h-3.5 text-[#e3bd74]" />
          <span className="text-[#e3bd74]">Vista 360°</span>
        </div>

        {/* Badge de Capacidad oficial */}
        <span className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full text-xs font-bold bg-[#7A1F3D] text-white shadow-xs flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>Aforo: {service.capacity}</span>
        </span>

        {/* Nombre y categoría sobre el visor 360 */}
        <div className="absolute bottom-3 left-4 right-4 z-20 text-white">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3bd74] block mb-0.5">
            {service.categoryName}
          </span>
          <h3 className="font-black text-xl leading-tight drop-shadow-md text-white">
            {service.name}
          </h3>
        </div>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed line-clamp-2">
            {service.description}
          </p>

          {/* Reglas de uso obligatorias si aplican */}
          {service.rules && service.rules.length > 0 && (
            <div className="mt-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#e3bd74] flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#e3bd74]" />
                <span>Normas requeridas:</span>
              </span>
              <ul className="text-xs text-white/75 space-y-0.5 font-medium">
                {service.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <Check className="w-3 h-3 text-[#e3bd74] shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Precio y Acciones */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/45">
                Tarifa referencial:
              </span>
              <p className="text-lg font-black text-white">
                {formattedPrice} <span className="text-xs font-normal text-white/45">/ hora</span>
              </p>
            </div>

          </div>

          <Link
            href={`/servicios/${service.id}`}
            className="w-full py-3.5 rounded-xl bg-[#7a1f3d] hover:bg-[#8f2547] text-white font-bold text-sm text-center shadow-[0_10px_28px_rgba(122,31,61,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Reservar horario</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
