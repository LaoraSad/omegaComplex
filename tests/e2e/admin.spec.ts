/**
 * (E2E, Stripe mockeado): admin — crea categoría, consulta horarios
 * y métricas.
 */
import { expect, test } from "@playwright/test";
import "dotenv/config";

import { clienteDb, iniciarSesion, sufijoUnico } from "./helpers";

const db = clienteDb();
test.afterAll(async () => {
  await db.$disconnect();
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";

test("admin: crea categoría y consulta horarios y métricas", async ({ page, request }) => {
  const sufijo = sufijoUnico("admin");
  const nombre = `E2E Categoria ${sufijo}`;
  try {
    await iniciarSesion(page, request, "admin@omegacomplex.com", ADMIN_PASSWORD);

    // 1. Crear categoría por UI.
    await page.goto("/admin/categorias");
    await expect(page.getByRole("heading", { name: "Nueva categoría" })).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("#category-name").fill(nombre);
    await page.locator("#category-description").fill("Categoría creada por el E2E de cierre");
    await page.getByRole("button", { name: "Crear categoría" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("table").getByText(nombre)).toBeVisible();

    // 2. Consultas: horarios y métricas del rango.
    await page.goto("/admin/horarios");
    await expect(page.getByRole("heading", { name: "Definir horario semanal" })).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/admin/reportes");
    await expect(page.getByText("Métricas").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Ingresos del rango")).toBeVisible();
    await expect(page.getByText("Uso de reservas")).toBeVisible();
  } finally {
    await db.category.deleteMany({ where: { name: nombre } });
  }
});
