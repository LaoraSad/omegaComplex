import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogoConCarrito from "./CatalogoConCarrito";
import { listCategories, listCatalogServices } from "@/features/catalog";

export const metadata: Metadata = { title: "Servicios e Instalaciones" };

// El catálogo se sirve renderizado: categorías y servicios se leen en el
// servidor y la isla cliente solo maneja filtros, búsqueda y carrito. Así el
// primer byte ya trae contenido en vez de "Cargando catálogo…".
export default async function ServicesPage() {
  const [categories, services] = await Promise.all([
    listCategories(),
    listCatalogServices(),
  ]);

  return (
    <Suspense fallback={<div className="p-12 text-center text-white/55 bg-[#0e0b0d]">Cargando catálogo...</div>}>
      <CatalogoConCarrito initialCategories={categories} initialServices={services} />
    </Suspense>
  );
}
