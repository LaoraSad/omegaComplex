import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { proxy } from "./proxy";

process.env.JWT_SECRET = "proxy-test-secret-con-mas-de-32-caracteres";

function req(pathname: string, token?: string) {
  return {
    cookies: { get: (name: string) => (name === "session" && token ? { value: token } : undefined) },
    nextUrl: { pathname, search: "" },
    url: `http://localhost${pathname}`,
  } as never;
}

async function token(role: string): Promise<string> {
  return new SignJWT({ userId: "u-1", role, tv: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

describe("proxy (P1-6: protección de rutas por rol)", () => {
  it("sin cookie redirige a /login con next", async () => {
    const res = await proxy(req("/admin"));

    expect(res.status).toBe(307);
    expect(String(res.headers.get("location"))).toContain("/login?next=%2Fadmin");
  });

  it("con token inválido redirige a /login", async () => {
    const res = await proxy(req("/validar", "basura"));

    expect(res.status).toBe(307);
    expect(String(res.headers.get("location"))).toContain("/login?next=");
  });

  it("cliente no entra a /admin ni /validar", async () => {
    const t = await token("user");

    expect((await proxy(req("/admin", t))).status).toBe(307);
    expect((await proxy(req("/validar", t))).status).toBe(307);
  });

  it("admin pasa a /admin y empleado a /validar", async () => {
    const admin = await proxy(req("/admin", await token("admin")));
    const emp = await proxy(req("/validar", await token("employee")));

    expect(admin.status).toBe(200);
    expect(emp.status).toBe(200);
  });

  it("/reservas exige solo sesión válida", async () => {
    const res = await proxy(req("/reservas", await token("user")));

    expect(res.status).toBe(200);
  });
});
