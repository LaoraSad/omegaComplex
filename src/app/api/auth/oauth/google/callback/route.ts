import { cookies } from "next/headers";

import {
  createUserFromOAuth,
  findOAuthAccount,
  findUserByEmail,
  linkOAuthAccount,
  type OAuthProfile,
} from "@/features/auth/oauth.repository";
import { GOOGLE_PROVIDER, OAUTH_STATE_COOKIE } from "@/features/auth/oauth.constants";
import { googleConfigured, homeFor, startSession } from "@/features/auth/oauth.helpers";

// ---------------------------------------------------------------------------
// Paso 2 del acceso con Google: Google devuelve el codigo de autorizacion.
//
//   GET /api/auth/oauth/google/callback?code=...&state=...
//
// Que resuelve este archivo (ya funciona):
//   - el state anti-CSRF contra la cookie
//   - el login de quien ya venia con Google
//   - vincular la cuenta de Google a un registro manual del mismo correo
//   - crear User + Customer + OAuthAccount si es la primera vez
//   - abrir la sesion y redirigir segun el rol
//
// LO QUE FALTA (le toca al equipo): exchangeGoogleCode() al final de este
// archivo. Hay que cambiar el codigo por un token de acceso contra
// https://oauth2.googleapis.com/token y leer el perfil en
// https://www.googleapis.com/oauth2/v3/userinfo. El ejemplo esta completo en el
// comentario de esa funcion.
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const back = (reason: string) =>
    Response.redirect(new URL(`/login?error=${reason}`, request.url), 302);

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
    console.error("[oauth] fallo al canjear el codigo de Google", error);
    return back("oauth_fallido");
  }

  if (!profile?.email) return back("oauth_sin_correo");

  // 1. Ya venia con esta cuenta de Google.
  const existing = await findOAuthAccount(GOOGLE_PROVIDER, profile.providerAccountId);
  if (existing) {
    if (!existing.role) return back("oauth_cuenta_inactiva");
    await startSession(existing.id, existing.role);
    return Response.redirect(new URL(homeFor(existing.role), request.url), 302);
  }

  // 2. El correo ya existe de un registro manual: se vincula a esa misma cuenta
  //    en vez de crear una segunda (una persona, una cuenta).
  const byEmail = await findUserByEmail(profile.email);
  const user = byEmail
    ? await linkOAuthAccount(byEmail.id, GOOGLE_PROVIDER, profile)
    : await createUserFromOAuth(GOOGLE_PROVIDER, profile);

  await startSession(user.id, user.role);
  return Response.redirect(new URL(homeFor(user.role), request.url), 302);
}

/**
 * PENDIENTE (le toca al equipo): canjear el codigo por un token de acceso y
 * leer el perfil. Es lo unico que falta para que el boton funcione.
 *
 *   const res = await fetch("https://oauth2.googleapis.com/token", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/x-www-form-urlencoded" },
 *     body: new URLSearchParams({
 *       code,
 *       client_id: process.env.GOOGLE_CLIENT_ID,
 *       client_secret: process.env.GOOGLE_CLIENT_SECRET,
 *       redirect_uri: googleRedirectUri(),
 *       grant_type: "authorization_code",
 *     }),
 *   });
 *   if (!res.ok) throw new Error(await res.text());
 *   const { access_token } = (await res.json()) as {
 *     access_token?: string;
 *     error?: string;
 *     error_description?: string;
 *   };
 *
 *   const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
 *     headers: { Authorization: `Bearer ${access_token}` },
 *   });
 *   if (!infoRes.ok) throw new Error(await infoRes.text());
 *   const info = (await infoRes.json()) as {
 *     sub?: string;
 *     email?: string;
 *     email_verified?: boolean;
 *     given_name?: string;
 *     family_name?: string;
 *     name?: string;
 *   };
 *
 *   return {
 *     providerAccountId: info.sub ?? "",
 *     email: info.email ?? "",
 *     firstName: info.given_name ?? info.name ?? "",
 *     lastName: info.family_name ?? "",
 *   };
 */
async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  // El `code` es de un solo uso y caduca en minutos: no se registra en logs.
  void code;
  throw new Error(
    "Falta implementar exchangeGoogleCode() en /api/auth/oauth/google/callback/route.ts",
  );
}