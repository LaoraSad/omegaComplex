import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  category: { findUnique: vi.fn() },
  service: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  serviceSlot: { findMany: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { createService, setServiceActive, updateService } from "../admin.repository";

describe("CRUD de servicios (Fase 1)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.$transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb({ service: dbMock.service, serviceSlot: dbMock.serviceSlot }),
    );
    dbMock.category.findUnique.mockResolvedValue({ id: "cat-1" });
    dbMock.service.findFirst.mockResolvedValue(null);
    dbMock.serviceSlot.findMany.mockResolvedValue([]);
  });

  it("crea con slug derivado, activo y sin imagen por defecto", async () => {
    dbMock.service.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "svc-1",
        ...data,
      }),
    );

    const r = await createService({
      categoryId: "cat-1",
      name: "Cancha Nueva",
      price: 30000,
      capacity: 14,
    });

    expect(dbMock.service.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Cancha Nueva",
        slug: "cancha-nueva",
        price: 30000,
        capacity: 14,
        imagen: null,
        isActive: true,
      }),
    });
    expect(r).toMatchObject({ slug: "cancha-nueva" });
  });

  it("no crea sin categoría o con nombre duplicado", async () => {
    dbMock.category.findUnique.mockResolvedValue(null);
    await expect(
      createService({ categoryId: "nope", name: "X", price: 1, capacity: 1 }),
    ).rejects.toThrow("categoría");

    dbMock.category.findUnique.mockResolvedValue({ id: "cat-1" });
    dbMock.service.findFirst.mockResolvedValue({ id: "otro" });
    await expect(
      createService({ categoryId: "cat-1", name: "Cancha Nueva", price: 1, capacity: 1 }),
    ).rejects.toThrow("Ya existe");
    expect(dbMock.service.create).not.toHaveBeenCalled();
  });

  it("no baja capacidad bajo lo vendido en franjas futuras", async () => {
    dbMock.service.findUnique.mockResolvedValue({ id: "svc-1", capacity: 14 });
    dbMock.serviceSlot.findMany.mockResolvedValue([{ bookedCount: 2, heldCount: 1 }]);

    await expect(updateService("svc-1", { capacity: 2 })).rejects.toThrow("más cupos vendidos");
    expect(dbMock.service.update).not.toHaveBeenCalled();
  });

  it("capacidad válida actualiza servicio y franjas futuras", async () => {
    dbMock.service.findUnique.mockResolvedValue({ id: "svc-1", capacity: 14 });
    dbMock.serviceSlot.findMany.mockResolvedValue([{ bookedCount: 2, heldCount: 1 }]);
    dbMock.service.update.mockResolvedValue({ id: "svc-1", capacity: 10 });

    await updateService("svc-1", { capacity: 10 });

    expect(dbMock.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: expect.objectContaining({ capacity: 10 }),
    });
    expect(dbMock.serviceSlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { capacity: 10 } }),
    );
  });

  it("renombrar recalcula el slug e ignora el propio registro", async () => {
    dbMock.service.findUnique.mockResolvedValue({ id: "svc-1", capacity: 14 });
    dbMock.service.findFirst.mockResolvedValue(null);
    dbMock.service.update.mockResolvedValue({});

    await updateService("svc-1", { name: "Cancha Uno" });

    expect(dbMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "svc-1" } }) }),
    );
    expect(dbMock.service.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "cancha-uno" }) }),
    );
  });

  it("activar/desactivar exige que exista y no toca reservas", async () => {
    dbMock.service.findUnique.mockResolvedValue(null);
    await expect(setServiceActive("nope", false)).rejects.toThrow("no existe");

    dbMock.service.findUnique.mockResolvedValue({ id: "svc-1" });
    await setServiceActive("svc-1", false);
    expect(dbMock.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: { isActive: false },
    });
  });
});
