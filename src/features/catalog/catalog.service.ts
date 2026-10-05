import { catalogRepository } from "./catalog.repository";
import { NotFoundError } from "@/shared/http/errors";

export const catalogService = {
  async getCategories() {
    return catalogRepository.findAllCategories();
  },

  async getCategoryById(id: string) {
    const category = await catalogRepository.findCategoryById(id);

    if (!category) {
      throw new NotFoundError("Categoría no encontrada");
    }

    return category;
  },

  async getServices() {
    return catalogRepository.findAllServices();
  },

  async getServiceById(id: string) {
    const service = await catalogRepository.findServiceById(id);

    if (!service) {
      throw new NotFoundError("Servicio no encontrado");
    }

    return service;
  },
};