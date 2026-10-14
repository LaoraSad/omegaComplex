import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({
  db: { serviceSlot: { findMany: vi.fn().mockResolvedValue([]) } },
}));

import { createReservationWithHold } from "../reservations.service";

const BLOQUE = {
  serviceId: "11111111-1111-4111-8111-111111111111",
  slotId: "22222222-2222-4222-8222-222222222222",
  personas: 1,
};

// Sábado 2026-10-10 10:00 Bogotá: antes del lunes/martes de prueba.
const AHORA = new Date("2026-10-10T15:00:00.000Z");

describe("gate de mantenimiento en escritura (P1-3)", () => {
  it("rechaza reservar un lunes de mantenimiento aunque exista slot", async () => {
    // 2026-10-19 es lunes y no es festivo: mantenimiento.
    const r = await createReservationWithHold(
      "cust-1",
      { personas: 1, acompa\u00f1antes: [], bloques: [{ ...BLOQUE, fecha: "2026-10-19" }] },
      AHORA,
    );

    expect(r).toMatchObject({ ok: false, code: "mantenimiento" });
  });

  it("el martes siguiente pasa el gate (falla después, por slot inexistente en el mock)", async () => {
    const r = await createReservationWithHold(
      "cust-1",
      { personas: 1, acompa\u00f1antes: [], bloques: [{ ...BLOQUE, fecha: "2026-10-20" }] },
      AHORA,
    );

    expect(r).toMatchObject({ ok: false, code: "franja_no_existe" });
  });

  it("el martes de mantenimiento (lunes festivo) también se rechaza", async () => {
    // 2026-10-12 es lunes festivo: el mantenimiento se corre al martes 13.
    const r = await createReservationWithHold(
      "cust-1",
      { personas: 1, acompa\u00f1antes: [], bloques: [{ ...BLOQUE, fecha: "2026-10-13" }] },
      AHORA,
    );

    expect(r).toMatchObject({ ok: false, code: "mantenimiento" });
  });
});
