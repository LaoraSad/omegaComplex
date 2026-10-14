// ---------------------------------------------------------------------------
// Fotos y panoramas 360 del catálogo.
//
// Antes esto vivía en dos archivos duplicados (`service-image.ts` y
// `panorama-image.ts`) con el mismo contenido, y la búsqueda era una
// coincidencia exacta de slug. Eso era frágil: al renombrar un servicio en el
// panel, el slug se regenera a partir del nombre y la foto se dejaba de
// encontrar. Pasó con "Cancha de microfútbol 3":
//
//     slug del seed:  cancha-microfutbol-3
//     slug guardado:  cancha-de-microfutbol-3     <- al editar el nombre
//     resultado:      tarjeta en negro, sin 360
//
// Por eso la búsqueda ahora es tolerante: prueba varias formas del slug antes
// de rendirse. Y si el servicio trae `imagen` en la base, esa manda.
//
// Todas las fotos de `public/newassets` son panoramas equirectangulares de
// proporción 2:1, así que la misma imagen sirve de portada y de textura del
// visor 360. No hace falta un segundo archivo por servicio.
// ---------------------------------------------------------------------------

/** Fotografía asignada a cada instalación, por slug. */
const IMAGENES: Record<string, string> = {
  // Piscinas
  "piscina-infantil": "/newassets/piscina-infantil.webp",
  "piscina-de-olas": "/newassets/piscina-olas.webp",
  "piscina-tobogan": "/newassets/tobogan-piscina-1.webp",
  "piscina-inodoro": "/newassets/bowl-slide.webp",
  "piscina-torpedo": "/newassets/torpedo.webp",

  // Canchas de microfútbol: 2 con micro-sintética y 2 con la cubierta.
  "cancha-microfutbol-1": "/newassets/micro-sintetica_360.webp",
  "cancha-microfutbol-2": "/newassets/micro-sintetica_360.webp",
  "cancha-microfutbol-3": "/newassets/cubierta.webp",
  "cancha-microfutbol-4": "/newassets/cubierta.webp",

  // Otras instalaciones
  "cancha-futbol": "/newassets/futbol-11.webp",
  "polideportiva-1": "/newassets/poli-multi.webp",
  "polideportiva-2": "/newassets/poli-basket.webp",
  "gimnasio": "/newassets/gym.webp",
  "bano-turco": "/newassets/bano-turco.webp",
  sauna: "/newassets/turco.webp",
};

/** Fotografías disponibles en `public/newassets`, para el selector del panel. */
export const IMAGENES_DISPONIBLES = [...new Set(Object.values(IMAGENES))].sort();

/**
 * Requisitos que debe cumplir una imagen para que el visor 360 no la deforme.
 * Se muestran en el panel para que nadie suba una foto cuadrada y descubra
 * después que gira estirada.
 */
export const REQUISITOS_360 = {
  /** Proporción de un panorama equirectangular. */
  ratio: 2,
  /** Se tolera esta desviación antes de avisar. */
  tolerancia: 0.08,
  /** Ancho mínimo: por debajo se ve borroso al acercar. */
  anchoMinimo: 1400,
} as const;

/** ¿Esta ruta cumple los requisitos para usarse como panorama 360? */
export function esValidaPara360(
  ruta: string,
  medidas: { ancho: number; alto: number } | null,
): { ok: boolean; motivo?: string } {
  if (!medidas) return { ok: true };
  const ratio = medidas.ancho / medidas.alto;
  const desviacion = Math.abs(ratio - REQUISITOS_360.ratio);
  if (desviacion > REQUISITOS_360.tolerancia) {
    return {
      ok: false,
      motivo:
        `La proporción es ${ratio.toFixed(2)}:1 y el visor 360 necesita ` +
        `2:1. Se vería estirada al girar.`,
    };
  }
  if (medidas.ancho < REQUISITOS_360.anchoMinimo) {
    return {
      ok: false,
      motivo: `Mide ${medidas.ancho}px de ancho y el mínimo son ${REQUISITOS_360.anchoMinimo}px. Se vería borrosa al acercar.`,
    };
  }
  return { ok: true };
}

/**
 * Todas las formas en que puede aparecer un slug.
 *
 * Se prueban en orden: primero el slug tal cual, después las variantes que
 * genera el panel al renombrar. Es una lista corta y se evalúa en cada
 * tarjeta del catálogo, así que no puede pesar.
 */
function variantesDeSlug(slug: string): string[] {
  const base = slug.trim().toLowerCase();
  if (!base) return [];

  const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const sinGuiones = (s: string) => s.replace(/-/g, "");

  const variantes = new Set<string>([
    base,
    sinGuiones(base),
    base.replace(/-de-/g, "-"),
    sinGuiones(base.replace(/-de-/g, "-")),
    sinAcentos(base),
    sinGuiones(sinAcentos(base)),
    sinAcentos(base).replace(/-de-/g, "-"),
    sinGuiones(sinAcentos(base).replace(/-de-/g, "-")),
    // "fútbol" con y sin tilde, y con "de" de por medio: las dos formas en que
    // el panel suele escribir la misma instalación.
    sinGuiones(sinAcentos(base).replace(/de/g, "")),
  ]);

  return [...variantes];
}

/** Resuelve la foto de una instalación tolerando cambios en el slug. */
export function servicePhoto(serviceSlug: string): string | null {
  for (const variante of variantesDeSlug(serviceSlug)) {
    const foto = IMAGENES[variante];
    if (foto) return foto;
  }
  return null;
}

/**
 * Panorama 360 de una instalación.
 *
 * Es la misma foto: todas las imágenes del complejo son equirectangulares 2:1.
 * Se mantiene como función aparte porque el visor y la portada son cosas
 * distintas aunque hoy compartan archivo.
 */
export function panorama360(serviceSlug: string): string | null {
  return servicePhoto(serviceSlug);
}
