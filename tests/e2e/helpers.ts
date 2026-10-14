/**
 * Fixtures compartidos de los E2E (Fase 5.3). Todo lo que se crea lleva un
 * sufijo único por corrida y cada spec lo borra en su limpieza: la BD dev
 * queda igual que antes.
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import type { Page, Request } from "@playwright/test";
import { expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { esDiaDeMantenimiento } from "@/features/schedules/colombia-holidays";

/**
 * Cliente Prisma para specs. Pool mínimo (2): los 4 specs corren en paralelo
 * contra el pooler (session mode, 15 conexiones) y un pool por defecto lo
 * tumba ("Response from the Engine was empty").
 */
export function clienteDb(): PrismaClient {
  const base = process.env.DATABASE_URL ?? "";
  const separador = base.includes("?") ? "&" : "?";
  return new PrismaClient({
    datasources: { db: { url: `${base}${separador}connection_limit=2&pool_timeout=20` } },
  });
}

/**
 * Login por API + trasplante de cookie. En `next start` (producción) la
 * cookie `session` sale con `Secure` y el navegador la rechaza sobre http:
 * se reinyecta sin el flag. El formulario de login ya está cubierto por
 * `auth.spec.ts`; acá importa la sesión, no el transporte del login.
 */
export async function iniciarSesion(
  page: Page,
  request: Request,
  email: string,
  password: string,
): Promise<void> {
  const resp = await request.post("/api/auth/login", { data: { email, password } });
  expect(resp.status()).toBe(200);
  const setCookie = resp.headers()["set-cookie"] ?? "";
  const valor = setCookie.match(/session=([^;]+)/)?.[1];
  expect(valor, "el login debe fijar la cookie session").toBeTruthy();
  await page.context().addCookies([
    {
      name: "session",
      value: valor as string,
      url: "http://localhost:3101",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export function sufijoUnico(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/** Clave Bogotá YYYY-MM-DD. */
export function claveBogota(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

/** Día de la semana Bogotá (0 domingo … 6 sábado) de una fecha. */
export function diaSemanaBogota(fecha: Date): number {
  const clave = claveBogota(fecha);
  return new Date(`${clave}T12:00:00Z`).getUTCDay();
}

/**
 * Próxima fecha reservable a mediodía Bogotá dentro de `dias`: no pasada,
 * no mantenimiento y dentro de la ventana de 3 meses.
 */
export function proximaFechaValida(dias = 14): { inicio: Date; fin: Date; fecha: string } {
  for (let d = dias; d < dias + 30; d++) {
    const inicio = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    inicio.setUTCHours(13, 0, 0, 0);
    const fecha = claveBogota(inicio);
    if (!esDiaDeMantenimiento(fecha)) {
      return { inicio, fin: new Date(inicio.getTime() + 60 * 60 * 1000), fecha };
    }
  }
  throw new Error("Sin fecha válida para el fixture E2E");
}

export async function crearCliente(db: PrismaClient, sufijo: string, indice: number): Promise<string> {
  const role = await db.role.findFirstOrThrow({ where: { name: "user" } });
  const user = await db.user.create({
    data: {
      email: `e2e.${sufijo}.${indice}@ejemplo.com`,
      passwordHash: "hash-falso-solo-e2e",
      firstName: "E2e",
      lastName: `Cliente ${indice}`,
      phone: "+573001234567",
      roleId: role.id,
      emailVerified: true,
    },
    select: { id: true },
  });
  await db.customer.create({
    // ≤20 por construcción (sin slice: cortaría la parte única): ts en base36
    // + azar + índice al final.
    data: {
      userId: user.id,
      document: `E2E${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}${indice}`,
    },
  });
  return user.id;
}

export async function crearServicioConFranja(
  db: PrismaClient,
  sufijo: string,
  indice: number,
  ventana: { inicio: Date; fin: Date; fecha: string },
  capacidad = 5,
): Promise<{ serviceId: string; slotId: string; serviceName: string }> {
  const serviceName = `E2E Servicio ${sufijo} ${indice}`;
  const categoria = await db.category.create({
    data: { name: `E2E Cat ${sufijo} ${indice}`, slug: `e2e-cat-${sufijo}-${indice}` },
    select: { id: true },
  });
  const servicio = await db.service.create({
    data: {
      categoryId: categoria.id,
      name: serviceName,
      slug: `e2e-servicio-${sufijo}-${indice}`,
      price: 10000,
      capacity: capacidad,
    },
    select: { id: true },
  });
  await db.serviceSchedule.create({
    data: {
      serviceId: servicio.id,
      dayOfWeek: diaSemanaBogota(ventana.inicio),
      openTime: "08:00",
      closeTime: "17:00",
    },
  });
  const slot = await db.serviceSlot.create({
    data: {
      serviceId: servicio.id,
      startsAt: ventana.inicio,
      endsAt: ventana.fin,
      capacity: capacidad,
    },
    select: { id: true },
  });
  return { serviceId: servicio.id, slotId: slot.id, serviceName };
}

/** Borra en orden de dependencias todo lo creado con un sufijo. */
export async function limpiarSufijo(
  db: PrismaClient,
  sufijo: string,
  reservaIds: string[],
): Promise<void> {
  if (reservaIds.length > 0) {
    const bloques = await db.reservationBlock.findMany({
      where: { reservationId: { in: reservaIds } },
      select: { id: true },
    });
    const bloqueIds = bloques.map((b) => b.id);
    if (bloqueIds.length > 0) {
      await db.reservationBlockGuest.deleteMany({ where: { blockId: { in: bloqueIds } } });
    }
    await db.reservationBlock.deleteMany({ where: { reservationId: { in: reservaIds } } });
    await db.reservationGuest.deleteMany({ where: { reservationId: { in: reservaIds } } });
    await db.reservationSlot.deleteMany({ where: { reservationId: { in: reservaIds } } });
    await db.reservationHold.deleteMany({ where: { reservationId: { in: reservaIds } } });
    // Los accesos referencian al QR: van antes que los QR.
    await db.access.deleteMany({
      where: { qrToken: { reservationId: { in: reservaIds } } },
    });
    await db.qrToken.deleteMany({ where: { reservationId: { in: reservaIds } } });
    await db.reservation.deleteMany({ where: { id: { in: reservaIds } } });
  }
  await db.serviceSlot.deleteMany({ where: { service: { slug: { startsWith: `e2e-servicio-${sufijo}` } } } });
  await db.serviceSchedule.deleteMany({
    where: { service: { slug: { startsWith: `e2e-servicio-${sufijo}` } } },
  });
  await db.service.deleteMany({ where: { slug: { startsWith: `e2e-servicio-${sufijo}` } } });
  await db.category.deleteMany({ where: { slug: { startsWith: `e2e-cat-${sufijo}` } } });
  const usuarios = await db.user.findMany({
    where: { email: { startsWith: `e2e.${sufijo}.` } },
    select: { id: true },
  });
  const userIds = usuarios.map((u) => u.id);
  if (userIds.length > 0) {
    await db.customer.deleteMany({ where: { userId: { in: userIds } } });
    // El registro emite códigos: van antes que el usuario (FK).
    await db.emailVerification.deleteMany({ where: { userId: { in: userIds } } });
    await db.passwordReset.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

/** Hash del token tal como lo guarda la emisión (SHA-256 hex). */
export function hashTokenCrudo(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
