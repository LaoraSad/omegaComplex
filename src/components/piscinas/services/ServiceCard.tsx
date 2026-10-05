'use client';

import Link from 'next/link';
import { Service } from '@/types/piscinas/omega';
import PanoramaClient from '@/components/piscinas/PanoramaClient';
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
    <div className="group rounded-3xl bg-white border border-[#7A1F3D]/40 hover:border-[#7A1F3D] hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Cabecera: Visor 360 interactivo en vivo */}
      <div className="relative h-56 bg-[#0a0103] overflow-hidden">
        {/* Visor 360 panorámico en vivo */}
        <div className="w-full h-full pointer-events-none opacity-95 group-hover:opacity-100 transition-opacity">
          <PanoramaClient src={service.panoramaUrl} hideHud />
        </div>

        {/* Overlay sutil para legibilidad de títulos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none z-10" />

        {/* Badge 360° interactivo */}
        <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          <Compass className="w-3.5 h-3.5 text-rose-300" />
          <span className="text-rose-300">Vista 360°</span>
        </div>

        {/* Badge de Capacidad oficial */}
        <span className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full text-xs font-bold bg-[#7A1F3D] text-white shadow-xs flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>Aforo: {service.capacity}</span>
        </span>

        {/* Nombre y categoría sobre el visor 360 */}
        <div className="absolute bottom-3 left-4 right-4 z-20 text-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block mb-0.5">
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
          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed line-clamp-2">
            {service.description}
          </p>

          {/* Reglas de uso obligatorias si aplican */}
          {service.rules && service.rules.length > 0 && (
            <div className="mt-3.5 p-3 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A1F3D] flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#7A1F3D]" />
                <span>Normas requeridas:</span>
              </span>
              <ul className="text-xs text-[#1F1F1F] space-y-0.5 font-medium">
                {service.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <Check className="w-3 h-3 text-[#7A1F3D] shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Precio y Acciones */}
        <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280]">
                Tarifa referencial:
              </span>
              <p className="text-lg font-black text-[#1F1F1F]">
                {formattedPrice} <span className="text-xs font-normal text-[#6B7280]">/ hora</span>
              </p>
            </div>

            {/* Enlace al tour 360 pantalla completa */}
            {service.tour360Id && (
              <Link
                href={`/tour/${service.tour360Id}`}
                className="text-xs font-bold text-[#C8A96B] hover:text-[#7A1F3D] transition-colors flex items-center gap-1"
                title="Abrir vista 360° en pantalla completa"
              >
                <span>Tour completo</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <Link
            href={`/servicios/${service.id}`}
            className="w-full py-3.5 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white font-bold text-sm text-center shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Reservar horario</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
