import { mockServices } from "@/lib/piscinas/mock/services";

// Los servicios con equivalencia usan la misma imagen del Home
// (mockServices, campo `image`). Las piscinas adultas reutilizan la imagen
// oficial /360/adult_pool.jpg que ya consume el módulo de piscinas.
const HOME_IMAGE_BY_ID = new Map(mockServices.map((s) => [s.id, s.image]));

// Correspondencia instalación (BD) -> entrada del Home: mismo complejo,
// misma numeración y misma capacidad oficial en ambos lados.
// Sin correspondencia exacta -> null y la UI muestra un mosaico sobrio
// (nunca una foto inventada).
const DB_TO_HOME: Array<{ db: RegExp; homeId: string }> = [
  { db: /^piscina infantil$/i, homeId: "piscina-infantil" },
  { db: /^cancha de fútbol$/i, homeId: "futbol-campo" },
  { db: /^cancha de microfútbol 1$/i, homeId: "microfutbol-cancha-1" },
  { db: /^cancha de microfútbol 2$/i, homeId: "microfutbol-cancha-2" },
  { db: /^cancha de microfútbol 3$/i, homeId: "microfutbol-cancha-3" },
  { db: /^gimnasio$/i, homeId: "gimnasio-principal" },
  { db: /^turco$/i, homeId: "bano-turco" },
  { db: /^sauna$/i, homeId: "sauna" },
  { db: /^polideportiva 1$/i, homeId: "polideportivo-1" },
  { db: /^polideportiva 2$/i, homeId: "polideportivo-2" },
];

export function servicePhoto(serviceName: string): string | null {
  const normalizedName = serviceName.trim();
  if (/^piscina adultos(?: \d+)?$/i.test(normalizedName)) {
    return "/360/adult_pool.jpg";
  }

  const hit = DB_TO_HOME.find((r) => r.db.test(normalizedName));
  if (!hit) return null;
  return HOME_IMAGE_BY_ID.get(hit.homeId) ?? null;
}
