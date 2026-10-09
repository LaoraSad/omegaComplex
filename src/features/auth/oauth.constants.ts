// Datos puros del flujo OAuth con Google. Sin dependencias de servidor: este
// archivo se importa tanto desde las rutas como desde componentes de cliente.

export const GOOGLE_PROVIDER = "google";
export const OAUTH_STATE_COOKIE = "oauth_google_state";

/** Motivos de fallo que el login recibe por redirect. */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_no_configurado:
    "El acceso con Google todavía no está habilitado. Usa tu correo y contraseña.",
  oauth_cancelado: "Cancelaste el acceso con Google.",
  oauth_estado_invalido: "La solicitud de Google no se pudo validar. Intenta de nuevo.",
  oauth_fallido: "No se pudo completar el acceso con Google. Intenta de nuevo.",
  oauth_sin_correo: "Google no devolvió un correo, no se pudo crear la cuenta.",
  oauth_cuenta_inactiva: "Esta cuenta está desactivada. Contacta al administrador.",
};

/** Traduce el param ?error= a un mensaje legible, o null si no hay error. */
export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return OAUTH_ERROR_MESSAGES[code] ?? "No se pudo completar el acceso con Google.";
}