import Hero from '@/components/public/landing/Hero';
import BenefitsBar from '@/components/public/landing/BenefitsBar';
import InstalacionesSection from '@/components/public/landing/InstalacionesSection';
import HowItWorks from '@/components/public/landing/HowItWorks';
import ComplexInfo from '@/components/public/landing/ComplexInfo';
import CTASection from '@/components/public/landing/CTASection';
import { getFeaturedServices } from '@/lib/piscinas/api/services';

export default async function LandingPage() {
  const featuredServices = await getFeaturedServices();

  return (
    <div className="flex flex-col bg-[#f4f1f0]">
      <Hero />
      <BenefitsBar />
      <InstalacionesSection services={featuredServices} />
      <HowItWorks />
      <ComplexInfo />
      <CTASection />
    </div>
  );
}