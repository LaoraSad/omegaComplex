import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/login/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <AuthLayout
      brandVideoSrc="/video_login6b39a628.mp4"
      description="Ingresa con tu correo y contraseña para continuar."
      eyebrow="Qué bueno tenerte de vuelta"
      title="Inicia sesión"
    >
      <LoginForm />
    </AuthLayout>
  );
}
