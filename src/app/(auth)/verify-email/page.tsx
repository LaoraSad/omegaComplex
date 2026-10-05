import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailPanel } from "@/components/auth/verify-email/VerifyEmailPanel";

export const metadata: Metadata = {
  title: "Verifica tu correo",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email = "" } = await searchParams;

  return (
    <AuthLayout
      description="Tu cuenta ya está activa. La verificación por correo estará disponible próximamente."
      eyebrow="Cuenta activa"
      title="Verifica tu correo"
    >
      <VerifyEmailPanel email={email} />
    </AuthLayout>
  );
}
