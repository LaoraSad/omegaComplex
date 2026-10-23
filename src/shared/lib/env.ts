// -----------------------------------------------------------------------------
// src/shared/lib/env.ts
// Acceso tipado y seguro a variables de entorno.
// Los valores se resuelven al leerlos (getter), no al importar el módulo, para
// que el build y los tests no fallen por claves que solo se necesitan en runtime.
// La validación es estricta en producción.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// required(name, fallback)
// Obtiene una variable de entorno. En producción, si falta, lanza error.
// En desarrollo acepta fallback (vacío por defecto) para no romper el build.
// -----------------------------------------------------------------------------
function required(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

// -----------------------------------------------------------------------------
// always(name, fallback)
// Igual que required, pero lanza error siempre (no solo en producción).
// Para claves que son obligatorias incluso en build/test.
// -----------------------------------------------------------------------------
function always(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

// -----------------------------------------------------------------------------
// env (exportación principal)
// Objeto con getters para cada variable de entorno usada por la app:
//   DATABASE_URL        -> Conexión PostgreSQL (con connection_limit recomendado)
//   JWT_SECRET          -> Clave para firmar JWT (obligatoria siempre)
//   STRIPE_SECRET_KEY   -> Clave secreta de Stripe (servidor)
//   STRIPE_WEBHOOK_SECRET -> Secreto para validar firmas de webhooks de Stripe
//   NEXT_PUBLIC_APP_URL -> URL pública de la app (usada en enlaces de correo y Stripe)
//   N8N_WEBHOOK_URL     -> Webhook de n8n para envío de correos
//   N8N_WEBHOOK_SECRET  -> Secreto compartido con n8n (HMAC)
//   GOOGLE_CLIENT_ID    -> ID de cliente de Google OAuth
//   GOOGLE_CLIENT_SECRET -> Secreto de cliente de Google OAuth
// -----------------------------------------------------------------------------
export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get JWT_SECRET() {
    return always("JWT_SECRET");
  },
  get STRIPE_SECRET_KEY() {
    return required("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get NEXT_PUBLIC_APP_URL() {
    return required("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
  get N8N_WEBHOOK_URL() {
    return required("N8N_WEBWEB_URL");
  },
  get N8N_WEBHOOK_SECRET() {
    return required("N8N_WEBHOOK_SECRET");
  },
  get GOOGLE_CLIENT_ID() {
    return required("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return required("GOOGLE_CLIENT_SECRET");
  },
} as const;
