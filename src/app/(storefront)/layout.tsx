import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BenefitsBar from "@/components/public/landing/BenefitsBar";
import { CarritoProvider } from "@/components/storefront/CarritoReserva";
import { BarraCarrito } from "@/components/storefront/BarraCarrito";
import { getSession } from "@/shared/auth/session";
import { cargarUsuarioDeSesion } from "@/shared/auth/session-user";
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
      user = await cargarUsuarioDeSesion(session.userId);
    } catch {
      user = null;
    }
  }

  // El carrito va en el layout y no en cada página: si viviera en /servicios y
  // en /servicios/[id] por separado, navegar de una a otra desmontaría el estado
  // y el cliente perdería lo que ya había elegido sin enterarse.
  return (
    <CarritoProvider haySesion={Boolean(user)} usuarioId={user?.id ?? null}>
      <div className="storefront-shell flex min-h-screen flex-col bg-[#F5F5F5] text-[#1F1F1F] antialiased font-sans">
        <Navbar initialUser={user} />
        <main className="flex-1 pt-20">{children}</main>
        {/* Barra de beneficios del Inicio: refuerza la identidad en toda el área
            del cliente, no solo en la landing. */}
        <BenefitsBar />
        <Footer />
        <BarraCarrito />
      </div>
    </CarritoProvider>
  );
}
