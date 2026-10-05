import { mockServices } from "@/lib/piscinas/mock/services";

// Las imágenes provienen EXCLUSIVAMENTE del array que utiliza el Home
// (mockServices, campo `image`): Instalación del Home -> misma imagen en Admin.
// No se crea ninguna imagen, asociación ni ruta nueva, y no se toca el
// sistema 360 (visor, rutas, componentes y lógica quedan intactos).
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
  const hit = DB_TO_HOME.find((r) => r.db.test(serviceName.trim()));
  if (!hit) return null;
  return HOME_IMAGE_BY_ID.get(hit.homeId) ?? null;
}
