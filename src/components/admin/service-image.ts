// Archivos locales de catálogo; no contienen nombres, categorías, precios ni aforos.
const SERVICE_IMAGES: Array<{ service: RegExp; src: string }> = [
  { service: /^piscina infantil$/i, src: "/newassets/piscina-infantil.png" },
  { service: /^piscina adultos(?: \d+)?$/i, src: "/newassets/piscina-olas.png" },
  { service: /^cancha de fútbol$/i, src: "/newassets/futbol-11.png" },
  { service: /^cancha de microfútbol 1$/i, src: "/newassets/micro-sintetica.png" },
  { service: /^cancha de microfútbol 2$/i, src: "/newassets/cubierta.png" },
  { service: /^cancha de microfútbol 3$/i, src: "/newassets/soccer-grama.png" },
  { service: /^gimnasio$/i, src: "/newassets/gym.png" },
  { service: /^turco$/i, src: "/newassets/bano-turco.png" },
  { service: /^sauna$/i, src: "/newassets/turco.png" },
  { service: /^polideportiva 1$/i, src: "/newassets/poli-multi.png" },
  { service: /^polideportiva 2$/i, src: "/newassets/poli-basket.png" },
];

export function servicePhoto(serviceName: string): string | null {
  const normalizedName = serviceName.trim();
  return SERVICE_IMAGES.find(({ service }) => service.test(normalizedName))?.src ?? null;
}
