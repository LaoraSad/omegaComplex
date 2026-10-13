import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findQrByTokenHash: vi.fn(),
  grantAccess: vi.fn(),
  marcarQrExpirado: vi.fn(),
}));

vi.mock("../access.repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/access/access.repository")>()),
  findQrByTokenHash: mocks.findQrByTokenHash,
  grantAccess: mocks.grantAccess,
  marcarQrExpirado: mocks.marcarQrExpirado,
}));

import {
  confirmAccess,
  denyAccess,
  lookupAccess,
  recordDenial,
} from "../access.service";
import type { EmployeeForAccess, QrLookup } from "../access.repository";

const ZONA = { serviceId: "svc-1", serviceName: "Piscina adultos 1", categoryName: "Piscinas" };

const empleado: EmployeeForAccess = {
  id: "emp-1",
  isActive: true,
  userIsActive: true,
  zones: [ZONA],
};

function qrBase(overrides: Partial<QrLookup> = {}): QrLookup {
  const now = new Date();
  return {
    qrTokenId: "qr-1",
    seqNo: 1,
    qrStatus: "active",
    qrUsedAt: null,
    reservationId: "res-1",
    reservationStatus: "confirmed",
    reservationChannel: "online",
    reservationQuantity: 1,
    startsAt: new Date(now.getTime() - 30 * 60 * 1000),
    endsAt: new Date(now.getTime() + 30 * 60 * 1000),
    blockId: "bloque-1",
    customerFirstName: "Ana",
    customerLastName: "López",
    customerDocument: "12345",
    guestName: "Ana López",
    guestDocument: "12345",
    guestIsTitular: true,
    serviceId: "svc-1",
    serviceName: "Piscina adultos 1",
    categoryName: "Piscinas",
    accessCount: 0,
    ...overrides,
  };
}

/**
 * Reloj congelado para todo el archivo.
 *
 * `qrBase()` construye la franja como "media hora antes y media hora después de
 * ahora". Si la suite corre cerca de la medianoche, esa franja cruza el cambio de
 * día y el servicio responde `fecha_distinta` porque compara en America/Bogota.
 * Pasaba todos los días entre las 23:30 y la 00:30, según cuándo se ejecutara.
 *
 * Congelar el reloj para todo el archivo quita la causa en vez de tapar el
 * síntoma test por test.
 */
const HORA_FIJA = new Date("2026-06-15T18:30:00.000Z"); // 13:30 en Colombia

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(HORA_FIJA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lookupAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deniega si el empleado está inactivo sin consultar el QR", async () => {
    const result = await lookupAccess("token", { ...empleado, isActive: false });
    expect(result).toMatchObject({ outcome: "denied", denial: { code: "empleado_inactivo" } });
    expect(mocks.findQrByTokenHash).not.toHaveBeenCalled();
  });

  it("deniega QR inexistente", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(null);
    const result = await lookupAccess("falso", empleado);
    expect(result).toMatchObject({ outcome: "denied", denial: { code: "qr_invalido" } });
  });

  it("deniega reserva no confirmada pero devuelve la ficha", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase({ reservationStatus: "pending_payment" }));
    const result = await lookupAccess("t", empleado);
    expect(result.outcome).toBe("denied");
    expect(result).toMatchObject({ denial: { code: "reserva_no_confirmada" } });
    expect(result.reservation).toMatchObject({ customerName: "Ana López" });
  });

  it.each([
    ["usado", qrBase({ qrStatus: "used", qrUsedAt: new Date() }), "qr_ya_utilizado"],
    ["expirado", qrBase({ qrStatus: "expired" }), "qr_expirado"],
    ["con ingreso previo", qrBase({ accessCount: 1 }), "acceso_ya_registrado"],
  ])("deniega QR %s", async (_label, qr, code) => {
    mocks.findQrByTokenHash.mockResolvedValue(qr);
    const result = await lookupAccess("t", empleado);
    expect(result).toMatchObject({ outcome: "denied", denial: { code } });
  });

it("deniega fecha distinta, franja no iniciada y franja terminada", async () => {
      // El reloj ya viene congelado a nivel de archivo (ver HORA_FIJA).
      const now = new Date();

      mocks.findQrByTokenHash.mockResolvedValue(
        qrBase({
          startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        }),
      );
      await expect(lookupAccess("t", empleado)).resolves.toMatchObject({
        denial: { code: "fecha_distinta" },
      });

      mocks.findQrByTokenHash.mockResolvedValue(
        qrBase({
          startsAt: new Date(now.getTime() + 60 * 60 * 1000),
          endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        }),
      );
      await expect(lookupAccess("t", empleado)).resolves.toMatchObject({
        denial: { code: "franja_no_iniciada" },
      });

      mocks.findQrByTokenHash.mockResolvedValue(
        qrBase({
          startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          endsAt: new Date(now.getTime() - 60 * 60 * 1000),
        }),
      );
      await expect(lookupAccess("t", empleado)).resolves.toMatchObject({
        denial: { code: "franja_terminada" },
      });
      // El QR queda expirado para que el panel no lo muestre como activo.
      expect(mocks.marcarQrExpirado).toHaveBeenCalledWith("qr-1");
    });

  it("permite en zona y avisa fuera de zona sin denegar", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    const dentro = await lookupAccess("t", empleado);
    expect(dentro.outcome).toBe("allowed");
    expect(dentro).not.toHaveProperty("outsideEmployeeZone");

    mocks.findQrByTokenHash.mockResolvedValue(
      qrBase({ serviceId: "svc-9", serviceName: "Cancha", categoryName: "Canchas" }),
    );
    const fuera = await lookupAccess("t", empleado);
    expect(fuera.outcome).toBe("allowed");
    expect(fuera.outsideEmployeeZone?.reservationZone.serviceId).toBe("svc-9");
  });
});

