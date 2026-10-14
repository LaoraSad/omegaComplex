import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "../auth.schemas";

describe("updateProfileSchema", () => {
  it("acepta solo teléfono", () => {
    const result = updateProfileSchema.safeParse({ phone: "+573001234567" });
    expect(result.success).toBe(true);
  });

  it("acepta solo correo y lo normaliza", () => {
    const result = updateProfileSchema.safeParse({ email: "Nuevo@Ejemplo.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("nuevo@ejemplo.com");
    }
  });

  it("rechaza cuerpo vacío", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza documento y nacimiento aunque se envíen (33-H no editables)", () => {
    expect(updateProfileSchema.safeParse({ phone: "+573001234567", document: "123" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ email: "a@b.com", birthDate: "1990-01-01" }).success).toBe(false);
  });

  it("rechaza correo inválido y teléfono con pocos dígitos", () => {
    expect(updateProfileSchema.safeParse({ email: "no-es-email" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ phone: "123" }).success).toBe(false);
  });
});
