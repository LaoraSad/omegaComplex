import type { Metadata } from "next";
import localFont from "next/font/local";
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
    >
      <body className={`min-h-full flex flex-col ${recoleta.className}`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
