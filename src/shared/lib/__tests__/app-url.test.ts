import { afterEach, describe, expect, it } from "vitest";

import { appOrigin, appUrl } from "../app-url";

describe("appOrigin / appUrl (URL pública para redirecciones)", () => {
  const entornos = process.env as Record<string, string | undefined>;
  const guardado = {
    url: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  afterEach(() => {
    if (guardado.url === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = guardado.url;
    }
    entornos.NODE_ENV = guardado.nodeEnv;
  });

  it("usa el dominio público configurado", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://omegacomplex.coderhivex.com";
    expect(appOrigin()).toBe("https://omegacomplex.coderhivex.com");
  });

  it("arma la redirección contra el dominio, no contra el host interno", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://omegacomplex.coderhivex.com";
    expect(appUrl("/login?error=oauth_cancelado")).toBe(
      "https://omegacomplex.coderhivex.com/login?error=oauth_cancelado",
    );
  });

  it("conserva la ruta de la app al armar enlaces", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://omegacomplex.coderhivex.com";
    expect(appUrl("/validar")).toBe("https://omegacomplex.coderhivex.com/validar");
    expect(appUrl("/verify-email?email=a%40x.co")).toBe(
      "https://omegacomplex.coderhivex.com/verify-email?email=a%40x.co",
    );
  });

  it("en producción rechaza 0.0.0.0 en vez de redirigir ahí", () => {
    entornos.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://0.0.0.0:3000";
    expect(() => appOrigin()).toThrow(/0\.0\.0\.0/);
  });

  it("en producción rechaza localhost", () => {
    entornos.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(() => appOrigin()).toThrow(/localhost/);
  });

  it("fuera de producción acepta localhost (desarrollo y pruebas)", () => {
    entornos.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(appOrigin()).toBe("http://localhost:3000");
  });

  it("rechaza una URL inválida", () => {
    process.env.NEXT_PUBLIC_APP_URL = "no-es-una-url";
    expect(() => appOrigin()).toThrow(/no es una URL válida/);
  });
});
