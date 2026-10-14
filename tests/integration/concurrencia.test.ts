/**
 * Fase 5.2: concurrencia real contra PostgreSQL (BD dev).
 *
 * Dos transacciones paralelas de `createReservationWithHold` pelean el último
 * cupo de la misma franja: el UPDATE condicional (`capacity >= booked + held
 * + personas`) deja pasar a una sola. Reloj congelado (now explícito) y filas
 * propias por test (sufijo único) con limpieza en `finally`.
 *
 * Requiere la BD de desarrollo levantada (`DATABASE_URL` del `.env`).
 */
import "dotenv/config";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";
import { createReservationWithHold } from "@/features/reservations/reservations.service";

// Martes 2026-10-20 08:00-09:00 Bogotá, con "ahora" congelado el 2026-10-10.
const AHORA = new Date("2026-10-10T15:00:00.000Z");
const INICIO = new Date("2026-10-20T13:00:00.000Z");
const FIN = new Date("2026-10-20T14:00:00.000Z");
const FECHA = "2026-10-20";

type Escenario = {
  sufijo: string;
  userIds: string[];
  serviceIds: string[];
  slotIds: string[];
  reservaIds: string[];
};

async function crearUsuario(indice: number, sufijo: string): Promise<string> {
  const role = await db.role.findFirstOrThrow({ where: { name: "user" } });
  const user = await db.user.create({
    data: {
      email: `carrera.${sufijo}.${indice}@ejemplo.com`,
      passwordHash: "hash-falso-solo-prueba-de-carrera",
      firstName: "Carrera",
      lastName: `Prueba ${indice}`,
      phone: "+573001234567",
      roleId: role.id,
      emailVerified: true,
    },
    select: { id: true },
  });
  await db.customer.create({
    data: { userId: user.id, document: `CARRERA-${sufijo}-${indice}` },
  });
  return user.id;
}

async function crearServicio(indice: number, sufijo: string) {
  const categoria = await db.category.create({
    data: { name: `Carrera ${sufijo} ${indice}`, slug: `carrera-${sufijo}-${indice}` },
    select: { id: true },
  });
  const servicio = await db.service.create({
    data: {
      categoryId: categoria.id,
      name: `Servicio carrera ${sufijo} ${indice}`,
      slug: `servicio-carrera-${sufijo}-${indice}`,
      price: 10000,
      capacity: 1,
    },
    select: { id: true },
  });
  await db.serviceSchedule.create({
    data: { serviceId: servicio.id, dayOfWeek: 2, openTime: "08:00", closeTime: "17:00" },
  });
  const slot = await db.serviceSlot.create({
    data: {
      serviceId: servicio.id,
      startsAt: INICIO,
      endsAt: FIN,
      capacity: 1,
    },
    select: { id: true },
  });
  return { serviceId: servicio.id, slotId: slot.id };
}

function payload(serviceId: string, slotId: string) {
  return {
    personas: 1,
    acompañantes: [],
    bloques: [{ serviceId, slotId, fecha: FECHA, personas: 1 }],
  };
}

async function limpiar(esc: Escenario): Promise<void> {
  if (esc.reservaIds.length > 0) {
    const bloques = await db.reservationBlock.findMany({
      where: { reservationId: { in: esc.reservaIds } },
      select: { id: true },
    });
    const bloqueIds = bloques.map((b) => b.id);
    if (bloqueIds.length > 0) {
      await db.reservationBlockGuest.deleteMany({ where: { blockId: { in: bloqueIds } } });
    }
    await db.reservationBlock.deleteMany({ where: { reservationId: { in: esc.reservaIds } } });
    await db.reservationGuest.deleteMany({ where: { reservationId: { in: esc.reservaIds } } });
    await db.reservationSlot.deleteMany({ where: { reservationId: { in: esc.reservaIds } } });
    await db.reservationHold.deleteMany({ where: { reservationId: { in: esc.reservaIds } } });
    await db.reservation.deleteMany({ where: { id: { in: esc.reservaIds } } });
  }
  if (esc.slotIds.length > 0) {
    await db.serviceSlot.deleteMany({ where: { id: { in: esc.slotIds } } });
  }
  if (esc.serviceIds.length > 0) {
    await db.serviceSchedule.deleteMany({ where: { serviceId: { in: esc.serviceIds } } });
    await db.service.deleteMany({ where: { id: { in: esc.serviceIds } } });
  }
  await db.category.deleteMany({ where: { slug: { startsWith: `carrera-${esc.sufijo}` } } });
  if (esc.userIds.length > 0) {
    await db.customer.deleteMany({ where: { userId: { in: esc.userIds } } });
    await db.user.deleteMany({ where: { id: { in: esc.userIds } } });
  }
}

