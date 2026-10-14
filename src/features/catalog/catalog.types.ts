// Tipos derivados de Prisma para categorías con conteo de servicios y servicios
// de catálogo con su categoría y horarios.
import type { Prisma } from "@prisma/client";

export type CategoryRecord = Prisma.CategoryGetPayload<{
	include: { _count: { select: { services: true } } };
}>;

export type CatalogServiceRecord = Prisma.ServiceGetPayload<{
	include: {
		category: { select: { id: true; name: true; slug: true } };
		serviceSchedules: { orderBy: { dayOfWeek: "asc" } };
	};
}>;
