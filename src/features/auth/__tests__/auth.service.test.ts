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
}));

vi.mock("../auth.repository", () => mocks.repository);
vi.mock("@/shared/auth/session", () => ({ createSession: mocks.createSession }));
vi.mock("../email-flow.service", () => ({ issueVerificationCode: mocks.issueVerificationCode }));

import { login, register } from "../auth.service";

const password = "Password123";
const newUser = {
  id: "user-1",
  email: "client@example.com",
  firstName: "Ana",
  lastName: "Lopez",
  phone: "+573001234567",
  role: { name: "user" },
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

    expect(result).toEqual({ email: newUser.email, verificationEmailSent: true });
    expect(mocks.issueVerificationCode).toHaveBeenCalledWith({ id: newUser.id, email: newUser.email });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("allows an active user to sign in even when email verification is not enforced", async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    mocks.repository.findUserByEmail.mockResolvedValue({
      ...newUser,
      isActive: true,
      emailVerified: false,
      passwordHash,
    });

    await expect(login({ email: newUser.email, password })).resolves.toMatchObject({
      email: newUser.email,
      role: "user",
    });
    expect(mocks.createSession).toHaveBeenCalledWith(newUser.id, "user");
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