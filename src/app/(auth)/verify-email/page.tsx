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
      description="Confirma tu correo para completar el proceso de registro."
      eyebrow="Un paso más"
      title="Verifica tu correo"
    >
      <VerifyEmailPanel email={email} />
    </AuthLayout>
  );
}
