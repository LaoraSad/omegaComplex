import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthLayout
        brandVideoSrc="/video_login6b39a628.mp4"
        initialMode="register"
        useSwitchCard
      />
    </Suspense>
  );
}
