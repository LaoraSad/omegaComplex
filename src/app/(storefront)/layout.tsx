import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getSession } from "@/shared/auth/session";
import { findSessionUserById } from "@/features/auth/auth.repository";
import "./storefront.css";

export const metadata: Metadata = {
  title: "Omega Complex | Reservas y Control de Acceso Deportivo",
  description:
    "Plataforma oficial de reservas para Omega Complex. Piscinas, canchas sintéticas, gimnasio y zona húmeda con acceso digital QR.",
};

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let user = null;
  if (session?.userId) {
    try {
      user = await findSessionUserById(session.userId);
    } catch {
      user = null;
    }
  }

  return (
    <div className="storefront-shell flex min-h-screen flex-col bg-[#F5F5F5] text-[#1F1F1F] antialiased font-sans">
      <Navbar initialUser={user} />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
