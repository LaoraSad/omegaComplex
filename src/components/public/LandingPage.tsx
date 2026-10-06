import Hero from '@/components/public/landing/Hero';
import BenefitsBar from '@/components/public/landing/BenefitsBar';
import InstalacionesSection from '@/components/public/landing/InstalacionesSection';
import HowItWorks from '@/components/public/landing/HowItWorks';
import ComplexInfo from '@/components/public/landing/ComplexInfo';
import CTASection from '@/components/public/landing/CTASection';
import SectionDivider from '@/components/public/landing/SectionDivider';
import { getFeaturedServices } from '@/lib/piscinas/api/services';

export default async function LandingPage() {
  const featuredServices = await getFeaturedServices();

  return (
    <div className="flex flex-col bg-[#0e0b0d] text-[#f5f1ec] antialiased">
      <Hero />
      <SectionDivider />
      <BenefitsBar />
      <SectionDivider />
      <InstalacionesSection services={featuredServices} />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <ComplexInfo />
      <SectionDivider />
      <CTASection />
    </div>
  );
}