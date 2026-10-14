// ---------------------------------------------------------------------------
// Festivos de Colombia y día de mantenimiento.
//
// Reglas confirmadas por el cliente:
//
//   1. El complejo atiende de martes a domingo.
//   2. El LUNES queda reservado para mantenimiento técnico.
//   3. Si el lunes es festivo, el mantenimiento se traslada al MARTES.
//   4. El administrador puede cerrar cualquier instalación a mano por
//      imprevistos. Eso lo resuelve ServiceClosure, no este archivo.
//
// Cómo funciona en Colombia (Ley Emiliani, vigente desde 1974): todos los
// festivos se observan el lunes de esa semana. Si dos festivos caen en el mismo
// lunes, el segundo pasa al martes siguiente.
//
// Eso importa porque significa que la mayoría de los festivos SON lunes. Por
// eso la regla 3 tiene efecto real: el lunes que es festivo abre con horario
// normal y el mantenimiento se corre al martes.
//
// Los datos viven como constantes y no en una tabla a propósito: son públicos,
// no dependen de ninguna instalación y cambian solo por decreto. Si el admin
// llegara a necesitar editarlos, se migran a un modelo Holiday sin tocar las
// funciones de abajo.
//
// ADVERTENCIA: verificar contra el calendario oficial antes de cada temporada.
// Un festivo mal fechado cierra el día equivocado y, peor, corre el
// mantenimiento al día equivocado. Hay un test que falla si el año en curso no
// tiene lista de festivos cargada.
// ---------------------------------------------------------------------------

/** Festivos de fecha fija, en `MM-DD` porque el año se aplica al calcular. */
const FESTIVOS_FIJOS: ReadonlyArray<readonly [string, string]> = [
  ["01-01", "Año Nuevo"],
  ["01-06", "Día de los Reyes Magos"],
  ["03-23", "Día de San José"],
  ["05-01", "Día del Trabajo"],
  ["07-20", "Día de la Independencia"],
  ["08-07", "Batalla de Boyacá"],
  ["08-15", "Asunción de la Virgen"],
  ["10-12", "Día de la Raza"],
  ["11-01", "Todos los Santos"],
  ["11-11", "Independencia de Cartagena"],
  ["12-08", "Inmaculada Concepción"],
  ["12-25", "Navidad"],
];

/**
 * Festivos que NO se trasladan al lunes aunque la Ley Emiliani los mueva.
 *
 * La Semana Santa es la excepción: Jueves y Viernes Santo caen en jueves y
 * viernes respectivamente y no se mueven. Aplicarles el traslado a lunes
 * cerraría el complejo el lunes y lo abriría el jueves, que es al revés de lo
 * que hace la gente.
 */
const NO_TRASLADABLES = new Set(["Jueves Santo", "Viernes Santo"]);

// 0 = domingo .. 6 = sábado. Igual convención que ServiceSchedule.dayOfWeek.
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 86_400_000);
}

