import { NextRequest, NextResponse } from "next/server";

import {
  buildAccessWhere,
  buildReservationWhere,
  listCustomers,
  listEmployees,
  listServices,
} from "@/features/admin/admin.repository";
import { db } from "@/shared/lib/db";
import { fail } from "@/shared/http/api-response";
import { handler } from "@/shared/http/handler";
import { requireRole } from "@/shared/auth/require-role";

// Exportación CSV del módulo admin. Solo lectura, respeta filtros por query.
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))];
  return `﻿${lines.join("\r\n")}`;
}

function fullNameOf(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

const VALID_TYPES = ["reservas", "accesos", "servicios", "empleados", "clientes"] as const;

export const GET = handler(async (req: NextRequest) => {
  await requireRole("admin");

  const params = req.nextUrl.searchParams;
  const tipo = params.get("tipo") ?? "";
  if (!(VALID_TYPES as readonly string[]).includes(tipo)) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Tipo de reporte inválido"), { status: 400 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${tipo}-${stamp}.csv`;
  let csv = "";

  if (tipo === "reservas") {
    const where = buildReservationWhere({
      status: params.get("estado") || undefined,
      serviceId: params.get("servicio") || undefined,
      channel: params.get("canal") || undefined,
      from: params.get("desde") || undefined,
      to: params.get("hasta") || undefined,
      q: params.get("q") || undefined,
    });
    const rows = await db.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: {
        customer: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        service: { include: { category: { select: { name: true } } } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { qrTokens: true } },
      },
    });
    csv = toCsv(
      ["ID", "Creada", "Cliente", "Documento", "Correo", "Servicio", "Categoría", "Canal", "Inicio", "Fin", "Cupos", "Total COP", "Estado", "Último pago", "QR emitidos"],
      rows.map((r) => [
        r.id,
        r.createdAt.toISOString(),
        fullNameOf(r.customer.user.firstName, r.customer.user.lastName),
        r.customer.document ?? "",
        r.customer.user.email,
        r.service.name,
        r.service.category.name,
        r.channel,
        r.startsAt.toISOString(),
        r.endsAt.toISOString(),
        r.quantity,
        r.totalCop,
        r.status,
        r.payments[0]?.status ?? "",
        r._count.qrTokens,
      ]),
    );
  }

  if (tipo === "accesos") {
    const where = buildAccessWhere({
      result: params.get("resultado") || undefined,
      serviceId: params.get("servicio") || undefined,
      from: params.get("desde") || undefined,
      to: params.get("hasta") || undefined,
      q: params.get("q") || undefined,
    });
    const rows = await db.access.findMany({
      where,
      orderBy: { accessedAt: "desc" },
      take: 5000,
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        qrToken: {
          include: {
            reservation: {
              include: {
                customer: { include: { user: { select: { firstName: true, lastName: true } } } },
                service: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    csv = toCsv(
      ["ID", "Fecha y hora", "Cliente", "Servicio", "QR", "Empleado que autorizó", "Resultado", "Motivo"],
      rows.map((a) => [
        a.id,
        a.accessedAt.toISOString(),
        fullNameOf(
          a.qrToken.reservation.customer.user.firstName,
          a.qrToken.reservation.customer.user.lastName,
        ),
        a.qrToken.reservation.service.name,
        a.qrToken.seqNo,
        fullNameOf(a.employee.user.firstName, a.employee.user.lastName),
        a.result,
        a.denialReason ?? "",
      ]),
    );
  }

  if (tipo === "servicios") {
    const rows = await listServices();
    csv = toCsv(
      ["ID", "Servicio", "Categoría", "Precio COP", "Capacidad", "Días con horario", "Próximas reservas"],
      rows.map((s) => [
        s.id,
        s.name,
        s.category.name,
        s.price,
        s.capacity,
        s.serviceSchedules.length,
        s._count.reservations,
      ]),
    );
  }

  if (tipo === "empleados") {
    const rows = await listEmployees();
    csv = toCsv(
      ["Nombre", "Documento", "Correo", "Teléfono", "Activo", "Zonas asignadas", "Accesos validados"],
      rows.map((e) => [
        fullNameOf(e.user.firstName, e.user.lastName),
        e.document,
        e.user.email,
        e.user.phone ?? "",
        e.user.isActive && e.isActive ? "Sí" : "No",
        e.assignments.map((a) => a.service.name).join(" | "),
        e._count.accesses,
      ]),
    );
  }

  if (tipo === "clientes") {
    const { rows } = await listCustomers();
    csv = toCsv(
      ["Nombre", "Documento", "Correo", "Teléfono", "Nacimiento", "Reservas", "Cuenta activa"],
      rows.map((c) => [
        fullNameOf(c.user.firstName, c.user.lastName),
        c.document ?? "",
        c.user.email,
        c.user.phone ?? "",
        c.birthDate ? new Date(c.birthDate).toISOString().slice(0, 10) : "",
        c._count.reservations,
        c.user.isActive ? "Sí" : "No",
      ]),
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
