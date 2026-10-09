import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailPanel } from "@/components/auth/verify-email/VerifyEmailPanel";

export const metadata: Metadata = {
  title: "Verifica tu correo",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; sent?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email = "", sent } = await searchParams;

  return (
    <AuthLayout
      description="Confirma tu dirección para activar tu cuenta Omega Complex."
      eyebrow="Seguridad de cuenta"
      title="Verifica tu correo electrónico"
    >
      <VerifyEmailPanel email={email} sent={sent === "true"} />
    </AuthLayout>
  );
}
