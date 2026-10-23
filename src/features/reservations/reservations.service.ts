// -----------------------------------------------------------------------------
// src/features/reservations/reservations.service.ts
// Lógica de negocio de reservas: creación con bloqueo temporal, liberación de
// holds vencidos, control de solape, capacidad y validaciones de horario.
// -----------------------------------------------------------------------------

import type { Prisma } from "@prisma/client";

import { db } from "@/shared/lib/db";
import { esDiaDeMantenimiento, ultimoDiaReservable } from "@/features/schedules/colombia-holidays";
import type { CreateReservationInput } from "./reservations.schemas";

// -----------------------------------------------------------------------------
// Constantes y configuración
// HOLD_MINUTES: tiempo en minutos que una franja permanece bloqueada mientras
// el cliente paga (10 minutos por requisito del negocio).
// MAX_INTENTOS: reintentos de transacción cuando hay conflicto de escritura
// (deadlock) por el último cupo.
// BOGOTA: zona horaria usada para todas las fechas del negocio.
// -----------------------------------------------------------------------------
export const HOLD_MINUTES = 10;
/** Reintentos cuando varias reservas chocan por el lock de la misma franja. */
const MAX_INTENTOS = 3;
const BOGOTA = "America/Bogota";

// -----------------------------------------------------------------------------
// dateKeyBogota(date)
// Devuelve la fecha en formato AAAA-MM-DD según la zona horaria de Bogotá.
// Se usa para agrupar operaciones por día calendario en COT.
// -----------------------------------------------------------------------------
function dateKeyBogota(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// -----------------------------------------------------------------------------
// dayOfWeekBogota(dateKey)
// Devuelve el día de la semana (0=domingo ... 6=sábado) de una fecha clave
// en Bogotá, igual que la columna dayOfWeek de ServiceSchedule.
// -----------------------------------------------------------------------------
function dayOfWeekBogota(dateKey: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA,
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00-05:00`));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

// -----------------------------------------------------------------------------
// minutesInBogota(date)
// Devuelve los minutos transcurridos desde la medianoche en Bogotá
// (ej. 08:30 → 510). Se usa para comparar horarios de franjas.
// -----------------------------------------------------------------------------
function minutesInBogota(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOGOTA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

// -----------------------------------------------------------------------------
// parseScheduleMinutes(value)
// Parsea una hora "HH:MM" a minutos. Devuelve null si el formato es inválido.
// -----------------------------------------------------------------------------
function parseScheduleMinutes(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

// -----------------------------------------------------------------------------
// CreateResult (tipo)
// Resultado de crear una reserva. Puede ser éxito (con datos de la reserva)
// o fallo (con código de error y mensaje).
// -----------------------------------------------------------------------------
export type CreateResult =
  | {
      ok: true;
      reservationId: string;
      holdId: string;
      expiresAt: Date;
      totalCop: number;
      personas: number;
      /** Cuantas zonas abarque la reserva. Cada una da un QR por persona. */
      zonas: number;
      /** Cupos que quedan en la zona más ajustada. */
      cuposRestantes: number;
    }
  | { ok: false; code: CrearError; message: string };

// -----------------------------------------------------------------------------
// CrearError (tipo)
// Todos los códigos de error posibles al crear una reserva.
// -----------------------------------------------------------------------------
export type CrearError =
  | "servicio_no_existe"
  | "franja_no_existe"
  | "horario_no_disponible"
  | "franja_otro_servicio"
  | "franja_pasada"
  | "franja_duracion_invalida"
  | "muy_far"
  | "sin_cupos"
  | "horario_chocante"
  | "bloques_pisados"
  | "bloque_repetido"
  | "asistentes_inconsistentes"
  | "sin_acompanyantes"
  | "ya_reservado"
  | "mantenimiento"
  | "servicio_inactivo";

// -----------------------------------------------------------------------------
// fechaLimiteReserva(now)
// Devuelve la fecha límite para reservar (hoy + 3 meses calendario en Bogotá).
// -----------------------------------------------------------------------------
function fechaLimiteReserva(now: Date): string {
  return ultimoDiaReservable(dateKeyBogota(now));
}

// -----------------------------------------------------------------------------
// isPastDate(date, now)
// Verifica si una fecha (AAAA-MM-DD) es anterior a hoy en Bogotá.
// Hoy nunca se considera pasado aunque ya hayan pasado las 00:00.
// -----------------------------------------------------------------------------
export function isPastDate(date: string, now: Date): boolean {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return date < hoy;
}

// -----------------------------------------------------------------------------
// ClienteReserva (tipo)
// Subconjunto del cliente de Prisma usado dentro y fuera de transacciones.
// Permite usar la misma función tanto con db como con tx (TransactionClient).
// -----------------------------------------------------------------------------
type ClienteReserva = Pick<
  Prisma.TransactionClient,
  "reservation" | "reservationBlock" | "reservationHold" | "$executeRaw"
>;

// -----------------------------------------------------------------------------
// liberarHoldsVencidos(now, cliente, limite, alExpirar)
// Libera los holds (bloqueos temporales) que vencieron sin pago y devuelve
// sus cupos al inventario de ServiceSlot.
//   - Busca reservas en pending_payment con holds activos expirados.
//   - Marca la reserva como "expired" y el hold como "released".
//   - Resta los cupos retenidos (heldCount) de cada ServiceSlot.
//   - Es idempotente: el updateMany condicionado por status asegura que solo
//     una petición libera los cupos de cada reserva.
//   - `limite` acota cuántas reservas procesa por llamada (50 por defecto).
//     El cron pasa null para procesar todas.
// -----------------------------------------------------------------------------
export async function liberarHoldsVencidos(
  now: Date = new Date(),
  cliente: ClienteReserva = db,
  limite: number | null = 50,
  alExpirar?: (reservationId: string) => void | Promise<void>,
): Promise<number> {
  const vencidas = await cliente.reservation.findMany({
    where: {
      status: "pending_payment",
      holds: { some: { status: "active", expiresAt: { lte: now } } },
    },
    ...(limite === null ? {} : { take: limite }),
    select: { id: true, slots: { select: { slotId: true, quantity: true } } },
  });

  let liberadas = 0;
  for (const reserva of vencidas) {
    const marcada = await cliente.reservation.updateMany({
      where: { id: reserva.id, status: "pending_payment" },
      data: { status: "expired" },
    });
    // Si otra petición ya la expiró, esta no devuelve cupos por segunda vez.
    if (marcada.count !== 1) continue;

    await cliente.reservationHold.updateMany({
      where: { reservationId: reserva.id, status: "active" },
      data: { status: "released" },
    });
    for (const s of reserva.slots) {
      await cliente.$executeRaw`
        UPDATE "ServiceSlot"
           SET "heldCount" = GREATEST("heldCount" - ${s.quantity}, 0)
          WHERE id = ${s.slotId}::uuid
      `;
    }
    liberadas += 1;
    await alExpirar?.(reserva.id);
  }
  return liberadas;
}

// -----------------------------------------------------------------------------
// chocarConOtraReserva(cliente, customerRowId, startsAt, endsAt)
// Verifica si el cliente ya tiene una reserva viva que se solape con el
// horario solicitado. Solo se consideran reservas pending_payment,
// payment_processing y confirmed.
//   - Se consulta ReservationBlock (no Reservation) porque una reserva puede
//     abarcar varias zonas y su ventana global rechazaría horarios libres.
//   - Solape real: empieza antes de que termine el otro y termina después de
//     que empiece. Un borde compartido (10-11 y 11-12) NO choca.
//   - DEBE ejecutarse dentro de una transacción y DESPUÉS de tomar el lock
//     del cliente, para evitar condiciones de carrera.
// -----------------------------------------------------------------------------
async function chocarConOtraReserva(
  cliente: ClienteReserva,
  customerRowId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<{ startsAt: Date; endsAt: Date; serviceName: string } | null> {
  const choque = await cliente.reservationBlock.findFirst({
    where: {
      reservation: {
        customerId: customerRowId,
        status: { in: ["pending_payment", "payment_processing", "confirmed"] },
      },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { startsAt: true, endsAt: true, service: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return choque
    ? { startsAt: choque.startsAt, endsAt: choque.endsAt, serviceName: choque.service.name }
    : null;
}

// -----------------------------------------------------------------------------
// createReservationWithHold(customerId, input, now)
// Función principal para crear una reserva con bloqueo temporal. Flujo:
//   1. Valida que los acompañantes coincidan con personas - 1.
//   2. Valida que no haya franjas repetidas en el carrito.
//   3. Para cada bloque: valida fecha no pasada, no día de mantenimiento,
//      y no exceder 3 meses de anticipación.
//   4. Consulta los ServiceSlot solicitados con su servicio y categoría.
//   5. Verifica que cada franja pertenezca al servicio correcto.
//   6. Valida cierres de instalaciones (ServiceClosure) y horarios
//      (ServiceSchedule: openTime/closeTime).
//   7. Ordena bloques por hora y valida que no se pisen entre sí.
//   8. Valida que cada franja dure exactamente 1 hora.
//   9. Valida capacidad disponible (capacity - bookedCount - heldCount).
//   10. Resuelve quiénes van a cada zona (asistentes por bloque).
//   11. Dentro de una transacción de Prisma:
//        a. Libera holds vencidos (inventario limpio).
//        b. Toma el cupo con UPDATE condicional:
//           capacity >= bookedCount + heldCount + personas.
//           Si dos clientes compiten por el último cupo, solo uno gana.
//        c. Toma lock FOR UPDATE en la fila del Customer (serializa reservas
//           del mismo cliente para evitar solapes).
//        d. Verifica solape con otras reservas del cliente.
//        e. Crea Reservation (status: pending_payment), ReservationBlock,
//           ReservationSlot, ReservationGuest, ReservationHold (10 min).
//   12. Crea el grupo de invitados (titular + acompañantes) y los asigna a
//       cada bloque/zona.
//   13. Devuelve resultado con reservationId, holdId, expiraEn, totalCop,
//       zonas y cuposRestantes.
// -----------------------------------------------------------------------------
export async function createReservationWithHold(
  customerId: string,
  input: CreateReservationInput,
  now: Date = new Date(),
): Promise<CreateResult> {
  const personas = input.personas;

  // El titular ocupa un cupo: los acompañantes son los que van en la lista.
  const acompañantes = input.acompañantes ?? [];
  if (acompañantes.length !== personas - 1) {
    return {
      ok: false,
      code: "sin_acompanyantes",
      message: `Para ${personas} personas debes registrar ${personas - 1} acompañante(s).`,
    };
  }

  // Sin bloques repetidos: el mismo slot dos veces en un carrito es un error
  // de la interfaz, no dos cupos distintos.
  const ids = input.bloques.map((b) => b.slotId);
  if (new Set(ids).size !== ids.length) {
    return {
      ok: false,
      code: "bloque_repetido",
      message: "Hay una franja repetida en la reserva.",
    };
  }

  for (const b of input.bloques) {
    if (isPastDate(b.fecha, now)) {
      return { ok: false, code: "franja_pasada", message: "No se puede reservar en una fecha pasada." };
    }
    // P1-3: el día de mantenimiento (lunes, o martes si el lunes es festivo)
    // cierra el complejo. La escritura lo defiende, no solo la lectura.
    if (esDiaDeMantenimiento(b.fecha)) {
      return { ok: false, code: "mantenimiento", message: "Ese día el complejo está en mantenimiento técnico." };
    }
    if (b.fecha > fechaLimiteReserva(now)) {
      return {
        ok: false,
        code: "muy_far",
        message: "La anticipación máxima es de 3 meses.",
      };
    }
  }

  const slots = await db.serviceSlot.findMany({
    where: { id: { in: ids } },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          category: { select: { name: true } },
          serviceSchedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } },
        },
      },
    },
  });
  if (slots.length !== ids.length) {
    return { ok: false, code: "franja_no_existe", message: "Una de las franjas ya no existe." };
  }

  const slotPorId = new Map(slots.map((s) => [s.id, s]));
  const ordenados: {
    slot: (typeof slots)[number];
    error: false | "franja_otro_servicio";
    personas: number;
    asistentes?: number[];
  }[] = [];
  for (const b of input.bloques) {
    const slot = slotPorId.get(b.slotId);
    if (!slot) {
      return { ok: false, code: "franja_no_existe", message: "Una de las franjas ya no existe." };
    }
    ordenados.push({
      slot,
      error: slot.serviceId === b.serviceId ? false : "franja_otro_servicio",
      personas: b.personas,
      asistentes: b.asistentes,
    });
  }

  if (ordenados.some((b) => b.error)) {
    return {
      ok: false,
      code: "franja_otro_servicio",
      message: "Una de las franjas no pertenece a la instalación elegida.",
    };
  }

  const fechas = input.bloques.map((bloque) => bloque.fecha).sort();
  const cierres = await db.serviceClosure.findMany({
    where: {
      OR: [
        { serviceId: { in: [...new Set(input.bloques.map((bloque) => bloque.serviceId))] } },
        { serviceId: null },
      ],
      dateFrom: { lte: new Date(`${fechas[fechas.length - 1]}T05:00:00.000Z`) },
      dateTo: { gte: new Date(`${fechas[0]}T05:00:00.000Z`) },
    },
    select: { serviceId: true, dateFrom: true, dateTo: true },
  });

  for (const bloque of input.bloques) {
    const slot = slotPorId.get(bloque.slotId);
    if (!slot) continue;

    if (!slot.service.isActive) {
      return {
        ok: false,
        code: "servicio_inactivo",
        message: "La instalación no está disponible actualmente.",
      };
    }
    const dateKey = dateKeyBogota(slot.startsAt);
    const dayOfWeek = dayOfWeekBogota(dateKey);
    const schedule = slot.service.serviceSchedules.find((item) => item.dayOfWeek === dayOfWeek);
    const openMinutes = schedule ? parseScheduleMinutes(schedule.openTime) : null;
    const closeMinutes = schedule ? parseScheduleMinutes(schedule.closeTime) : null;
    const dateValue = Date.parse(`${dateKey}T00:00:00.000Z`);
    const tieneCierre = cierres.some((cierre) => {
      const desde = Date.parse(`${cierre.dateFrom.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const hasta = Date.parse(`${cierre.dateTo.toISOString().slice(0, 10)}T00:00:00.000Z`);
      return (cierre.serviceId === null || cierre.serviceId === slot.serviceId) && dateValue >= desde && dateValue <= hasta;
    });

    if (
      dateKey !== bloque.fecha ||
      !schedule ||
      openMinutes === null ||
      closeMinutes === null ||
      closeMinutes <= openMinutes ||
      minutesInBogota(slot.startsAt) < openMinutes ||
      minutesInBogota(slot.endsAt) > closeMinutes ||
      tieneCierre
    ) {
      return {
        ok: false,
        code: "horario_no_disponible",
        message: "La franja no está disponible dentro del horario actual de la instalación.",
      };
    }
  }

  ordenados.sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime());

  if (ordenados.some((b) => b.slot.startsAt < now)) {
    return { ok: false, code: "franja_pasada", message: "Una de las franjas ya empezó o ya pasó." };
  }

  // El SCRUM fija franjas de una hora. Se valida contra la base.
  const duracionMs = 60 * 60 * 1000;
  const duracionIncorrecta = ordenados.find(
    (b) => Math.abs(b.slot.endsAt.getTime() - b.slot.startsAt.getTime() - duracionMs) > 1000,
  );
  if (duracionIncorrecta) {
    return {
      ok: false,
      code: "franja_duracion_invalida",
      message: "Esa franja no es de una hora. Elige otra.",
    };
  }

  // Dos bloques del mismo carrito no pueden pisarse. Borde compartido sí se permite.
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1].slot;
    const actual = ordenados[i].slot;
    if (actual.startsAt < anterior.endsAt) {
      return {
        ok: false,
        code: "bloques_pisados",
        message:
          `${actual.service.name} de las ${formatHoraCorta(actual.startsAt)} a las ` +
          `${formatHoraCorta(actual.endsAt)} se pisa con ${anterior.service.name} de las ` +
          `${formatHoraCorta(anterior.startsAt)} a las ${formatHoraCorta(anterior.endsAt)}.`,
      };
    }
  }

  const todosLosIndices = Array.from({ length: personas }, (_, i: number) => i);

  // Cada bloque necesita tantas personas como entran por su puerta.
  const asistentesPorBloque = new Map<string, number[]>();
  for (const b of ordenados) {
    const indices = b.asistentes ?? todosLosIndices;
    if (indices.length !== b.personas) {
      return {
        ok: false,
        code: "asistentes_inconsistentes",
        message: `En ${b.slot.service.name} marcaste ${indices.length} persona(s) pero declaraste ${b.personas}.`,
      };
    }
    if (new Set(indices).size !== indices.length) {
      return {
        ok: false,
        code: "asistentes_inconsistentes",
        message: `Repetiste una persona en ${b.slot.service.name}.`,
      };
    }
    const fueraDeRango = indices.find((i) => i < 0 || i >= personas);
    if (fueraDeRango !== undefined) {
      return {
        ok: false,
        code: "asistentes_inconsistentes",
        message: `Marcaste una persona que no está en la reserva de ${b.slot.service.name}.`,
      };
    }
    asistentesPorBloque.set(b.slot.id, [...indices].sort((a, c) => a - c));
  }

  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  const totalCop = ordenados.reduce((suma, b) => {
    const horas = Math.max(
      1,
      Math.round((b.slot.endsAt.getTime() - b.slot.startsAt.getTime()) / (60 * 60 * 1000)),
    );
    return suma + b.slot.service.price * horas * b.personas;
  }, 0);

  // El cobro es por hora y por zona: cada persona paga solo la franja a la que asiste.
  const unaSolaZona = ordenados.length === 1;
  const primero = ordenados[0].slot;
  const ultimo = ordenados[ordenados.length - 1].slot;

  // El cupo se toma con UPDATE condicional evaluado por PostgreSQL. Compara
  // columnas contra columnas (capacity >= bookedCount + heldCount + personas).
  // Así, si dos clientes toman el último cupo a la vez, solo uno obtiene
  // affectedRows = 1.
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return await db.$transaction(
        async (tx) => {
          // Libera holds vencidos dentro de la transacción: el inventario está
          // limpio antes de seguir.
          await liberarHoldsVencidos(now, tx);

          // Todos o nada: si un solo bloque pierde su cupo, la transacción se revierte.
          for (const b of ordenados) {
            const tomados = await tx.$executeRaw`
              UPDATE "ServiceSlot"
                 SET "heldCount" = "heldCount" + ${b.personas}
               WHERE id = ${b.slot.id}::uuid
                 AND "startsAt" > ${now}
                 AND "capacity" >= "bookedCount" + "heldCount" + ${b.personas}
            `;
            if (tomados !== 1) {
              throw new CupoAgotado(b.slot.service.name);
            }
          }

          const customer = await tx.customer.findUnique({
            where: { userId: customerId },
            select: {
              id: true,
              document: true,
              user: { select: { firstName: true, lastName: true } },
            },
          });
          if (!customer) {
            throw new Error("La sesión no corresponde a un cliente registrado.");
          }

          // Lock del cliente para serializar reservas y evitar solapes en peticiones paralelas.
          await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id}::uuid FOR UPDATE`;

          // Chequeo de solape ya con el lock tomado.
          for (const { slot } of ordenados) {
            const choque = await chocarConOtraReserva(tx, customer.id, slot.startsAt, slot.endsAt);
            if (choque) {
              throw new ChoqueHorario(
                `Ya tienes una reserva de ${choque.serviceName} de las ` +
                  `${formatHoraCorta(choque.startsAt)} a las ${formatHoraCorta(choque.endsAt)}. ` +
                  "No puedes reservar dos horarios que se pisen.",
              );
            }
          }

          const reserva = await tx.reservation.create({
            data: {
              customerId: customer.id,
              serviceId: primero.serviceId,
              categoryNameSnapshot: unaSolaZona
                ? primero.service.category.name
                : [...new Set(ordenados.map((b) => b.slot.service.category.name))].join(" + "),
              status: "pending_payment",
              channel: "online",
              quantity: personas,
              totalCop,
              startsAt: primero.startsAt,
              endsAt: ultimo.endsAt,
              slots: {
                create: ordenados.map((b) => ({ slotId: b.slot.id, quantity: b.personas })),
              },
              blocks: {
                create: ordenados.map((b) => ({
                  serviceId: b.slot.serviceId,
                  startsAt: b.slot.startsAt,
                  endsAt: b.slot.endsAt,
                  personas: b.personas,
                })),
              },
              holds: { create: { status: "active", expiresAt } },
            },
            select: { id: true },
          });

          // El grupo se crea aparte y en orden: el índice 0 es el titular.
          const grupo = [
            {
              fullName: `${customer.user.firstName} ${customer.user.lastName}`.trim(),
              document: customer.document ?? "SIN DOCUMENTO",
              isTitular: true,
            },
            ...acompañantes.map((g) => ({
              fullName: g.fullName,
              document: g.document,
              isTitular: false,
            })),
          ];
          const guestIds: string[] = [];
          for (const persona of grupo) {
            const creado = await tx.reservationGuest.create({
              data: { ...persona, reservationId: reserva.id },
              select: { id: true },
            });
            guestIds.push(creado.id);
          }

          // Quién entra por cada puerta (zona).
          const bloques = await tx.reservationBlock.findMany({
            where: { reservationId: reserva.id },
            select: { id: true, startsAt: true },
            orderBy: { startsAt: "asc" },
          });
          for (const [indice, bloque] of bloques.entries()) {
            const entrada = ordenados[indice];
            const indices = asistentesPorBloque.get(entrada.slot.id) ?? [];
            if (indices.length === 0) continue;
            await tx.reservationBlockGuest.createMany({
              data: indices.map((i) => ({ blockId: bloque.id, guestId: guestIds[i] })),
              skipDuplicates: true,
            });
          }

          const hold = await tx.reservationHold.findFirstOrThrow({
            where: { reservationId: reserva.id, status: "active" },
            select: { id: true },
          });

          // Cupos que quedan en la zona más ajustada.
          const masAjustada = ordenados.reduce((peor, b) =>
            b.slot.capacity - b.slot.bookedCount - b.slot.heldCount <
            peor.slot.capacity - peor.slot.bookedCount - peor.slot.heldCount
              ? b
              : peor,
          );

          return {
            ok: true,
            reservationId: reserva.id,
            holdId: hold.id,
            expiresAt,
            totalCop,
            personas,
            zonas: ordenados.length,
            cuposRestantes: Math.max(
              masAjustada.slot.capacity -
                masAjustada.slot.bookedCount -
                masAjustada.slot.heldCount,
              0,
            ),
          } satisfies CreateResult;
        },
        { maxWait: 10_000, timeout: 15_000 },
      );
    } catch (error) {
      if (error instanceof ChoqueHorario) {
        return { ok: false, code: "horario_chocante", message: error.message };
      }
      if (error instanceof CupoAgotado) {
        return {
          ok: false,
          code: "ya_reservado",
          message: `Otro cliente tomó los cupos de ${error.message.replace("Sin cupo en ", "")} justo ahora. Elige otra franja.`,
        };
      }
      if (intento < MAX_INTENTOS && esConflictoTransitorio(error)) {
        await new Promise((r) => setTimeout(r, 120 * intento));
        continue;
      }
      if (esConflictoTransitorio(error)) {
        return {
          ok: false,
          code: "ya_reservado",
          message: "La franja está muy solicitada. Intenta de nuevo en un momento.",
        };
      }
      throw error;
    }
  }

  return {
    ok: false,
    code: "ya_reservado",
    message: "La franja está muy solicitada. Intenta de nuevo en un momento.",
  };
}

/** Señal interna: el UPDATE condicional no encontró cupo. */
class CupoAgotado extends Error {
  constructor(servicio: string) {
    super(`Sin cupo en ${servicio}`);
    this.name = "CupoAgotado";
  }
}

/** Señal interna: la ventana pisa otra reserva viva del mismo cliente. */
class ChoqueHorario extends Error {}

/** Hora 24 h en America/Bogota, para los mensajes de error. */
function formatHoraCorta(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** Deadlock, conflicto de escritura o timeout esperando el lock de la fila. */
function esConflictoTransitorio(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const mensaje = `${error.name} ${error.message}`.toLowerCase();
  return (
    error.message.includes("P2034") ||
    mensaje.includes("p2028") ||
    mensaje.includes("deadlock") ||
    mensaje.includes("could not serialize") ||
    mensaje.includes("lock timeout") ||
    (mensaje.includes("transaction") && (mensaje.includes("timeout") || mensaje.includes("timed out")))
  );
}
