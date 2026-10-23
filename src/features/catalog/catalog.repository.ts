import { db } from "@/shared/lib/db";
import type { CreateCategoryInput, UpdateCategoryInput } from "./catalog.schemas";
import type { CatalogServiceRecord, CategoryRecord } from "./catalog.types";

const categoryInclude = { _count: { select: { services: true } } } as const;

export async function listCategories(includeInactive = false): Promise<CategoryRecord[]> {
	return db.category.findMany({
		where: includeInactive ? undefined : { isActive: true },
		orderBy: [{ name: "asc" }],
		include: categoryInclude,
	});
}

export async function getCategory(
	id: string,
	includeInactive = false,
): Promise<CategoryRecord | null> {
	return db.category.findFirst({
		where: { id, ...(includeInactive ? {} : { isActive: true }) },
		include: categoryInclude,
	});
}

export async function createCategory(
	input: CreateCategoryInput,
	slug: string,
): Promise<CategoryRecord> {
	return db.category.create({
		data: {
			name: input.name,
			slug,
			description: input.description ?? null,
		},
		include: categoryInclude,
	});
}

export async function updateCategory(
	id: string,
	input: UpdateCategoryInput,
	slug?: string,
): Promise<CategoryRecord | null> {
	const existing = await db.category.findUnique({ where: { id } });
	if (!existing) return null;

	return db.category.update({
		where: { id },
		data: {
			...(input.name !== undefined ? { name: input.name, slug } : {}),
			...(input.description !== undefined ? { description: input.description } : {}),
			...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
		},
		include: categoryInclude,
	});
}

export async function archiveCategory(id: string): Promise<CategoryRecord | null> {
	const existing = await db.category.findUnique({ where: { id } });
	if (!existing) return null;

	return db.category.update({
		where: { id },
		data: { isActive: false },
		include: categoryInclude,
	});
}

const OFFICIAL_POOL_SLUGS = [
	"piscina-infantil",
	"piscina-de-olas",
	"piscina-tobogan",
	"piscina-inodoro",
	"piscina-torpedo",
];

export async function listCatalogServices(categorySlug?: string): Promise<CatalogServiceRecord[]> {
	const services = (await db.service.findMany({
		where: {
			isActive: true,
			category: {
				is: {
					isActive: true,
					...(categorySlug ? { slug: categorySlug } : {}),
				},
			},
		},
		orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
		include: {
			category: { select: { id: true, name: true, slug: true } },
			serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
		},
	})) as CatalogServiceRecord[];

	if (categorySlug === "piscinas") {
		return services.filter((s) => OFFICIAL_POOL_SLUGS.includes(s.slug));
	}
	return services.filter((s) => s.category.slug !== "piscinas" || OFFICIAL_POOL_SLUGS.includes(s.slug));
}

export async function getCatalogService(id: string): Promise<CatalogServiceRecord | null> {
	const service = (await db.service.findFirst({
		where: { id, isActive: true, category: { is: { isActive: true } } },
		include: {
			category: { select: { id: true, name: true, slug: true } },
			serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
		},
	})) as CatalogServiceRecord | null;

	if (!service) return null;
	if (service.category.slug === "piscinas" && !OFFICIAL_POOL_SLUGS.includes(service.slug)) {
		return null;
	}
	return service;
}
