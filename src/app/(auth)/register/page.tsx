import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/register/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      brandVideoSrc="/video_login6b39a628.mp4"
      description="Crea tu cuenta y empieza a disfrutar de Omega Complex."
      eyebrow="Únete a nuestra comunidad"
      title="Crea tu cuenta"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
