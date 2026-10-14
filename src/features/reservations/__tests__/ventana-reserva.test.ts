import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({
  db: {
    serviceSlot: { findMany: vi.fn().mockResolvedValue([]) },
    serviceClosure: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { createReservationWithHold } from "../reservations.service";

// Sábado 2026-10-10 10:00 Bogotá. Límite de la ventana: 2027-01-10.
const AHORA = new Date("2026-10-10T15:00:00.000Z");

function input(fecha: string) {
  return {
    personas: 1,
    acompañantes: [],
    bloques: [
      {
        serviceId: "11111111-1111-4111-8111-111111111111",
        slotId: "22222222-2222-4222-8222-222222222222",
        fecha,
        personas: 1,
      },
    ],
  };
}

describe("ventana de 3 meses calendario (P2-3)", () => {
  it("más allá del límite se rechaza con muy_far", async () => {
    // Miércoles 2027-01-13: fuera de la ventana y sin mantenimiento.
    const r = await createReservationWithHold("user-1", input("2027-01-13"), AHORA);

    expect(r).toMatchObject({ ok: false, code: "muy_far" });
  });

  it("el último día de la ventana pasa el gate", async () => {
    // Domingo 2027-01-10: dentro de la ventana. Falla después por slot
    // inexistente en el mock, lo que prueba que el gate lo dejó pasar.
    const r = await createReservationWithHold("user-1", input("2027-01-10"), AHORA);

    expect(r).toMatchObject({ ok: false, code: "franja_no_existe" });
  });
});
