import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import {
  agregarOcupacion,
  agregarReservasPorEstado,
  construirSerieDiaria,
} from "../admin.repository";

describe("agregarReservasPorEstado", () => {
  it("suma por estado y total general", () => {
    const result = agregarReservasPorEstado([
      { status: "confirmed", _count: { status: 5 } },
      { status: "pending_payment", _count: { status: 2 } },
    ]);
    expect(result).toEqual({
      reservationsByStatus: { confirmed: 5, pending_payment: 2 },
      totalReservations: 7,
    });
  });

  it("con cero grupos devuelve ceros", () => {
    expect(agregarReservasPorEstado([])).toEqual({ reservationsByStatus: {}, totalReservations: 0 });
  });
});

describe("agregarOcupacion", () => {
  const svc = (id: string, name: string) => ({ id, name });

  it("suma booked + held como usados y ordena por ocupación desc", () => {
    const { occupancyToday, occupancyByService } = agregarOcupacion([
      { capacity: 100, bookedCount: 60, heldCount: 10, service: svc("a", "Piscina") },
      { capacity: 20, bookedCount: 2, heldCount: 0, service: svc("b", "Turco") },
      { capacity: 100, bookedCount: 10, heldCount: 0, service: svc("a", "Piscina") },
    ]);
    expect(occupancyToday).toEqual({ used: 82, total: 220 });
    expect(occupancyByService.map((s) => s.serviceId)).toEqual(["a", "b"]);
    expect(occupancyByService[0]).toMatchObject({ used: 80, total: 200 });
  });

  it("sin franjas devuelve nulo y lista vacía", () => {
    expect(agregarOcupacion([])).toEqual({ occupancyToday: null, occupancyByService: [] });
  });
});

describe("construirSerieDiaria", () => {
  // 2026-10-10 12:00 COT: la ventana de 14 días cubre 2026-09-27..2026-10-10.
  const ahora = new Date("2026-10-10T17:00:00Z");

  it("arma 14 buckets y cuenta total/confirmados por día", () => {
    const serie = construirSerieDiaria(
      [
        { createdAt: new Date("2026-10-10T13:00:00Z"), status: "confirmed" },
        { createdAt: new Date("2026-10-10T14:00:00Z"), status: "pending_payment" },
        { createdAt: new Date("2026-10-09T15:00:00Z"), status: "used" },
        { createdAt: new Date("2026-09-01T15:00:00Z"), status: "confirmed" },
      ],
      ahora,
    );
    expect(serie).toHaveLength(14);
    expect(serie[0].date).toBe("2026-09-27");
    expect(serie[13]).toMatchObject({ date: "2026-10-10", total: 2, confirmed: 1 });
    expect(serie[12]).toMatchObject({ date: "2026-10-09", total: 1, confirmed: 1 });
    // Fuera de ventana (1 sep) no aparece en ningún bucket.
    expect(serie.reduce((sum, d) => sum + d.total, 0)).toBe(3);
  });
});
