import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/reset-password/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token = "" } = await searchParams;

  return (
    <AuthLayout
      description="Elige una contraseña nueva y segura para tu cuenta."
      eyebrow="Recuperación de cuenta"
      title="Restablece tu contraseña"
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
