import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return new TextEncoder().encode(secret);
}

export type JwtPayload = {
  userId: string;
  role: "user" | "admin" | "employee";
  /** Versión vigente al emitir: si la BD tiene otra, el token está revocado. */
  tv: number;
};

export async function createToken(payload: JwtPayload) {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    tv: payload.tv,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());

  if (
    typeof payload.userId !== "string" ||
    !["user", "admin", "employee"].includes(String(payload.role)) ||
    typeof payload.tv !== "number"
  ) {
    throw new Error("JWT inválido");
  }

  return {
    userId: payload.userId,
    role: payload.role as JwtPayload["role"],
    tv: payload.tv,
  };
}
