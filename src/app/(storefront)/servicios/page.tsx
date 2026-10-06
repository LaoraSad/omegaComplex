'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockCategories } from '@/lib/storefront/mock/categories';
import { mockServices } from '@/lib/storefront/mock/services';
import ServiceCard from '@/components/catalog/ServiceCard';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Encabezado */}
      <div className="mb-10 text-center sm:text-left space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
          Catálogo Oficial
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
          Servicios e Instalaciones
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] max-w-2xl">
          Explora los servicios disponibles del complejo con vista 360°, consulta capacidades y selecciona el espacio ideal para tu entrenamiento o esparcimiento.
        </p>
      </div>

      {/* Filtros por Categoría y Buscador */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#E5E7EB]">
        {/* Pestañas de categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setCategoryState('todas')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              currentCategory === 'todas'
                ? 'bg-[#7A1F3D] text-white shadow-xs'
                : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#1F1F1F]'
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
                    ? 'bg-[#7A1F3D] text-white shadow-xs'
                    : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#1F1F1F]'
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
        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Buscar cancha, piscina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#1F1F1F] placeholder-[#6B7280] focus:outline-none focus:border-[#7A1F3D] transition-colors"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B7280]" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-[#6B7280] hover:text-[#1F1F1F]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Servicios con Visor 360 */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E7EB] p-8 max-w-md mx-auto space-y-3">
          <Search className="w-12 h-12 text-[#6B7280] mx-auto opacity-50" />
          <h3 className="font-bold text-lg text-[#1F1F1F]">No se encontraron servicios</h3>
          <p className="text-xs text-[#6B7280]">
            No hay servicios que coincidan con la búsqueda o categoría seleccionada.
          </p>
          <button
            onClick={() => {
              setCategoryState('todas');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-[#7A1F3D] hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#6B7280]">Cargando catálogo...</div>}>
      <ServicesContent />
    </Suspense>
  );
}
