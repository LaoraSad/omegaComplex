import { Service } from '@/types/piscinas/omega';
import { mockServices } from '@/lib/piscinas/mock/services';

/**
 * Capa de abstracción para consumo de Servicios.
 */
export async function getServices(categoryId?: string): Promise<Service[]> {
  if (categoryId) {
    return Promise.resolve(mockServices.filter((s) => s.categoryId === categoryId));
  }
  return Promise.resolve(mockServices);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const service = mockServices.find((s) => s.id === id);
  return Promise.resolve(service || null);
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const service = mockServices.find((s) => s.slug === slug);
  return Promise.resolve(service || null);
}

export async function getFeaturedServices(): Promise<Service[]> {
  // Retorna una selección destacada representativa de cada categoría
  const featuredIds = ['piscina-olas', 'futbol-campo', 'gimnasio-principal', 'sauna'];
  return Promise.resolve(mockServices.filter((s) => featuredIds.includes(s.id)));
}