afterAll(async () => {
  await db.$disconnect();
});

describe("concurrencia real por el último cupo (Fase 5.2)", () => {
  it("dos clientes en paralelo: solo uno gana y el otro ve ya_reservado", { timeout: 60_000 }, async () => {
    const sufijo = `ultimo-${Date.now()}`;
    const esc: Escenario = { sufijo, userIds: [], serviceIds: [], slotIds: [], reservaIds: [] };
    try {
      const [userA, userB] = await Promise.all([
        crearUsuario(1, sufijo),
        crearUsuario(2, sufijo),
      ]);
      esc.userIds.push(userA, userB);
      const { serviceId, slotId } = await crearServicio(1, sufijo);
      esc.serviceIds.push(serviceId);
      esc.slotIds.push(slotId);

      const [rA, rB] = await Promise.all([
        createReservationWithHold(userA, payload(serviceId, slotId), AHORA),
        createReservationWithHold(userB, payload(serviceId, slotId), AHORA),
      ]);

      const ganadas = [rA, rB].filter((r) => r.ok);
      const perdidas = [rA, rB].filter((r) => !r.ok);
      expect(ganadas).toHaveLength(1);
      expect(perdidas).toHaveLength(1);
      expect(perdidas[0]).toMatchObject({ ok: false, code: "ya_reservado" });
      if (ganadas[0].ok) esc.reservaIds.push(ganadas[0].reservationId);

      // El inventario refleja exactamente un cupo retenido, no dos.
      const slot = await db.serviceSlot.findUniqueOrThrow({
        where: { id: slotId },
        select: { heldCount: true, bookedCount: true },
      });
      expect(slot.heldCount).toBe(1);
      expect(slot.bookedCount).toBe(0);
    } finally {
      await limpiar(esc);
    }
  });

  it("el mismo cliente en paralelo no duplica: la segunda choca en horario", { timeout: 60_000 }, async () => {
    const sufijo = `solape-${Date.now()}`;
    const esc: Escenario = { sufijo, userIds: [], serviceIds: [], slotIds: [], reservaIds: [] };
    try {
      const [user] = await Promise.all([crearUsuario(1, sufijo)]);
      esc.userIds.push(user);
      // Dos instalaciones distintas a la misma hora: hay cupo en ambas, así
      // que si la segunda falla es por solape, no por falta de inventario.
      const [s1, s2] = await Promise.all([crearServicio(1, sufijo), crearServicio(2, sufijo)]);
      esc.serviceIds.push(s1.serviceId, s2.serviceId);
      esc.slotIds.push(s1.slotId, s2.slotId);

      const [r1, r2] = await Promise.all([
        createReservationWithHold(user, payload(s1.serviceId, s1.slotId), AHORA),
        createReservationWithHold(user, payload(s2.serviceId, s2.slotId), AHORA),
      ]);

      const ganadas = [r1, r2].filter((r) => r.ok);
      const perdidas = [r1, r2].filter((r) => !r.ok);
      expect(ganadas).toHaveLength(1);
      expect(perdidas).toHaveLength(1);
      expect(perdidas[0]).toMatchObject({ ok: false, code: "horario_chocante" });
      if (ganadas[0].ok) esc.reservaIds.push(ganadas[0].reservationId);
    } finally {
      await limpiar(esc);
    }
  });
});
