/**
 * Fase 5.3 (E2E, Stripe mockeado): empleado — consulta un QR y da acceso.
 *
 * El QR es un fixture (mock): se inserta con hash + código corto reales pero
 * sin pasar por Stripe, en una franja en curso para que el gate de tiempo lo
 * permita. El camino de emisión real está cubierto por tests de servicio.
 */
import { expect, test } from "@playwright/test";
import "dotenv/config";

import { createHash, randomBytes } from "node:crypto";

import { clienteDb, crearCliente, iniciarSesion, limpiarSufijo, sufijoUnico } from "./helpers";

const db = clienteDb();
test.afterAll(async () => {
  await db.$disconnect();
});

const EMPLEADO_PASSWORD = "emp123456";

function codigoCortoUnico(): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXY23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return code;
}

test("empleado: consulta el código corto y concede el acceso", async ({ page, request }) => {
  const sufijo = sufijoUnico("empleado");
  const reservaIds: string[] = [];
  const shortCode = codigoCortoUnico();
  try {
    // 1. Fixture: reserva confirmada en franja en curso + QR mock.
    const userId = await crearCliente(db, sufijo, 1);
    const customer = await db.customer.findFirstOrThrow({ where: { userId } });
    const categoria = await db.category.create({
      data: { name: `E2E Cat ${sufijo}`, slug: `e2e-cat-${sufijo}` },
      select: { id: true },
    });
    const servicio = await db.service.create({
      data: {
        categoryId: categoria.id,
        name: `E2E Servicio ${sufijo}`,
        slug: `e2e-servicio-${sufijo}`,
        price: 10000,
        capacity: 10,
      },
      select: { id: true },
    });
    const inicio = new Date(Date.now() - 10 * 60 * 1000);
    const fin = new Date(Date.now() + 50 * 60 * 1000);
    const reserva = await db.reservation.create({
      data: {
        customerId: customer.id,
        serviceId: servicio.id,
        status: "confirmed",
        quantity: 1,
        totalCop: 10000,
        startsAt: inicio,
        endsAt: fin,
      },
      select: { id: true },
    });
    reservaIds.push(reserva.id);
    const bloque = await db.reservationBlock.create({
      data: {
        reservationId: reserva.id,
        serviceId: servicio.id,
        startsAt: inicio,
        endsAt: fin,
        personas: 1,
      },
      select: { id: true },
    });
    const invitado = await db.reservationGuest.create({
      data: {
        reservationId: reserva.id,
        fullName: "E2e Cliente Uno",
        document: "E2E10001",
        isTitular: true,
      },
      select: { id: true },
    });
    await db.qrToken.create({
      data: {
        reservationId: reserva.id,
        blockId: bloque.id,
        guestId: invitado.id,
        tokenHash: createHash("sha256").update(randomBytes(24).toString("hex")).digest("hex"),
        shortCode,
        seqNo: 1,
        status: "active",
      },
    });

    // 2. Login de empleado y consulta manual del código corto.
    await iniciarSesion(page, request, "empleado1@omegacomplex.com", EMPLEADO_PASSWORD);
    await page.goto("/validar");
    await page.getByPlaceholder("K7M2-XQP4").fill(`${shortCode.slice(0, 4)}-${shortCode.slice(4)}`);
    await page.getByRole("button", { name: "Consultar" }).click();

    // 3. Ficha + concesión.
    await expect(page.getByText("Confirmar ingreso")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2e Cliente Uno").first()).toBeVisible();
    await page.getByRole("button", { name: "Dar acceso" }).click();
    await expect(page.getByRole("heading", { name: "Acceso concedido" })).toBeVisible({
      timeout: 15_000,
    });

    // 4. El QR quedó consumido (un solo uso).
    const qr = await db.qrToken.findFirstOrThrow({ where: { shortCode } });
    expect(qr.status).toBe("used");
  } finally {
    await limpiarSufijo(db, sufijo, reservaIds);
  }
});
