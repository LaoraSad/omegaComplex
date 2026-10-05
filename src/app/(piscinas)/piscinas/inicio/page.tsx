import Hero from '@/components/piscinas/home/Hero';
import CategorySection from '@/components/piscinas/home/CategorySection';
import FeaturedServices from '@/components/piscinas/home/FeaturedServices';
import HowItWorks from '@/components/piscinas/home/HowItWorks';
import ComplexInfo from '@/components/piscinas/home/ComplexInfo';
import CTASection from '@/components/piscinas/home/CTASection';
import { getCategories } from '@/lib/piscinas/api/categories';
import { getFeaturedServices } from '@/lib/piscinas/api/services';

export default async function HomePage() {
  const [categories, featuredServices] = await Promise.all([
    getCategories(),
    getFeaturedServices(),
  ]);

  return (
    <div className="flex flex-col">
      {/* 1. Hero con CTAs claros */}
      <Hero />

      {/* 2. Categorías oficiales */}
      <CategorySection categories={categories} />

      {/* 3. Servicios destacados con aforo y precios por hora */}
      <FeaturedServices services={featuredServices} />

      {/* 4. Flujo de reserva (Cómo funciona) */}
      <HowItWorks />

      {/* 5. Información del complejo (Horarios, Aforo, Reglas de ingreso) */}
      <ComplexInfo />

      {/* 6. Llamado a la acción final (CTA) */}
      <CTASection />
    </div>
  );
}
