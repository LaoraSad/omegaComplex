import type { Metadata } from "next";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Omega Complex | Complejo Deportivo",
    template: "%s | Omega Complex",
  },
  description: "Centro deportivo y recreativo de alto nivel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
<html
        lang="es"
        className={`h-full antialiased ${recoleta.variable} ${cooperBlack.variable}`}
        // Sin este atributo, el scroll suave de la app se aplica también a las
        // transiciones de ruta de Next y la navegación se siente lenta.
        data-scroll-behavior="smooth"
      >
      <body className={`min-h-full flex flex-col ${recoleta.className}`}>
        {/* Barra fina de progreso en cada navegación: con páginas pesadas
          (reportes, accesos) el skeleton no basta y la app se siente colgada. */}
        <NextTopLoader color="#7A1F3D" showSpinner={false} shadow="0 0 10px #7A1F3D,0 0 5px #7A1F3D" />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