describe("confirmAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("registra el ingreso cuando la consulta lo permite", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    mocks.grantAccess.mockResolvedValue({
      ok: true,
      accessId: "acc-1",
      accessedAt: new Date(),
    });

    const result = await confirmAccess({ rawToken: "t", employee: empleado });

    expect(result).toMatchObject({ ok: true, grant: { accessId: "acc-1" } });
    expect(mocks.grantAccess).toHaveBeenCalledWith({
      qrTokenId: "qr-1",
      employeeId: "emp-1",
      result: "allowed",
      denialReason: null,
    });
  });

  it("no registra nada si la consulta deniega", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase({ qrStatus: "used", qrUsedAt: new Date() }));
    const result = await confirmAccess({ rawToken: "t", employee: empleado });
    expect(result).toMatchObject({ ok: false, code: "qr_ya_utilizado" });
    expect(mocks.grantAccess).not.toHaveBeenCalled();
  });

  it("pierde la carrera si otro empleado consumió el QR primero", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    mocks.grantAccess.mockResolvedValue({ ok: false, reason: "qr_consumido" });
    const result = await confirmAccess({ rawToken: "t", employee: empleado });
    expect(result).toMatchObject({ ok: false, code: "qr_ya_utilizado" });
  });
});

describe("denyAccess", () => {
  it("registra la denegación y consume el QR", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    mocks.grantAccess.mockResolvedValue({ ok: true, accessId: "acc-1", accessedAt: new Date() });

    const result = await denyAccess({
      rawToken: "t",
      employee: empleado,
      reason: "La persona no coincide con la ficha",
    });

    expect(result).toEqual({
      ok: true,
      denial: {
        code: "denegado_por_empleado",
        message: "La persona no coincide con la ficha",
      },
    });
    // El QR se consume: si no, el mismo código rebotaría en otra puerta.
    expect(mocks.grantAccess).toHaveBeenCalledWith({
      qrTokenId: "qr-1",
      employeeId: "emp-1",
      result: "denied",
      denialReason: "La persona no coincide con la ficha",
      consumeQr: true,
    });
  });

  it("pone un motivo por defecto si el empleado no escribe ninguno", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    mocks.grantAccess.mockResolvedValue({ ok: true, accessId: "acc-2", accessedAt: new Date() });

    const result = await denyAccess({ rawToken: "t", employee: empleado, reason: "   " });
    expect(result.ok).toBe(true);
    expect(mocks.grantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ denialReason: "Denegado por el empleado en puerta." }),
    );
  });

  it("no hace nada si el empleado está inactivo", async () => {
    const result = await denyAccess({
      rawToken: "t",
      employee: { ...empleado, isActive: false },
      reason: "x",
    });
    expect(result).toMatchObject({ ok: false, code: "empleado_inactivo" });
    expect(mocks.grantAccess).not.toHaveBeenCalled();
  });

  it("avisa si otro empleado ya consumió el QR", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    mocks.grantAccess.mockResolvedValue({ ok: false, reason: "qr_consumido" });

    const result = await denyAccess({ rawToken: "t", employee: empleado, reason: "x" });
    expect(result).toMatchObject({ ok: false, code: "qr_ya_utilizado" });
  });
});

describe("ficha de la persona", () => {
  it("muestra a quien trae el QR, no al titular de la reserva", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(
      qrBase({
        customerFirstName: "Ana",
        customerLastName: "López",
        customerDocument: "12345",
        guestName: "Carlos Ruiz",
        guestDocument: "CC777",
        guestIsTitular: false,
      }),
    );

    const lookup = await lookupAccess("t", empleado);
    expect(lookup.outcome).toBe("allowed");
    expect(lookup.reservation?.personName).toBe("Carlos Ruiz");
    expect(lookup.reservation?.personDocument).toBe("CC777");
    expect(lookup.reservation?.personIsTitular).toBe(false);
    // El titular sigue visible: el empleado puede contrastar con la reserva.
    expect(lookup.reservation?.customerName).toBe("Ana López");
  });
});

describe("franja que todavía no empieza", () => {
  it("dice que espere en vez de simplemente denegar", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(
      qrBase({
        startsAt: new Date(HORA_FIJA.getTime() + 60 * 60_000),
        endsAt: new Date(HORA_FIJA.getTime() + 120 * 60_000),
      }),
    );

    const lookup = await lookupAccess("t", empleado);
    expect(lookup.outcome).toBe("denied");
    expect(lookup.denial?.code).toBe("franja_no_iniciada");
    expect(lookup.denial?.message).toContain("esperar");
    // La ficha viaja igual: el empleado ve de quién es el código.
    expect(lookup.reservation?.personName).toBe("Ana López");
  });
});

describe("recordDenial", () => {
  it("registra el intento denegado y no hace nada sin QR", async () => {
    mocks.findQrByTokenHash.mockResolvedValue(qrBase());
    await recordDenial({ rawToken: "t", employee: empleado, reason: "fuera de horario" });
    expect(mocks.grantAccess).toHaveBeenCalledWith({
      qrTokenId: "qr-1",
      employeeId: "emp-1",
      result: "denied",
      denialReason: "fuera de horario",
    });

    mocks.grantAccess.mockClear();
    mocks.findQrByTokenHash.mockResolvedValue(null);
    await recordDenial({ rawToken: "x", employee: empleado, reason: "qr falso" });
    expect(mocks.grantAccess).not.toHaveBeenCalled();
  });
});
