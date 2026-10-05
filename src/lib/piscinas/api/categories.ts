import { Category } from '@/types/piscinas/omega';
import { mockCategories } from '@/lib/piscinas/mock/categories';

/**
 * Capa de abstracción para consumo de Categorías.
 * Retorna mocks simulando una respuesta asíncrona que luego
 * se conectará a la API REST del backend.
 */
export async function getCategories(): Promise<Category[]> {
  // Simulación de delay de red mínimo
  return Promise.resolve(mockCategories);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = mockCategories.find((c) => c.slug === slug);
  return Promise.resolve(category || null);
}
