import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findQrByTokenHash: vi.fn(),
  grantAccess: vi.fn(),
}));

vi.mock("../access.repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/access/access.repository")>()),
  findQrByTokenHash: mocks.findQrByTokenHash,
  grantAccess: mocks.grantAccess,
}));

import {
  confirmAccess,
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
    serviceId: "svc-1",
    serviceName: "Piscina adultos 1",
    categoryName: "Piscinas",
    accessCount: 0,
    ...overrides,
  };
}

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
