import type { Metadata } from "next";
import Navbar from "@/components/piscinas/layout/Navbar";
import Footer from "@/components/piscinas/layout/Footer";
import "./piscinas.css";

export const metadata: Metadata = {
  title: "Omega Complex | Reservas y Control de Acceso Deportivo",
  description:
    "Plataforma oficial de reservas para Omega Complex. Piscinas, canchas sintéticas, gimnasio y zona húmeda con acceso digital QR.",
};

export default function PiscinasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="piscinas-shell flex min-h-screen flex-col bg-[#F5F5F5] text-[#1F1F1F] antialiased font-sans">
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
