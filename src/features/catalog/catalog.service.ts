import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/shared/http/errors";
import {
	archiveCategory as archiveCategoryRecord,
	createCategory as createCategoryRecord,
	getCatalogService as getCatalogServiceRecord,
	getCategory as getCategoryRecord,
	listCategories as listCategoryRecords,
	listCatalogServices as listCatalogServiceRecords,
	updateCategory as updateCategoryRecord,
} from "./catalog.repository";
import { slugifyCategory } from "./catalog.schemas";
import type { CreateCategoryInput, UpdateCategoryInput } from "./catalog.schemas";

function rethrowCatalogError(error: unknown): never {
	if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
		throw new ConflictError("Ya existe una categoría con ese nombre o slug");
	}
	throw error;
}

export function listCategories(includeInactive = false) {
	return listCategoryRecords(includeInactive);
}

export function listCatalogServices(categorySlug?: string) {
	return listCatalogServiceRecords(categorySlug);
}

export async function getCatalogService(id: string) {
	const service = await getCatalogServiceRecord(id);
	if (!service) throw new NotFoundError("Servicio no encontrado");
	return service;
}

export async function getCategory(id: string, includeInactive = false) {
	const category = await getCategoryRecord(id, includeInactive);
	if (!category) throw new NotFoundError("Categoría no encontrada");
	return category;
}

export async function createCategory(input: CreateCategoryInput) {
	try {
		return await createCategoryRecord(input, slugifyCategory(input.name));
	} catch (error) {
		rethrowCatalogError(error);
	}
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
	try {
		const updated = await updateCategoryRecord(
			id,
			input,
			input.name === undefined ? undefined : slugifyCategory(input.name),
		);
		if (!updated) throw new NotFoundError("Categoría no encontrada");
		return updated;
	} catch (error) {
		rethrowCatalogError(error);
	}
}

export async function archiveCategory(id: string) {
	const archived = await archiveCategoryRecord(id);
	if (!archived) throw new NotFoundError("Categoría no encontrada");
	return archived;
}
