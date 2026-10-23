import { cookies } from "next/headers";

import {
  createUserFromOAuth,
  findOAuthAccount,
  findUserByEmail,
  linkOAuthAccount,
  type OAuthProfile,
} from "@/features/auth/oauth.repository";
import { GOOGLE_PROVIDER, OAUTH_STATE_COOKIE, destinoOAuth } from "@/features/auth/oauth.constants";
import {
  googleConfigured,
  googleRedirectUri,
  homeFor,
  startSession,
} from "@/features/auth/oauth.helpers";
import { appUrl } from "@/shared/lib/app-url";
import { logger } from "@/shared/lib/logger";
import { enviarEvento } from "@/shared/integrations/n8n";

// ---------------------------------------------------------------------------
// Paso 2 del acceso con Google: Google devuelve el codigo de autorizacion.
//
//   GET /api/auth/oauth/google/callback?code=...&state=...
//
// Este archivo resuelve:
//   - el state anti-CSRF contra la cookie
//   - el canje del codigo por token y la lectura del perfil
//   - el login de quien ya venia con Google
//   - vincular la cuenta de Google a un registro manual del mismo correo
//   - crear User + Customer + OAuthAccount si es la primera vez
//   - abrir la sesion y redirigir segun el rol
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Las redirecciones se arman con el dominio publico, no con `request.url`:
  // dentro del contenedor ese host es `0.0.0.0:3000` (y con nginx/PM2 Next usa
  // igual el HOSTNAME interno), asi que el navegador terminaba en
  // https://0.0.0.0:3000 y lo rechazaba con ERR_SSL_PROTOCOL_ERROR.
  const back = (reason: string) =>
    Response.redirect(appUrl(`/login?error=${reason}`), 302);

  if (!googleConfigured()) return back("oauth_no_configurado");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  if (url.searchParams.get("error")) return back("oauth_cancelado");

  // El state es la proteccion contra CSRF: si no cuadra, la llamada no viene
  // del flujo que iniciamos.
  if (!code || !state || !expectedState || state !== expectedState) {
    return back("oauth_estado_invalido");
  }

  let profile: OAuthProfile;
  try {
    profile = await exchangeGoogleCode(code);
  } catch (error) {
    logger.error("oauth.canje_fallido", { error });
    return back("oauth_fallido");
  }

  if (!profile?.email) return back("oauth_sin_correo");

  // 1. Ya venia con esta cuenta de Google.
  const existing = await findOAuthAccount(GOOGLE_PROVIDER, profile.providerAccountId);
  if (existing) {
    if (!existing.role) return back("oauth_cuenta_inactiva");
    // P1-4: desactivado no entra; sin verificar no se abre sesión.
    const puerta = destinoOAuth({
      role: existing.role,
      isActive: existing.isActive,
      emailVerified: existing.emailVerified,
      email: existing.email,
    });
    if (!puerta.abrirSesion) {
      return Response.redirect(appUrl(puerta.destino), 302);
    }
    await startSession(existing.id, existing.role);
    return Response.redirect(appUrl(homeFor(existing.role)), 302);
  }

  // 2. El correo ya existe de un registro manual: se vincula a esa misma cuenta
  //    en vez de crear una segunda (una persona, una cuenta).
  const byEmail = await findUserByEmail(profile.email);
  const user = byEmail
    ? await linkOAuthAccount(byEmail.id, GOOGLE_PROVIDER, profile)
    : await createUserFromOAuth(GOOGLE_PROVIDER, profile);

  // Se le avisa a n8n para que mande el correo de bienvenida. Si Google no
  // garantiza el correo, la cuenta sigue pendiente: se pide también el código
  // de verificación propio, igual que en el registro manual.
  await notificarAltaConGoogle(user, profile.emailVerified);

  // P1-4: sin verificación de Google no se abre sesión: va a /verify-email,
  // donde pide el código por reenvío como cualquier registro manual.
  const puerta = destinoOAuth({
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    email: user.email,
  });
  if (!puerta.abrirSesion) {
    return Response.redirect(appUrl(puerta.destino), 302);
  }
  await startSession(user.id, user.role);
  return Response.redirect(appUrl(homeFor(user.role)), 302);
}

/**
 * Reporta el alta a n8n. No bloquea el acceso: si el workflow falla, el evento
 * se pierde y queda registrado, pero el usuario ya tiene sesión abierta.
 */
async function notificarAltaConGoogle(
  user: { email: string; firstName: string },
  verificadoPorGoogle: boolean,
): Promise<void> {
  await enviarEvento("usuario.registrado", {
    canal: "google",
    email: user.email,
    nombre: user.firstName,
    emailVerificado: verificadoPorGoogle,
    // Si Google no lo verificó, n8n manda el código de verificación nuestro.
    requiereCodigo: !verificadoPorGoogle,
  });
}

/**
 * Canjea el código de autorización por un token de acceso y lee el perfil.
 *
 * Son dos llamadas: primero la de Google que convierte el `code` (de un solo
 * uso y de vida corta) en un token, y después la que trae los datos del usuario.
 *
 * El `redirect_uri` tiene que ser idéntico al que se mandó en la solicitud y al
 * que esté registrado en Google Cloud; si difiere aunque sea en una barra final,
 * Google responde `redirect_uri_mismatch`.
 */
async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    // El cuerpo de Google sí trae `error` y `error_description` legibles. Se
    // registra el motivo, nunca el `code` ni el token.
    const detalle = (await tokenRes.json().catch(() => null)) as {
      error?: string;
      error_description?: string;
    } | null;
    throw new Error(
      `token: ${detalle?.error ?? tokenRes.status} ${detalle?.error_description ?? ""}`.trim(),
    );
  }

  const { access_token: accessToken } = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!accessToken) {
    throw new Error("Google no devolvió un token de acceso");
  }

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!infoRes.ok) {
    throw new Error(`userinfo: ${infoRes.status}`);
  }

  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  };

  if (!info.sub || !info.email) {
    throw new Error("El perfil de Google no trae sub o email");
  }

  return {
    providerAccountId: info.sub,
    email: info.email,
    firstName: info.given_name ?? info.name ?? "",
    lastName: info.family_name ?? "",
    // Google solo afirma `true` cuando el correo pasó su propia verificación.
    // Si no lo dice, la cuenta queda pendiente y entra nuestro código.
    emailVerified: info.email_verified === true,
  };
}