function aClave(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}-${String(fecha.getUTCDate()).padStart(2, "0")}`;
}

function desdeClave(clave: string): Date {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Pascua gregoriana (algoritmo de Meeus/Jones/Butcher, vigente desde 1583).
 * De ahí se derivan los festivos móviles.
 */
function pascuaDeGregorio(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Jueves Santo, Viernes Santo, Corpus Christi y Sagrado Corazón. */
function festivosMoviles(anio: number): Array<[string, string]> {
  const pascua = pascuaDeGregorio(anio);
  return [
    [aClave(sumarDias(pascua, -3)), "Jueves Santo"],
    [aClave(sumarDias(pascua, -2)), "Viernes Santo"],
    [aClave(sumarDias(pascua, 60)), "Corpus Christi"],
    [aClave(sumarDias(pascua, 68)), "Sagrado Corazón del Señor"],
  ];
}

/** Lunes de la semana de una fecha (clave a clave). */
function lunesDeLaSemana(clave: string): string {
  const fecha = desdeClave(clave);
  const dow = fecha.getUTCDay();
  const retroceso = dow === 0 ? 6 : dow - 1;
  return aClave(sumarDias(fecha, -retroceso));
}

const cache = new Map<number, Map<string, string>>();

/**
 * Festivos observados de un año: fecha real -> nombre, ya con el traslado al
 * lunes que manda la Ley Emiliani.
 */
export function festivosDe(anio: number): Map<string, string> {
  const guardado = cache.get(anio);
  if (guardado) return guardado;

  const reales: Array<[string, string]> = [
    ...FESTIVOS_FIJOS.map(([mmdd, nombre]) => [
      `${anio}-${mmdd}`,
      nombre,
    ] as [string, string]),
    ...festivosMoviles(anio),
  ];

  // Todos se observan en lunes, salvo los que no se trasladan. Si dos caen en
  // el mismo lunes, el segundo pasa al martes siguiente.
  const porLunes = new Map<string, string[]>();
  for (const [clave, nombre] of reales) {
    const destino = NO_TRASLADABLES.has(nombre) ? clave : lunesDeLaSemana(clave);
    const lista = porLunes.get(destino) ?? [];
    lista.push(nombre);
    porLunes.set(destino, lista);
  }

  const observados = new Map<string, string>();
  for (const [lunes, nombres] of porLunes) {
    observados.set(lunes, nombres[0]);
    for (let i = 1; i < nombres.length; i += 1) {
      observados.set(aClave(sumarDias(desdeClave(lunes), i)), nombres[i]);
    }
  }

  cache.set(anio, observados);
  return observados;
}

/**
 * ¿Es festivo observado en Colombia?
 *
 * Se consultan el año de la fecha y el anterior: el 1 de enero puede
 * trasladarse a un lunes de diciembre del año previo (así pasó con el 2026,
 * que se’observation en el 29 de diciembre de 2025).
 */
export function esFestivo(clave: string): boolean {
  const anio = Number(clave.slice(0, 4));
  return festivosDe(anio).has(clave) || festivosDe(anio - 1).has(clave);
}

/** Nombre del festivo, si aplica. */
export function nombreFestivo(clave: string): string | null {
  const anio = Number(clave.slice(0, 4));
  return festivosDe(anio).get(clave) ?? festivosDe(anio - 1).get(clave) ?? null;
}

/** 0 = domingo .. 6 = sábado, igual que ServiceSchedule.dayOfWeek. */
export function diaDeSemana(clave: string): number {
  return desdeClave(clave).getUTCDay();
}

export function nombreDelDia(dow: number): string {
  return DIAS[dow] ?? "";
}

/**
 * Día de mantenimiento de la semana a la que pertenece la fecha.
 *
 * Lunes por defecto; si ese lunes es festivo, se traslada al martes.
 */
export function diaDeMantenimiento(clave: string): number {
  return esFestivo(lunesDeLaSemana(clave)) ? 2 : 1;
}

/** ¿Esta fecha es el día de mantenimiento de su semana? */
export function esDiaDeMantenimiento(clave: string): boolean {
  return diaDeSemana(clave) === diaDeMantenimiento(clave);
}

/** Anticipación máxima del SCRUM: 3 meses calendario, no 90 días fijos. */
export const MESES_MAXIMOS_RESERVA = 3;

/**
 * Último día reservable: hoy + 3 meses calendario, en clave `YYYY-MM-DD`.
 *
 * P2-3: esta es la única definición de la ventana. La usan el backend (rechazo
 * `muy_far`), el calendario del frontend (límite navegable) y la generación de
 * franjas (hasta dónde se generan). Antes cada lado calculaba a su manera
 * (meses locales del servidor vs 90 días fijos) y quedaba un hueco de 1-2 días
 * donde el backend permitía pero no había franjas generadas.
 */
export function ultimoDiaReservable(hoyClave: string): string {
  const [y, m, d] = hoyClave.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1 + MESES_MAXIMOS_RESERVA, d, 12));
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${mm}-${dd}`;
}

/** Días que cubre la ventana de reserva, incluyendo hoy y el último día. */
export function diasVentanaReserva(hoyClave: string): number {
  const ms =
    Date.parse(`${ultimoDiaReservable(hoyClave)}T00:00:00.000Z`) -
    Date.parse(`${hoyClave}T00:00:00.000Z`);
  return Math.round(ms / 86_400_000) + 1;
}