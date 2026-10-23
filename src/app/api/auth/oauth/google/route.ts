import { cookies } from "next/headers";

import { newOAuthState } from "@/features/auth/oauth.repository";
import { OAUTH_STATE_COOKIE } from "@/features/auth/oauth.constants";
import { googleAuthUrl, googleConfigured } from "@/features/auth/oauth.helpers";

// ---------------------------------------------------------------------------
// Paso 1 del acceso con Google: el boton del formulario apunta aqui.
//
//   GET /api/auth/oauth/google  ->  redirige a la pantalla de consentimiento
//
// El state se guarda en cookie httpOnly y se compara en el callback (CSRF).
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  if (!googleConfigured()) {
    return Response.redirect(new URL("/login?error=oauth_no_configurado", request.url), 302);
  }

  const state = newOAuthState();
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return Response.redirect(googleAuthUrl(state), 302);
}