import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "../auth.schemas";

const validRegister = {
  email: "Cliente@Ejemplo.com",
  password: "Password123",
  firstName: "Carlos",
  lastName: "Pérez",
  document: "1020304050",
  phone: "+573001234567",
  birthDate: "1990-05-15",
};

describe("registerSchema", () => {
  it("acepta un registro válido y normaliza el email", () => {
    const result = registerSchema.safeParse(validRegister);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("cliente@ejemplo.com");
    }
  });

  it("rechaza email inválido, clave corta y documento ausente", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      email: "no-es-email",
      password: "corta",
      document: "",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza fecha de nacimiento futura", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const result = registerSchema.safeParse({
      ...validRegister,
      birthDate: tomorrow,
    });

    expect(result.success).toBe(false);
  });

  it("rechaza teléfono con pocos dígitos", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      phone: "123",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("acepta credenciales con formato válido", () => {
    const result = loginSchema.safeParse({
      email: "ADMIN@OmegaComplex.com",
      password: "admin123456",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@omegacomplex.com");
    }
  });

  it("rechaza clave vacía", () => {
    const result = loginSchema.safeParse({
      email: "a@b.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});
