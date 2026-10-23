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
