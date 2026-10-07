// Los slugs estables del catálogo apuntan a fotografías locales verificadas.
const SERVICE_IMAGES: Record<string, string> = {
  "piscina-infantil": "/newassets/piscina-infantil.png",
  "piscina-olas": "/newassets/piscina-olas.png",
  "toboganes-piscina-1": "/newassets/tobogan-piscina-1.png",
  "toboganes-piscina-2": "/newassets/bowl-slide.png",
  "toboganes-piscina-3": "/newassets/tobogan-piscina-3.png",
  "futbol-campo": "/newassets/futbol-11.png",
  "microfutbol-cancha-1": "/newassets/micro-sintetica.png",
  "microfutbol-cancha-2": "/newassets/cubierta.png",
  "microfutbol-cancha-3": "/newassets/soccer-grama.png",
  "cancha-padel": "/newassets/padel.png",
  "cancha-tenis": "/newassets/tenis.png",
  "polideportivo-1": "/newassets/poli-multi.png",
  "polideportivo-2": "/newassets/poli-basket.png",
  "gimnasio-principal": "/newassets/gym.png",
  "bano-turco": "/newassets/bano-turco.png",
  sauna: "/newassets/turco.png",
};

export function servicePhoto(serviceSlug: string): string | null {
  return SERVICE_IMAGES[serviceSlug] ?? null;
}
