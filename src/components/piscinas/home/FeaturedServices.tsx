import Link from 'next/link';
import { Service } from '@/types/piscinas/omega';
import { mockServices } from '@/lib/piscinas/mock/services';
import ServiceCard from '@/components/piscinas/services/ServiceCard';

interface FeaturedServicesProps {
  services: Service[];
}

export default function FeaturedServices({ services }: FeaturedServicesProps) {
  return (
    <section id="servicios" className="py-16 md:py-24 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
              Servicios destacados
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight mt-1">
              Instalaciones Más Solicitadas
            </h2>
            <p className="text-sm sm:text-base text-[#6B7280] mt-2 max-w-xl">
              Selecciona tu horario preferido y asegura tu reserva con aforo garantizado.
            </p>
          </div>

          <Link
            href="/servicios"
            className="text-sm font-bold text-[#7A1F3D] hover:text-[#631730] flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <span>Ver catálogo completo ({mockServices.length} servicios)</span>
            <span>→</span>
          </Link>
        </div>

        {/* Grid de servicios destacados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
