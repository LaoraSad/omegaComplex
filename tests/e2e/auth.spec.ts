import { expect, test } from "@playwright/test";

test("login renderiza formulario y video de marca", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Inicia sesión" }),
  ).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator("video.auth-brand-video source")).toHaveAttribute(
    "src",
    /video_login.*\.mp4/,
  );
});

test("login rechaza credenciales inválidas sin crear sesión", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("nadie@ejemplo.com");
  await page.locator('input[name="password"]').fill("ClaveErrada123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.locator(".auth-error, [role='alert']").first()).toBeVisible(
    { timeout: 10_000 },
  );
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "session")).toBeUndefined();
});

test("API /api/auth/me exige sesión", async ({ request }) => {
  const response = await request.get("/api/auth/me");
  expect(response.status()).toBe(401);
});
