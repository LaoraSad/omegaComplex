'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockCategories } from '@/lib/storefront/mock/categories';
import { mockServices } from '@/lib/storefront/mock/services';
import ServiceCard from '@/components/catalog/ServiceCard';
import BookingGuide from '@/components/storefront/BookingGuide';
import AmbientBubbles from '@/components/AmbientBubbles';
import { Search, Waves, Trophy, Dumbbell, Sparkles, Filter, X } from 'lucide-react';

function ServicesContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('categoria');

  const [categoryState, setCategoryState] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = categoryParam || categoryState;

  const filteredServices = useMemo(() => {
    return mockServices.filter((service) => {
      const matchesCategory =
        currentCategory === 'todas' || service.categoryId === currentCategory;
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [currentCategory, searchQuery]);

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'piscinas':
        return <Waves className="w-4 h-4" />;
      case 'canchas':
        return <Trophy className="w-4 h-4" />;
      case 'gimnasio':
        return <Dumbbell className="w-4 h-4" />;
      case 'zona-humeda':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#0e0b0d] text-white">
      <div aria-hidden="true" className="omega-cta-glow" />
      <AmbientBubbles variant="mixed" />
      <BookingGuide />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="mb-10 text-center sm:text-left space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74]">
          Catálogo Oficial
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
          Servicios e Instalaciones
        </h1>
        <p className="text-sm sm:text-base text-white/60 max-w-2xl">
          Explora los servicios disponibles del complejo con vista 360°, consulta capacidades y selecciona el espacio ideal para tu entrenamiento o esparcimiento.
        </p>
      </div>

      {/* Filtros por Categoría y Buscador */}
      <div data-tour="filtros" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
        {/* Pestañas de categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setCategoryState('todas')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentCategory === 'todas'
                ? 'bg-[#7a1f3d] text-white shadow-[0_8px_24px_rgba(122,31,61,0.45)]'
                : 'bg-white/5 text-white/60 border border-white/10 hover:text-white hover:border-white/25'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Todas ({mockServices.length})</span>
          </button>

          {mockCategories.map((cat) => {
            const count = mockServices.filter((s) => s.categoryId === cat.id).length;
            const isSelected = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryState(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#7a1f3d] text-white shadow-[0_8px_24px_rgba(122,31,61,0.45)]'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                <span>{getCategoryIcon(cat.slug)}</span>
                <span>{cat.name}</span>
                <span className="opacity-75 text-xs">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Buscador de texto */}
        <div data-tour="buscador" className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Buscar cancha, piscina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/35 focus:outline-none focus:border-[#b3295a] focus:shadow-[0_0_0_3px_rgba(142,35,71,0.35)] transition-all"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-white/40" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Servicios con Visor 360 */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service, i) => (
            <div key={service.id} data-tour={i === 0 ? 'reservar' : undefined} className="min-w-0">
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/5 p-8 max-w-md mx-auto space-y-3">
          <Search className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="font-bold text-lg text-white">No se encontraron servicios</h3>
          <p className="text-xs text-white/55">
            No hay servicios que coincidan con la búsqueda o categoría seleccionada.
          </p>
          <button
            onClick={() => {
              setCategoryState('todas');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-[#e3bd74] hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/55 bg-[#0e0b0d]">Cargando catálogo...</div>}>
      <ServicesContent />
    </Suspense>
  );
}
