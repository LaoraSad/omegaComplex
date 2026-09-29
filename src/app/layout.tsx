import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omega Complex",
  description: "Proyecto Next.js desde cero",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
