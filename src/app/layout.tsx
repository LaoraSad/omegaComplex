// -----------------------------------------------------------------------------
// src/app/layout.tsx
// Layout raíz de la aplicación Next.js (App Router).
// Se envuelve en todas las páginas. Define el HTML, body, fuentes, barra de
// progreso y notificaciones globales.
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

// -----------------------------------------------------------------------------
// Fuentes locales
// Se cargan fuentes propias para evitar dependencias externas y mejorar el
// rendimiento (no hay peticiones a Google Fonts).
// -----------------------------------------------------------------------------
const recoleta = localFont({
  src: [
    { path: "./fonts/recoleta/Recoleta-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/recoleta/Recoleta-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/recoleta/Recoleta-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/recoleta/Recoleta-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/recoleta/Recoleta-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-recoleta",
  display: "swap",
});

const cooperBlack = localFont({
  src: "./fonts/cooper-black/cooper-black.ttf",
  variable: "--font-cooper",
  display: "swap",
});

// -----------------------------------------------------------------------------
// Metadata
// Título y descripción de la página para SEO y pestañas del navegador.
// -----------------------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    default: "Omega Complex | Complejo Deportivo",
    template: "%s | Omega Complex",
  },
  description: "Centro deportivo y recreativo de alto nivel.",
};

// -----------------------------------------------------------------------------
// RootLayout
// Componente Server Component que renderiza el esqueleto de todas las páginas.
//   - <html> con lang="es" y clases de fuentes.
//   - data-scroll-behavior="smooth": evita que el scroll suave interfiera con
//     las transiciones de ruta de Next.js.
//   - NextTopLoader: barra fina de progreso en cada navegación (útil en páginas
//     pesadas como reportes o accesos).
//   - {children}: el contenido de la página actual.
//   - Toaster: notificaciones toast (sonner) en la parte superior centrada.
// -----------------------------------------------------------------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${recoleta.variable} ${cooperBlack.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className={`min-h-full flex flex-col ${recoleta.className}`}>
        <NextTopLoader color="#7A1F3D" showSpinner={false} shadow="0 0 10px #7A1F3D,0 0 5px #7A1F3D" />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
