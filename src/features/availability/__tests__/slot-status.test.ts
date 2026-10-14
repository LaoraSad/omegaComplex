import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import { estadoDeSlot } from "../availability.repository";

// now = 2026-10-14 10:00 Bogotá.
const AHORA = new Date("2026-10-14T15:00:00.000Z");

describe("estadoDeSlot (P2-1: pasado = ya empezó)", () => {
  it("franja iniciada hace 1 minuto es past aunque termine en el futuro", () => {
    // Regresión: antes solo era past si ya había terminado y se mostraba
    // disponible, pero la escritura la rechazaba.
    expect(estadoDeSlot(new Date("2026-10-14T14:59:00.000Z"), 5, AHORA)).toBe("past");
  });

  it("franja futura con cupos es available", () => {
    expect(estadoDeSlot(new Date("2026-10-14T16:00:00.000Z"), 5, AHORA)).toBe("available");
  });

  it("franja futura sin cupos es full", () => {
    expect(estadoDeSlot(new Date("2026-10-14T16:00:00.000Z"), 0, AHORA)).toBe("full");
  });

  it("franja terminada es past", () => {
    expect(estadoDeSlot(new Date("2026-10-14T13:00:00.000Z"), 5, AHORA)).toBe("past");
  });
});
