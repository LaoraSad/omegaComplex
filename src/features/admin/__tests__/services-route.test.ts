import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/features/admin/admin.repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/admin/admin.repository")>()),
  createService: mocks.createService,
  updateService: mocks.updateService,
}));

import { POST as postServicios } from "@/app/api/services/route";
import { PATCH as patchServicio } from "@/app/api/services/[id]/route";

const SESION_ADMIN = { userId: "admin-1", role: "admin" } as const;

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const NUEVO = {
  categoryId: "11111111-1111-4111-8111-111111111111",
  name: "Cancha Nueva",
  price: 30000,
  capacity: 14,
};

describe("POST /api/services", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sin sesión responde 401", async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await postServicios(jsonRequest("http://x/api/services", "POST", NUEVO));

    expect(res.status).toBe(401);
    expect(mocks.createService).not.toHaveBeenCalled();
  });

  it("cuerpo inválido responde 400 sin crear", async () => {
    mocks.getSession.mockResolvedValue(SESION_ADMIN);

    const res = await postServicios(
      jsonRequest("http://x/api/services", "POST", { ...NUEVO, price: -5 }),
    );

    expect(res.status).toBe(400);
    expect(mocks.createService).not.toHaveBeenCalled();
  });

  it("válido crea con 201", async () => {
    mocks.getSession.mockResolvedValue(SESION_ADMIN);
    mocks.createService.mockResolvedValue({ id: "svc-1", slug: "cancha-nueva" });

    const res = await postServicios(jsonRequest("http://x/api/services", "POST", NUEVO));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(mocks.createService).toHaveBeenCalledWith(NUEVO);
    expect(body.data).toMatchObject({ slug: "cancha-nueva" });
  });
});

describe("PATCH /api/services/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sin sesión responde 401", async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await patchServicio(
      jsonRequest("http://x/api/services/svc-1", "PATCH", { price: 35000 }),
      { params: Promise.resolve({ id: "svc-1" }) },
    );

    expect(res.status).toBe(401);
    expect(mocks.updateService).not.toHaveBeenCalled();
  });

  it("válido actualiza con 200", async () => {
    mocks.getSession.mockResolvedValue(SESION_ADMIN);
    mocks.updateService.mockResolvedValue({ id: "svc-1", price: 35000 });

    const res = await patchServicio(
      jsonRequest("http://x/api/services/svc-1", "PATCH", { price: 35000 }),
      { params: Promise.resolve({ id: "svc-1" }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.updateService).toHaveBeenCalledWith("svc-1", { price: 35000 });
    expect(body.data).toMatchObject({ price: 35000 });
  });
});
