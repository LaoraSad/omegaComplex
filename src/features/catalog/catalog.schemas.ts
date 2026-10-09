import { z } from "zod";

export function slugifyCategory(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

const categoryNameSchema = z
	.string()
	.trim()
	.min(2, "El nombre debe tener al menos 2 caracteres")
	.max(80, "El nombre no puede superar 80 caracteres")
	.refine((name) => slugifyCategory(name).length > 0, "El nombre debe contener letras o números");

const categoryDescriptionSchema = z
	.string()
	.trim()
	.max(500, "La descripción no puede superar 500 caracteres")
	.nullable();

export const createCategorySchema = z.object({
	name: categoryNameSchema,
	description: categoryDescriptionSchema.optional(),
});

export const updateCategorySchema = z
	.object({
		name: categoryNameSchema.optional(),
		description: categoryDescriptionSchema.optional(),
		isActive: z.boolean().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, "Debes enviar al menos un campo para actualizar");

export const categoryIdSchema = z.string().uuid("El identificador de categoría no es válido");

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
