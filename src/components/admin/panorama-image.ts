// Panorámicas 360° por slug de servicio.
//
// Las fotos del complejo en `public/newassets` ya son panoramas equirectangulares
// (proporción 2:1): la misma imagen que se usa como portada sirve como textura
// del visor. No hace falta un segundo archivo por servicio.
//
// Las de 1456x720 tienen ratio 2,02 (1% de desvío): imperceptible sobre la
// esfera. Si alguna quedara visiblemente estirada, se ajusta el recorte y se
// vuelve a pasar por acá.
const PANORAMAS_360: Record<string, string> = {
  // Piscinas
  "piscina-infantil": "/newassets/piscina-infantil.webp",
  "piscina-de-olas": "/newassets/piscina-olas.webp",
  "piscina-tobogan": "/newassets/tobogan-piscina-1.webp",
  "piscina-inodoro": "/newassets/bowl-slide.webp",
  "piscina-torpedo": "/newassets/torpedo.webp",

  // Canchas de microfútbol
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
  "sauna": "/newassets/turco.webp",
};

export function panorama360(serviceSlug: string): string | null {
  return PANORAMAS_360[serviceSlug] ?? null;
}