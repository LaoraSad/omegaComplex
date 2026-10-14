import { describe, expect, it } from "vitest";

import { destinoOAuth } from "../oauth.constants";

describe("destinoOAuth (P1-4: puerta de acceso tras el callback)", () => {
  it("desactivado no entra, aunque el rol exista", () => {
    expect(
      destinoOAuth({ role: "user", isActive: false, emailVerified: true, email: "a@x.co" }),
    ).toEqual({ abrirSesion: false, destino: "/login?error=oauth_cuenta_inactiva" });
  });

  it("sin correo verificado no abre sesión y va a /verify-email", () => {
    expect(
      destinoOAuth({ role: "user", isActive: true, emailVerified: false, email: "a@x.co" }),
    ).toEqual({ abrirSesion: false, destino: "/verify-email?email=a%40x.co" });
  });

  it("verificado y activo abre sesión con su rol", () => {
    expect(
      destinoOAuth({ role: "user", isActive: true, emailVerified: true, email: "a@x.co" }),
    ).toEqual({ abrirSesion: true, role: "user" });
  });
});
