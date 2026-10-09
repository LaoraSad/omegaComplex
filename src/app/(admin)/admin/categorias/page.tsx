import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { listCategories } from "@/features/catalog";
import { CategoriesClient } from "./CategoriesClient";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const categories = await listCategories(true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Categorías"
        description="Administra las categorías que organizan los servicios del complejo."
      />
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}