import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import {
  agregarIngresos,
  agregarReservasPorRango,
  sanearRangoMetricas,
} from "../admin.repository";

// 2026-10-14 07:00 COT: hoy es 2026-10-14 en Bogotá.
const AHORA = new Date("2026-10-14T12:00:00Z");

describe("sanearRangoMetricas", () => {
  it("sin fechas devuelve los últimos 30 días", () => {
    const r = sanearRangoMetricas(undefined, undefined, AHORA);
    expect(r.desdeKey).toBe("2026-09-15");
    expect(r.hastaKey).toBe("2026-10-14");
    expect(r.start).toEqual(new Date("2026-09-15T05:00:00.000Z"));
    expect(r.end).toEqual(new Date("2026-10-15T05:00:00.000Z"));
  });

  it("ordena invertidas y descarta inválidas", () => {
    const r = sanearRangoMetricas("2026-10-10", "2026-10-01", AHORA);
    expect(r.desdeKey).toBe("2026-10-01");
    expect(r.hastaKey).toBe("2026-10-10");

    const invalido = sanearRangoMetricas("no-fecha", "2026-10-05", AHORA);
    expect(invalido.hastaKey).toBe("2026-10-05");
    // Inválida cae al valor por defecto (hoy − 29), no arrastra el hasta.
    expect(invalido.desdeKey).toBe("2026-09-15");
  });

  it("acota tramos mayores a 90 días por el inicio", () => {
    const r = sanearRangoMetricas("2026-01-01", "2026-10-14", AHORA);
    expect(r.desdeKey).toBe("2026-07-17");
    expect(r.hastaKey).toBe("2026-10-14");
  });
});

describe("agregarIngresos", () => {
  const fila = (amountCop: number, id: string, name: string, category: string) => ({
    amountCop,
    reservation: { service: { id, name, category: { name: category } } },
  });

  it("suma total y desglosa por servicio y categoría en desc", () => {
    const result = agregarIngresos([
      fila(24000, "a", "Piscina", "Acuático"),
      fila(10000, "b", "Cancha", "Deportes"),
      fila(6000, "a", "Piscina", "Acuático"),
    ]);
    expect(result.totalIngresosCop).toBe(40000);
    expect(result.ingresosPorServicio.map((s) => s.serviceId)).toEqual(["a", "b"]);
    expect(result.ingresosPorServicio[0]).toMatchObject({ totalCop: 30000 });
    expect(result.ingresosPorCategoria).toEqual([
      { categoryName: "Acuático", totalCop: 30000 },
      { categoryName: "Deportes", totalCop: 10000 },
    ]);
  });

  it("sin pagos devuelve ceros y listas vacías", () => {
    expect(agregarIngresos([])).toEqual({
      totalIngresosCop: 0,
      ingresosPorServicio: [],
      ingresosPorCategoria: [],
    });
  });
});

describe("agregarReservasPorRango", () => {
  const fila = (id: string, name: string, category: string) => ({
    service: { id, name, category: { name: category } },
  });

  it("cuenta total y por servicio/categoría en desc", () => {
    const result = agregarReservasPorRango([
      fila("a", "Piscina", "Acuático"),
      fila("b", "Cancha", "Deportes"),
      fila("a", "Piscina", "Acuático"),
    ]);
    expect(result.totalReservas).toBe(3);
    expect(result.reservasPorServicio.map((s) => s.serviceId)).toEqual(["a", "b"]);
    expect(result.reservasPorCategoria).toEqual([
      { categoryName: "Acuático", total: 2 },
      { categoryName: "Deportes", total: 1 },
    ]);
  });

  it("sin reservas devuelve ceros", () => {
    expect(agregarReservasPorRango([])).toEqual({
      totalReservas: 0,
      reservasPorServicio: [],
      reservasPorCategoria: [],
    });
  });
});
