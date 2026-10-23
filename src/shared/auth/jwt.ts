// -----------------------------------------------------------------------------
// src/shared/auth/jwt.ts
// Creación y verificación de JWT (JSON Web Tokens) usando la librería jose.
// Los JWT contienen userId, role y tv (tokenVersion) para soportar revocación.
// -----------------------------------------------------------------------------

import { SignJWT, jwtVerify } from "jose";

// -----------------------------------------------------------------------------
// getSecret()
// Obtiene la clave secreta de firma desde la variable de entorno JWT_SECRET.
// Si no está configurada, lanza un error para evitar firmar con una clave vacía.
// Devuelve la clave como Uint8Array (requerido por jose).
// -----------------------------------------------------------------------------
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return new TextEncoder().encode(secret);
}

// -----------------------------------------------------------------------------
// JwtPayload (tipo)
// Estructura del contenido (payload) del JWT:
//   userId: id del usuario en la base de datos.
//   role: rol del usuario ("user" | "admin" | "employee").
//   tv: tokenVersion vigente en el momento de emitir el token.
//       Se usa para revocación: si el usuario cambia su contraseña o correo,
//       tokenVersion se incrementa en BD y todos los JWT existentes con tv
//       anterior dejan de ser válidos.
// -----------------------------------------------------------------------------
export type JwtPayload = {
  userId: string;
  role: "user" | "admin" | "employee";
  /** Versión vigente al emitir: si la BD tiene otra, el token está revocado. */
  tv: number;
};

// -----------------------------------------------------------------------------
// createToken(payload)
// Firma un nuevo JWT con los datos del usuario.
//   - userId, role, tv se incluyen en el payload.
//   - Header: alg HS256.
//   - IssuedAt: momento de emisión.
//   - ExpirationTime: 7 días.
//   - Firma con la clave secreta de JWT_SECRET.
// Devuelve el string del JWT firmado.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// verifyToken(token)
// Verifica la firma y expiración de un JWT.
//   1. Descompone y valida la firma con jwtVerify usando JWT_SECRET.
//   2. Valida que el payload tenga los campos esperados:
//        userId debe ser string.
//        role debe ser uno de los valores permitidos.
//        tv debe ser un número.
//   3. Si algo falta o es inválido, lanza Error("JWT inválido").
//   4. Si es válido, devuelve el payload tipado { userId, role, tv }.
// -----------------------------------------------------------------------------
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
