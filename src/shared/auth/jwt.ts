import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET no está configurado");
}

const JWT_SECRET = new TextEncoder().encode(secret);

export type JwtPayload = {
  userId: string;
  role: "user" | "admin" | "employee";
};

export async function createToken(payload: JwtPayload) {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);

  if (
    typeof payload.userId !== "string" ||
    !["user", "admin", "employee"].includes(String(payload.role))
  ) {
    throw new Error("JWT inválido");
  }

  return {
    userId: payload.userId,
    role: payload.role as JwtPayload["role"],
  };
}
