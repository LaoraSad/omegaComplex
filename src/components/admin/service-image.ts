// Los slugs estables del catálogo apuntan a fotografías locales verificadas.
// Claves canónicas = slugs del seed (prisma/seed.ts). Se conservan alias
// históricos para no romper referencias antiguas.
const SERVICE_IMAGES: Record<string, string> = {
  // Piscinas
  "piscina-infantil": "/newassets/piscina-infantil.webp",
  "piscina-adultos-1": "/newassets/piscina-olas.webp",
  "piscina-adultos-2": "/newassets/tobogan-piscina-1.webp",
  "piscina-adultos-3": "/newassets/bowl-slide.webp",
  "piscina-adultos-4": "/newassets/tobogan-piscina-3.webp",
  // Canchas
  "cancha-futbol": "/newassets/futbol-11.webp",
  "cancha-microfutbol-1": "/newassets/micro-sintetica.webp",
  "cancha-microfutbol-2": "/newassets/cubierta.webp",
  "cancha-microfutbol-3": "/newassets/soccer-grama.webp",
  "polideportiva-1": "/newassets/poli-multi.webp",
  "polideportiva-2": "/newassets/poli-basket.webp",
  // Gimnasio y zona húmeda
  "gimnasio": "/newassets/gym.webp",
  "bano-turco": "/newassets/bano-turco.webp",
  "sauna": "/newassets/turco.webp",
  // Alias históricos (fotos existentes sin servicio actual)
  "piscina-olas": "/newassets/piscina-olas.webp",
  "toboganes-piscina-1": "/newassets/tobogan-piscina-1.webp",
  "toboganes-piscina-2": "/newassets/bowl-slide.webp",
  "toboganes-piscina-3": "/newassets/tobogan-piscina-3.webp",
  "futbol-campo": "/newassets/futbol-11.webp",
  "microfutbol-cancha-1": "/newassets/micro-sintetica.webp",
  "microfutbol-cancha-2": "/newassets/cubierta.webp",
  "microfutbol-cancha-3": "/newassets/soccer-grama.webp",
  "cancha-padel": "/newassets/padel.webp",
  "cancha-tenis": "/newassets/tenis.webp",
  "polideportivo-1": "/newassets/poli-multi.webp",
  "polideportivo-2": "/newassets/poli-basket.webp",
  "gimnasio-principal": "/newassets/gym.webp",
};

export function servicePhoto(serviceSlug: string): string | null {
  return SERVICE_IMAGES[serviceSlug] ?? null;
}
