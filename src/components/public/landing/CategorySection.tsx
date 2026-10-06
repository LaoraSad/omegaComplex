import Link from 'next/link';
import { Category } from '@/types/piscinas/omega';
import { Waves, Trophy, Dumbbell, Sparkles, ArrowRight } from 'lucide-react';

interface CategorySectionProps {
  categories: Category[];
}

export default function CategorySection({ categories }: CategorySectionProps) {
  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'piscinas':
        return <Waves className="w-7 h-7 text-[#7A1F3D]" />;
      case 'canchas':
        return <Trophy className="w-7 h-7 text-[#7A1F3D]" />;
      case 'gimnasio':
        return <Dumbbell className="w-7 h-7 text-[#7A1F3D]" />;
      case 'zona-humeda':
        return <Sparkles className="w-7 h-7 text-[#7A1F3D]" />;
      default:
        return <Sparkles className="w-7 h-7 text-[#7A1F3D]" />;
    }
  };

  return (
    <section className="py-16 md:py-20 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
              Instalaciones disponibles
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight mt-1">
              Explora por Categoría
            </h2>
            <p className="text-sm sm:text-base text-[#6B7280] mt-2 max-w-xl">
              Cada área cuenta con servicios independientes y capacidad controlada para brindarte la mejor experiencia.
            </p>
          </div>
          <Link
            href="/servicios"
            className="text-sm font-bold text-[#7A1F3D] hover:text-[#631730] flex items-center gap-1.5 transition-colors self-start md:self-auto group"
          >
            <span>Ver todos los servicios</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid de 4 categorías principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/servicios?categoria=${cat.id}`}
              className="group p-6 rounded-2xl bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#7A1F3D]/40 hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-[#7A1F3D]/10 border border-[#E5E7EB] flex items-center justify-center mb-5 shadow-xs transition-colors">
                  {getCategoryIcon(cat.slug)}
                </div>
                <h3 className="font-extrabold text-xl text-[#1F1F1F] group-hover:text-[#7A1F3D] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7EB]/80 flex items-center justify-between text-xs font-bold text-[#7A1F3D]">
                <span>Consultar servicios</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
