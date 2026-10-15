import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    createUserWithCustomer: vi.fn(),
    findCustomerByDocument: vi.fn(),
    findRoleByName: vi.fn(),
    findUserByEmail: vi.fn(),
  },
  createSession: vi.fn(),
  issueVerificationCode: vi.fn(),
  verificarLimiteIntentos: vi.fn(),
  registrarIntento: vi.fn(),
}));

vi.mock("../auth.repository", () => mocks.repository);
vi.mock("@/shared/auth/session", () => ({ createSession: mocks.createSession }));
vi.mock("../email-flow.service", () => ({ issueVerificationCode: mocks.issueVerificationCode }));
// El límite de intentos tiene su propio archivo de pruebas; aquí solo hace falta
// que no toque la base de datos real.
vi.mock("../login-rate-limit", () => ({
  verificarLimiteIntentos: mocks.verificarLimiteIntentos,
  registrarIntento: mocks.registrarIntento,
}));

import { login, register } from "../auth.service";

const password = "Password123";
const newUser = {
  id: "user-1",
  email: "client@example.com",
  firstName: "Ana",
  lastName: "Lopez",
  phone: "+573001234567",
  role: { name: "user" },
  emailVerified: false,
};

describe("auth service email verification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createSession.mockResolvedValue(undefined);
    mocks.issueVerificationCode.mockResolvedValue(undefined);
  });

  it("creates a new account as unverified, sends a code, and does not start a session", async () => {
    mocks.repository.findUserByEmail.mockResolvedValue(null);
    mocks.repository.findCustomerByDocument.mockResolvedValue(null);
    mocks.repository.findRoleByName.mockResolvedValue({ id: "role-user" });
    mocks.repository.createUserWithCustomer.mockResolvedValue(newUser);

    const result = await register({
      email: newUser.email,
      password,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      document: "1020304050",
      phone: newUser.phone,
      birthDate: "1990-05-15",
    });

    expect(result).toEqual({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: "user",
      emailVerified: false,
      verificationEmailSent: true,
    });
    expect(mocks.issueVerificationCode).toHaveBeenCalledWith({ id: newUser.id, email: newUser.email });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates the account without the verification flag set, so it must be confirmed", async () => {
    mocks.repository.findUserByEmail.mockResolvedValue(null);
    mocks.repository.findCustomerByDocument.mockResolvedValue(null);
    mocks.repository.findRoleByName.mockResolvedValue({ id: "role-user" });
    mocks.repository.createUserWithCustomer.mockResolvedValue(newUser);

    await register({
      email: newUser.email,
      password,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      document: "1020304050",
      phone: newUser.phone,
      birthDate: "1990-05-15",
    });

    // El servicio no manda la Bandera: la pone el repositorio en false. Lo que
    // se comprueba aca es que no se abra sesion, que es lo que hacia falta para
    // que la cuenta quedara utilizable sin verificar.
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("blocks sign in while the email is unverified", async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    mocks.repository.findUserByEmail.mockResolvedValue({
      ...newUser,
      isActive: true,
      emailVerified: false,
      passwordHash,
    });

    await expect(login({ email: newUser.email, password })).rejects.toMatchObject({
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
    });
    // Lo importante: no se abre sesión aunque la contraseña sea correcta.
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("checks the password before revealing that the email is unverified", async () => {
    // Si se verificara antes, un atacante podría deducir qué correos tienen
    // cuenta probando contraseñas inventadas: es enumeración de cuentas.
    mocks.repository.findUserByEmail.mockResolvedValue({
      ...newUser,
      isActive: true,
      emailVerified: false,
      passwordHash: await bcrypt.hash("otraClaveDistinta", 4),
    });

    await expect(login({ email: newUser.email, password })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("allows a verified user to sign in normally", async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    mocks.repository.findUserByEmail.mockResolvedValue({
      ...newUser,
      isActive: true,
      emailVerified: true,
      passwordHash,
    });

    await expect(login({ email: newUser.email, password })).resolves.toMatchObject({
      email: newUser.email,
      role: "user",
    });
    expect(mocks.createSession).toHaveBeenCalledWith(newUser.id, "user");
  });
});