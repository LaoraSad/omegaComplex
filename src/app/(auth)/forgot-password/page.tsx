import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      description="Te enviaremos las instrucciones para recuperar el acceso a tu cuenta."
      eyebrow="Recuperación de cuenta"
      title="¿Olvidaste tu contraseña?"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
