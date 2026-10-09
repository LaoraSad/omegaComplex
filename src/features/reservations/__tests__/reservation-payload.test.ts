import { describe, expect, it } from "vitest";

import { createReservationSchema } from "../reservations.schemas";

describe("createReservationSchema", () => {
  it("acepta el payload correcto del modal de reserva con bloques y acompañantes", () => {
    const payload = {
      bloques: [
        {
          serviceId: "11111111-1111-4111-8111-111111111111",
          slotId: "11111111-1111-4111-8111-222222222222",
          fecha: "2026-10-09",
        },
      ],
      personas: 2,
      acompañantes: [{ fullName: "Ana García", document: "12345678" }],
    };

    expect(() => createReservationSchema.parse(payload)).not.toThrow();
    expect(createReservationSchema.parse(payload).bloques).toHaveLength(1);
  });
});
