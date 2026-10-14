/**
 * Fase 5.3 (E2E, Stripe mockeado): cliente — registro → reserva con hold →
 * visible en mis reservas con pago pendiente.
 *
 * El inbox del correo no existe en E2E: la cuenta se marca verificada por
 * BD (paso documentado) y la emisión de QR queda cubierta por los tests de
 * servicio + la corrida manual con Stripe test mode. Acá se prueba el camino
 * real registro → hold con Stripe fuera de la ecuación.
 */
import { expect, test } from "@playwright/test";
import "dotenv/config";

import {
  clienteDb,
  crearServicioConFranja,
  iniciarSesion,
  limpiarSufijo,
  proximaFechaValida,
  sufijoUnico,
} from "./helpers";

const db = clienteDb();
test.afterAll(async () => {
  await db.$disconnect();
});

test("cliente: se registra, reserva una franja y la ve con hold pendiente", async ({
  page,
  request,
}) => {
  const sufijo = sufijoUnico("cliente");
  const email = `e2e.${sufijo}.1@ejemplo.com`;
  const reservaIds: string[] = [];
  try {
    // 1. Registro por UI.
    await page.goto("/register");
    await page.locator('input[name="firstName"]').fill("E2e");
    await page.locator('input[name="lastName"]').fill("Cliente Uno");
    await page.locator('input[name="document"]').fill(`E2E${Date.now().toString().slice(-8)}`);
    await page.locator('input[name="phone"]').fill("+573001234567");
    await page.locator('input[name="birthDate"]').fill("1990-05-15");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').first().fill("E2eCliente123");
    await page.locator('input[name="confirmPassword"]').fill("E2eCliente123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // 2. Pide el código de verificación (sin inbox: se marca por BD).
    await expect(page).toHaveURL(/\/verify-email\?email=/, { timeout: 15_000 });
    await db.user.update({ where: { email }, data: { emailVerified: true } });

    // 3. Login (por API + cookie: el formulario ya está cubierto en auth.spec).
    await iniciarSesion(page, request, email, "E2eCliente123");
    await page.goto("/mis-reservas");
    await expect(page.getByText("No tienes reservas próximas")).toBeVisible({ timeout: 15_000 });

    // 4. Reserva con hold (API, misma sesión del navegador).
    const ventana = proximaFechaValida();
    const { serviceId, slotId, serviceName } = await crearServicioConFranja(db, sufijo, 1, ventana);
    const creada = await request.post("/api/reservations", {
      data: {
        personas: 1,
        acompañantes: [],
        bloques: [{ serviceId, slotId, fecha: ventana.fecha, personas: 1 }],
      },
    });
    expect(creada.status()).toBe(201);
    const cuerpo = await creada.json();
    expect(cuerpo.data.holdId).toBeTruthy();
    reservaIds.push(cuerpo.data.reservationId);

    // 5. La reserva aparece con pago pendiente (QR aún no emitido: Stripe mockeado).
    await page.goto("/mis-reservas");
    await expect(page.getByText("Tienes 1 reserva sin pagar")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(serviceName).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar esta reserva" }).first()).toBeVisible();

    const detalle = await request.get(`/api/reservations/${cuerpo.data.reservationId}`);
    expect(detalle.status()).toBe(200);
    const detalleJson = await detalle.json();
    expect(detalleJson.data.status).toBe("pending_payment");
    expect(detalleJson.data.pagos).toEqual([]);
  } finally {
    await limpiarSufijo(db, sufijo, reservaIds);
  }
});
