// Lógica de reserva: bloqueos temporales, confirmación, liberación, solape y ventana.
import type { Prisma } from "@prisma/client";

import { db } from "@/shared/lib/db";
import { esDiaDeMantenimiento, ultimoDiaReservable } from "@/features/schedules/colombia-holidays";
import type { CreateReservationInput } from "./reservations.schemas";

// ---------------------------------------------------------------------------
// Creación de la reserva con bloqueo temporal.
//
// Reglas del SCRUM que se respetan aquí:
//   - La anticipación máxima es de 3 meses.
//   - El cobro es por hora y todos los servicios cobran igual (precio * horas).
//   - Al iniciar el pago se bloquea la franja 10 minutos.
//   - El control de cupos se resuelve en la base de datos, no en JavaScript.
//
// Lo que NO hace este archivo (le toca al equipo): cobrar por Stripe, generar
// los QR y enviarlos por correo. Aquí la reserva queda en pending_payment con su
// bloqueo; el pago la mueve a confirmed y ahí se emiten los QR.
// ---------------------------------------------------------------------------

export const HOLD_MINUTES = 10;
/** Reintentos cuando varias reservas chocan por el lock de la misma franja. */
const MAX_INTENTOS = 3;
const BOGOTA = "America/Bogota";

function dateKeyBogota(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayOfWeekBogota(dateKey: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA,
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00-05:00`));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

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

function parseScheduleMinutes(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

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

/** Anteposición máxima: hoy Bogotá + 3 meses calendario (una sola definición). */
function fechaLimiteReserva(now: Date): string {
  return ultimoDiaReservable(dateKeyBogota(now));
}

/** El SCRUM no permite reservar fechas anteriores. Se compara por día calendario
 *  en America/Bogota: hoy nunca es pasado, aunque ya hayan pasado las 00:00. */
export function isPastDate(date: string, now: Date): boolean {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return date < hoy;
}

/**
 * Cliente mínimo para hablar con reservas, holds y franjas. Acepta tanto el
 * cliente suelto como el de una transacción en curso, para que estas dos
 * funciones se puedan usar dentro y fuera de una.
 */
type ClienteReserva = Pick<
  Prisma.TransactionClient,
  "reservation" | "reservationBlock" | "reservationHold" | "$executeRaw"
>;

/**
 * Devuelve al inventario los cupos de las reservas cuyo bloqueo de 10 minutos
 * venció sin pago.
 *
 * Sin esta pasada, abandonar el checkout quema cupos para siempre: `heldCount`
 * solo baja cuando un pago se convierte en reserva, y ese camino todavía no
 * existe (es del equipo de Stripe). El cliente ve "franja completa" sin que
 * nadie haya pagado nunca.
 *
 * Se marca la reserva como `expired` y el hold como `released` (estados que ya
 * existían en el enum y que la interfaz de admin ya sabe mostrar). El `update`
 * condicionado por estado hace que la operación sea idempotente: si dos
 * peticiones intentan expirar la misma reserva, solo una devuelve cupos.
 */
/**
 * Libera los holds vencidos y devuelve sus cupos al inventario.
 *
 * P2-4: `limite` acota el trabajo por llamada (50 por defecto). Las lecturas
 * de disponibilidad y la escritura llaman con el default para no frenar cada
 * apertura de calendario con un barrido total; el cron pasa `null` (sin
 * límite) porque ese sí es su trabajo. La operación es idempotente, así que
 * lo que no alcance una pasada lo toma la siguiente.
 *
 * `alExpirar` avisa por cada reserva que ESTA llamada expiró (solo
 * la gana quien marcó el update condicional, así no hay doble aviso). Las
 * lecturas no lo pasan: el aviso sale únicamente del barrido del cron, no en
 * mitad de la consulta del calendario de otro cliente.
 */
export async function liberarHoldsVencidos(
  now: Date = new Date(),
  cliente: ClienteReserva = db,
  limite: number | null = 50,
  alExpirar?: (reservationId: string) => void | Promise<void>,
): Promise<number> {
  // Los cupos se devuelven con la cantidad de la tabla puente, no con la del
  // hold: así una reserva de varias franjas devuelve exactamente lo que tomó.
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

/**
 * Un cliente no puede tener dos reservas que se solapen, aunque sean de
 * instalaciones o categorías distintas (SCRUM sección 11).
 *
 * Solo se consideran las que siguen vivas: pending_payment, payment_processing
 * y confirmed. Una reserva rechazada, expirada o ya usada no bloquea el horario,
 * y una `pending_payment` con el bloqueo vencido tampoco (ya fue liberada por
 * `liberarHoldsVencidos`).
 *
 * Esta comprobación DEBE ejecutarse con el cliente de la transacción y después
 * de tomar el lock del cliente: si corriera por fuera, dos peticiones
 * simultáneas del mismo usuario pasarían las dos y dejarían reservas solapadas.
 */
async function chocarConOtraReserva(
  cliente: ClienteReserva,
  customerRowId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<{ startsAt: Date; endsAt: Date; serviceName: string } | null> {
  // Se consulta ReservationBlock y no Reservation: una reserva puede abarcar
  // varias zonas, así que su ventana global es la unión de todas y rechazaría
  // horarios que en realidad están libres. El bloque es el tramo real.
  const choque = await cliente.reservationBlock.findFirst({
    where: {
      reservation: {
        customerId: customerRowId,
        status: { in: ["pending_payment", "payment_processing", "confirmed"] },
      },
      // Solape real: empieza antes de que termine el otro y termina despues de
      // que empiece. Un borde compartido (10-11 y 11-12) no choca.
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

  // Sin bloques repetidos: el mismo slot dos veces en un carrito es un error de
  // la interfaz, no dos cupos distintos.
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
    // cierra el complejo igual que si no hubiera horario: la escritura lo
    // defiende, no solo la lectura del calendario.
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
  // Se conserva el bloque pedido junto a su franja: `personas` y `asistentes`
  // son datos del cliente, no de la base.
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

    // Desactivada por el admin: ni con franja generada se vende.
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

  // El SCRUM fija franjas de una hora. Se valida contra la base y no se confía en
  // la pantalla: si alguien configurara un horario que generara franjas de otra
  // duración, la reserva se rechaza en vez de cobrar mal.
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

  // Dos bloques del mismo carrito no pueden pisarse: es la misma persona en dos
  // sitios a la vez. El borde compartido (08-09 y 09-10) sí se permite.
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

  // Cada bloque necesita tantas personas como las que entran por su puerta.
  for (const b of ordenados) {
    const libres = b.slot.capacity - b.slot.bookedCount - b.slot.heldCount;
    if (b.personas > libres) {
      return {
        ok: false,
        code: "sin_cupos",
        message:
          libres <= 0
            ? `${b.slot.service.name} está completa en esa franja.`
            : `En ${b.slot.service.name} solo quedan ${libres} cupo(s) para esa franja.`,
      };
    }
  }

  // Resolver QUIÉN va a cada zona. El grupo completo es `personas` (titular en
  // el índice 0); cada bloque declara a quiénes recibe por su puerta. Con esto
  // una persona puede pasar solo por una zona y entrar en grupo a otra.
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

  // Los cupos vencidos se recuperan DENTRO de la transacción (ver abajo): así
  // la limpieza, el lock, el chequeo de solape y la creación son atómicos y el
  // choque no ve holds que ya expiraron pero aún no se liberaron (P2-2).
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  const totalCop = ordenados.reduce((suma, b) => {
    const horas = Math.max(
      1,
      Math.round((b.slot.endsAt.getTime() - b.slot.startsAt.getTime()) / (60 * 60 * 1000)),
    );
    return suma + b.slot.service.price * horas * b.personas;
  }, 0);

  // El cobro es por hora y **por zona**: cada persona paga solo la franja a la
  // que asiste. Ir solo a la cancha no cuesta lo mismo que ir con tres amigos.

  const unaSolaZona = ordenados.length === 1;
  const primero = ordenados[0].slot;
  const ultimo = ordenados[ordenados.length - 1].slot;

  // El cupeo se toma con un UPDATE condicional evaluado por PostgreSQL en el
  // momento de escribir: compara columnas contra columnas, cosa que Prisma no
  // puede hacer con un where. Así, si dos clientes toman el último cupo a la vez,
  // solo uno obtiene affectedRows = 1 (sección 23 y 26 del SCRUM).
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return await db.$transaction(
        async (tx) => {
          // Primero se liberan los holds vencidos, con el cliente de la
          // transacción: lo que sigue (cupos, lock, solape, creación) ve el
          // inventario ya limpio y nada se cuela en la carrera.
          await liberarHoldsVencidos(now, tx);

          // Todos o nada: si un solo bloque pierde su cupo, la transacción
          // entera se revierte y no queda ninguna franja retenida a medias.
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

          // Serializar las reservas de este cliente. El lock se toma ANTES de
          // mirar si se solapa: así la segunda petición que llega en paralelo
          // espera a que la primera confirme y sí la ve, en vez de pasar las dos.
          await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id}::uuid FOR UPDATE`;

          // Ya con el lock tomado, el chequeo de solape es fiable. Se compara
          // bloque a bloque y no contra la ventana global de la reserva: un
          // carrito de piscina 08-09 y baloncesto 10-11 no puede pisarse con un
          // baloncesto de 09-10, aunque su ventana global (08-11) lo sugiera.
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
              // serviceId y la ventana global se siguen llenando porque otras
              // partes (listados, correos, reportes) los leen. La fuente de
              // verdad de las zonas son los bloques: con una sola zona, serviceId
              // y la ventana coinciden exactamente con el bloque.
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

          // El grupo se crea aparte y EN ORDEN, porque el índice de persona es
          // lo que usa el cliente para decir quién va a cada zona: 0 es el
          // titular, 1 el primer acompañante, y así. Por eso no se anida en el
          // create de la reserva: ahí no se podrían leer los ids generados.
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

          // Quién entra por cada puerta.
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

          // Cupos que quedan en la zona más ajustada: es el número que decide si el
          // carrito sigue entrando por el lado estrecho.
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
      // El cliente ya tiene algo en ese horario: es una regla, no un fallo.
      if (error instanceof ChoqueHorario) {
        return { ok: false, code: "horario_chocante", message: error.message };
      }
      // Cupo tomado por otro mientras esperábamos: no es un fallo, es la regla.
      if (error instanceof CupoAgotado) {
        return {
          ok: false,
          code: "ya_reservado",
          message: `Otro cliente tomó los cupos de ${error.message.replace("Sin cupo en ", "")} justo ahora. Elige otra franja.`,
        };
      }
      // Varias reservas contending por la misma fila se bloquean entre sí.
      // Se reintenta: en el último intento se devuelve un 409 legible.
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

/** Señal interna: el UPDATE condicional no találó cupo. */
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
    // P2034: fallo por conflicto de escritura o deadlock.
    error.message.includes("P2034") ||
    // P2028: la transacción se abortó por timeout.
    mensaje.includes("p2028") ||
    mensaje.includes("deadlock") ||
    mensaje.includes("could not serialize") ||
    mensaje.includes("lock timeout") ||
    (mensaje.includes("transaction") && (mensaje.includes("timeout") || mensaje.includes("timed out")))
  );
}