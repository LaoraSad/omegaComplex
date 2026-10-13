// Los slugs estables del catálogo apuntan a fotografías locales verificadas.
// Claves canónicas = slugs del seed (prisma/seed.ts). Se conservan alias
// históricos para no romper referencias antiguas.
const SERVICE_IMAGES: Record<string, string> = {
  // Piscinas
  "piscina-infantil": "/newassets/piscina-infantil.webp",
  "piscina-de-olas": "/newassets/piscina-olas.webp",
  "piscina-tobogan": "/newassets/tobogan-piscina-1.webp",
  "piscina-inodoro": "/newassets/bowl-slide.webp",
  "piscina-torpedo": "/newassets/torpedo.webp",
  // Canchas de microfútbol (2 con micro-sintetica y 2 con cubierta)
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

export function servicePhoto(serviceSlug: string): string | null {
  return SERVICE_IMAGES[serviceSlug] ?? null;
}
