import { describe, expect, it } from "vitest";
import {
	createCategorySchema,
	slugifyCategory,
	updateCategorySchema,
} from "../catalog.schemas";

describe("category schemas", () => {
	it("normalizes accented category names into stable slugs", () => {
		expect(slugifyCategory("Zonas húmedas")).toBe("zonas-humedas");
		expect(slugifyCategory("  Canchas  ")).toBe("canchas");
	});

	it("rejects names that cannot produce a slug", () => {
		expect(createCategorySchema.safeParse({ name: "🏊" }).success).toBe(false);
	});

	it("rejects empty updates", () => {
		expect(updateCategorySchema.safeParse({}).success).toBe(false);
	});
});
