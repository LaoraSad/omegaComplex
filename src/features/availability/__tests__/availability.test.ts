import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import { bogotaDayBounds, bogotaDayOfWeek } from "../availability.repository";

describe("bogotaDayBounds", () => {
  it("devuelve el rango [start, end) del día en UTC (Bogotá = UTC-5)", () => {
    const { start, end } = bogotaDayBounds("2026-10-10");
    expect(start.toISOString()).toBe("2026-10-10T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-11T05:00:00.000Z");
  });

  it("rechaza fechas inválidas", () => {
    expect(() => bogotaDayBounds("no-fecha")).toThrow("Fecha inválida");
  });
});

describe("bogotaDayOfWeek", () => {
  it("mapea 0=domingo y avanza de a uno (2026-01-04 fue domingo)", () => {
    expect(bogotaDayOfWeek("2026-01-04")).toBe(0);
    expect(bogotaDayOfWeek("2026-01-05")).toBe(1);
    expect(bogotaDayOfWeek("2026-01-10")).toBe(6);
  });
});
