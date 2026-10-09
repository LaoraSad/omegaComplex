// Acceso a variables de entorno.
// Cada valor se resuelve al leerlo (getter), no al importar el modulo: asi el
// build y los tests no exigen claves que solo hacen falta en runtime.
// La validación sigue siendo estricta en produccion.

function required(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

/** Igual que required, pero falla siempre: para claves que no admiten build. */
function always(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

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
    return required("N8N_WEBHOOK_URL");
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