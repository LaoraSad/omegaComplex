import { db } from "@/shared/lib/db";

export const catalogRepository = {
  findAllCategories() {
    return db.category.findMany({
      orderBy: {
        name: "asc",
      },
    });
  },

  findCategoryById(id: string) {
    return db.category.findUnique({
      where: {
        id,
      },
    });
  },

  findAllServices() {
    return db.service.findMany({
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  },

  findServiceById(id: string) {
    return db.service.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });
  },

};
