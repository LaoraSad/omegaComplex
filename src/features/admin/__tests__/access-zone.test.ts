import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import { buildAccessWhere } from "../admin.repository";
import { zonaDeAcceso } from "../admin.types";

describe("zona de acceso (P1-7: manda el bloque del QR)", () => {
  it("multizona muestra el servicio del bloque, no el de la reserva", () => {
    expect(
      zonaDeAcceso({
        qrToken: {
          block: { service: { name: "Piscina adultos" } },
          reservation: { service: { name: "Cancha 1" } },
        },
      }),
    ).toBe("Piscina adultos");
  });

  it("sin bloque (QR legacy) usa la reserva", () => {
    expect(
      zonaDeAcceso({
        qrToken: { block: null, reservation: { service: { name: "Cancha 1" } } },
      }),
    ).toBe("Cancha 1");
  });

  it("el filtro por servicio mira el bloque o la reserva legacy", () => {
    const where = buildAccessWhere({ serviceId: "svc-piscina" }) as {
      qrToken: { OR: unknown[] };
    };

    expect(where.qrToken.OR).toEqual([
      { block: { serviceId: "svc-piscina" } },
      { blockId: null, reservation: { serviceId: "svc-piscina" } },
    ]);
  });

  it("el filtro combina zona (bloque) y texto (reserva)", () => {
    const where = buildAccessWhere({ serviceId: "svc-1", q: "Ana" }) as {
      qrToken: { OR: unknown[]; reservation: { OR: unknown[] } };
    };

    expect(where.qrToken.OR).toHaveLength(2);
    expect(where.qrToken.reservation.OR).toHaveLength(3);
  });
});
