import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import { isPastDate } from "../reservations.service";

describe("isPastDate (P0-1: hoy nunca es pasado en America/Bogota)", () => {
  it("hoy no es pasado aunque ya hayan pasado las 00:00 de Bogotá", () => {
    // 10:00 en Bogotá del 2026-10-14.
    const ahora = new Date("2026-10-14T15:00:00.000Z");
    expect(isPastDate("2026-10-14", ahora)).toBe(false);
  });

  it("recién pasada la medianoche de Bogotá, hoy sigue sin ser pasado", () => {
    // 00:00:01 en Bogotá del 2026-10-14. Con el código anterior (00:00Z < now)
    // esto devolvía true y bloqueaba todo el día en curso.
    const ahora = new Date("2026-10-14T05:00:01.000Z");
    expect(isPastDate("2026-10-14", ahora)).toBe(false);
  });

  it("ayer sí es pasado", () => {
    const ahora = new Date("2026-10-14T15:00:00.000Z");
    expect(isPastDate("2026-10-13", ahora)).toBe(true);
  });

  it("mañana no es pasado, incluso de noche en Bogotá", () => {
    // 23:59 en Bogotá del 2026-10-13: el 14 todavía es futuro.
    const ahora = new Date("2026-10-14T04:59:00.000Z");
    expect(isPastDate("2026-10-14", ahora)).toBe(false);
    expect(isPastDate("2026-10-13", ahora)).toBe(false);
  });
});
