import { describe, expect, it } from "vitest";

import {
  IMAGENES_DISPONIBLES,
  REQUISITOS_360,
  esValidaPara360,
  panorama360,
  servicePhoto,
} from "../service-images";

describe("búsqueda de imagen por slug", () => {
  it("encuentra la foto con el slug original del seed", () => {
    expect(servicePhoto("cancha-futbol")).toBe("/newassets/futbol-11.webp");
    expect(servicePhoto("piscina-infantil")).toBe("/newassets/piscina-infantil.webp");
    expect(servicePhoto("gimnasio")).toBe("/newassets/gym.webp");
  });

  it("aguanta que el panel regenere el slug al renombrar", () => {
    // Este es el bug real: "Cancha de microfútbol 3" pasó de.slug
    // "cancha-microfutbol-3" a "cancha-de-microfutbol-3" y la tarjeta quedó
    // en negro porque la búsqueda era una coincidencia exacta.
    expect(servicePhoto("cancha-microfutbol-3")).toBe("/newassets/cubierta.webp");
    expect(servicePhoto("cancha-de-microfutbol-3")).toBe("/newassets/cubierta.webp");
    expect(servicePhoto("cancha-de-microfutbol-4")).toBe("/newassets/cubierta.webp");
  });

  it("aguanta acentos y guiones distintos", () => {
    const conAcento = servicePhoto("piscina-de-olas");
    const sinAcento = servicePhoto("piscina-de-olas".normalize("NFD").replace(/[̀-ͯ]/g, ""));
    expect(conAcento).toBe("/newassets/piscina-olas.webp");
    expect(sinAcento).toBe("/newassets/piscina-olas.webp");
    expect(servicePhoto("CANCHA-MICROFUTBOL-3")).toBe("/newassets/cubierta.webp");
  });

  it("devuelve null si de verdad no hay foto", () => {
    expect(servicePhoto("instalacion-inexistente")).toBeNull();
    expect(servicePhoto("")).toBeNull();
  });

  it("el panorama 360 es la misma foto", () => {
    expect(panorama360("cancha-de-microfutbol-3")).toBe(servicePhoto("cancha-de-microfutbol-3"));
  });

  it("todas las instalaciones del catálogo tienen foto", () => {
    const slugsDelSeed = [
      "piscina-infantil", "piscina-de-olas", "piscina-tobogan", "piscina-inodoro",
      "piscina-torpedo", "cancha-microfutbol-1", "cancha-microfutbol-2",
      "cancha-microfutbol-3", "cancha-microfutbol-4", "cancha-futbol",
      "polideportiva-1", "polideportiva-2", "gimnasio", "bano-turco", "sauna",
    ];
    for (const slug of slugsDelSeed) {
      expect(servicePhoto(slug), `sin foto: ${slug}`).not.toBeNull();
    }
  });
});

describe("requisitos de una imagen para el visor 360", () => {
  it("acepta una panorámica correcta de 2:1", () => {
    expect(esValidaPara360("/newassets/x.webp", { ancho: 1456, alto: 720 }).ok).toBe(true);
    expect(esValidaPara360("/newassets/x.webp", { ancho: 4096, alto: 2048 }).ok).toBe(true);
  });

  it("avisa si la proporción no es 2:1", () => {
    const r = esValidaPara360("/newassets/x.webp", { ancho: 1000, alto: 1000 });
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("2:1");
  });

  it("avisa si es muy pequeña", () => {
    const r = esValidaPara360("/newassets/x.webp", { ancho: 800, alto: 400 });
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("borrosa");
  });

  it("no se queja si no se pudieron leer las medidas", () => {
    expect(esValidaPara360("/newassets/x.webp", null).ok).toBe(true);
  });

  it("tolera la desviacion que traen las fotos actuales", () => {
    // Las de 1456x720 tienen 2.022:1, un 1% de desvío. Con la tolerancia
    // justa no deben marcarse como inválidas.
    expect(esValidaPara360("/newassets/x.webp", { ancho: 1456, alto: 720 }).ok).toBe(true);
    expect(REQUISITOS_360.tolerancia).toBeGreaterThanOrEqual(0.02);
  });
});

describe("catálogo de imágenes disponibles", () => {
  it("ofrece rutas de public/newassets para el selector del panel", () => {
    expect(IMAGENES_DISPONIBLES.length).toBeGreaterThan(5);
    for (const ruta of IMAGENES_DISPONIBLES) {
      expect(ruta.startsWith("/newassets/")).toBe(true);
    }
    // Sin duplicados.
    expect(new Set(IMAGENES_DISPONIBLES).size).toBe(IMAGENES_DISPONIBLES.length);
  });
});