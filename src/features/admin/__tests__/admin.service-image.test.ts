import { describe, expect, it } from "vitest";

import { serviceCreateSchema, serviceUpdateSchema } from "../admin.schemas";

/**
 * El formulario de servicios manda `imagen: null` cuando la foto queda vacía,
 * porque en JavaScript `"" || null` es `null`. Con un schema que solo aceptaba
 * texto, Zod rechazaba la creación entera con
 * "Invalid input: expected string, received null".
 */
describe("imagen del servicio", () => {
  const base = {
    categoryId: "11111111-1111-4111-8111-111111111111",
    name: "Cancha Basketball full",
    description: "Superficie sintética",
    price: 70000,
    capacity: 10,
    isActive: true,
  };

  it("acepta null cuando no se elige foto", () => {
    const r = serviceCreateSchema.safeParse({ ...base, imagen: null });
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
  });

  it("acepta una ruta válida", () => {
    const r = serviceCreateSchema.safeParse({ ...base, imagen: "/newassets/cubierta.webp" });
    expect(r.success).toBe(true);
  });

  it("acepta cadena vacía y la deja en null", () => {
    const r = serviceCreateSchema.safeParse({ ...base, imagen: "   " });
    expect(r.success).toBe(true);
  });

  it("acepta que el campo ni siquiera venga", () => {
    const { imagen, ...sinFoto } = base;
    const r = serviceCreateSchema.safeParse(sinFoto);
    expect(r.success).toBe(true);
  });

  it("rechaza una ruta que no empiece por /", () => {
    const r = serviceCreateSchema.safeParse({ ...base, imagen: "newassets/cubierta.webp" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("empezar por /");
  });

  it("también lo acepta al actualizar", () => {
    const r = serviceUpdateSchema.safeParse({ imagen: null });
    expect(r.success).toBe(true);
  });
});