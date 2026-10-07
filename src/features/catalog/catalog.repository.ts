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

export async function listCatalogServices(categorySlug?: string): Promise<CatalogServiceRecord[]> {
	return db.service.findMany({
		where: {
			category: {
				isActive: true,
				...(categorySlug ? { slug: categorySlug } : {}),
			},
		},
		orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
		include: {
			category: { select: { id: true, name: true, slug: true } },
			serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
		},
	}) as Promise<CatalogServiceRecord[]>;
}

export async function getCatalogService(id: string): Promise<CatalogServiceRecord | null> {
	return db.service.findFirst({
		where: { id, category: { isActive: true } },
		include: {
			category: { select: { id: true, name: true, slug: true } },
			serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
		},
	}) as Promise<CatalogServiceRecord | null>;
}
