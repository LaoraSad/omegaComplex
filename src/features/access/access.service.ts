// -----------------------------------------------------------------------------
// src/features/access/access.service.ts
// Orquesta la validación de QR (sección 16 del SCRUM) y la concesión de acceso
// (sección 17). El acceso nunca es automático: el empleado consulta la ficha y
// confirma con un segundo paso.
// -----------------------------------------------------------------------------

import { formatClock, formatInTimeZone } from "./access-dates";
import {
  findEmployeeByUserId,
  findQrByTokenHash,
  grantAccess,
  huboDenegacionReciente,
  marcarQrExpirado,
  type EmployeeForAccess,
} from "./access.repository";
import type {
  AccessGrant,
  AccessLookup,
  DenialCode,
  DenialReason,
  ReservationSummary,
  ZoneInfo,
} from "./access.types";

// -----------------------------------------------------------------------------
// getEmployeeAccessContext(userId)
// Obtiene el contexto de acceso de un empleado: sus zonas asignadas y si está
// activo. Usado por el empleado para saber qué instalaciones puede validar.
// -----------------------------------------------------------------------------
export async function getEmployeeAccessContext(userId: string) {
  return findEmployeeByUserId(userId);
}

// -----------------------------------------------------------------------------
// denied(code, message)
// Crea una respuesta de acceso denegado con código y motivo.
// -----------------------------------------------------------------------------
function denied(code: DenialCode, message: string): AccessLookup {
  return { outcome: "denied", denial: { code, message } };
}

// -----------------------------------------------------------------------------
// lookupAccess(rawToken, employee)
// Valida un QR escaneado y devuelve la ficha de la reserva. Todas las reglas se
// evalúan en el servidor; el cliente no decide nada.
// Reglas validadas (orden):
//   1. Empleado activo y su usuario activo.
//   2. El QR debe existir (buscado por tokenHash).
//   3. La reserva debe estar confirmada.
//   4. El QR no debe haber sido usado antes (uso único).
//   5. El QR no debe estar expirado.
//   6. No debe existir un acceso previo registrado para este QR.
//   7. La fecha del QR debe ser hoy (zona Bogotá).
//   8. La hora actual debe estar dentro de la franja reservada.
//      - Si aún no empieza: denegado (cliente debe esperar).
//      - Si ya terminó: se marca el QR como expirado y se deniega.
//   9. Si el QR no pertenece a la zona del empleado, no se deniega: se indica
//      que el empleado debe acompañar al cliente a la zona correcta.
// -----------------------------------------------------------------------------
export async function lookupAccess(rawToken: string, employee: EmployeeForAccess): Promise<AccessLookup> {
  if (!employee.isActive || !employee.userIsActive) {
    return denied("empleado_inactivo", "Tu usuario esta desactivado. Avisa al administrador.");
  }

  // 1. El QR debe existir.
  const qr = await findQrByTokenHash(rawToken);
  if (!qr) {
    return denied("qr_invalido", "Este codigo QR no pertenece a ninguna reserva.");
  }

  const summary: ReservationSummary = {
    reservationId: qr.reservationId,
    seqNo: qr.seqNo,
    qrStatus: qr.qrStatus,
    status: qr.reservationStatus,
    channel: qr.reservationChannel,
    quantity: qr.reservationQuantity,
    startsAt: qr.startsAt,
    endsAt: qr.endsAt,
    customerName: `${qr.customerFirstName} ${qr.customerLastName}`.trim(),
    customerDocument: qr.customerDocument,
    // Quien trae el QR. Puede no ser quien hizo la reserva.
    personName: qr.guestName,
    personDocument: qr.guestDocument,
    personIsTitular: qr.guestIsTitular,
    // Zona: con bloque usa el servicio del bloque; sin bloque usa el de la reserva.
    zone: qr.serviceId
      ? { serviceId: qr.serviceId, serviceName: qr.serviceName, categoryName: qr.categoryName }
      : { serviceId: "", serviceName: "Zona no definida", categoryName: "Sin zona" },
  };

  // 3. La reserva debe estar confirmada.
  if (qr.reservationStatus !== "confirmed") {
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "reserva_no_confirmada",
        message: `La reserva esta ${labelReservationStatus(qr.reservationStatus)}. Solo ingresan reservas confirmadas.`,
      },
    };
  }

  // 4. Uso único: el QR no debe haberse usado antes.
  if (qr.qrStatus === "used" || qr.qrUsedAt) {
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "qr_ya_utilizado",
        message: "Este QR ya fue utilizado. No se permite el reingreso.",
      },
    };
  }

  // 5. El QR no debe estar expirado.
  if (qr.qrStatus === "expired") {
    return {
      outcome: "denied",
      reservation: summary,
      denial: { code: "qr_expirado", message: "Este QR esta expirado." },
    };
  }

  // 6. El acceso no debe haberse registrado antes para este QR.
  if (qr.accessCount > 0) {
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "acceso_ya_registrado",
        message: "Ya existe un ingreso registrado con este QR.",
      },
    };
  }

  // 7. Debe corresponder a la fecha actual (Bogotá).
  const now = new Date();
  if (!isSameBogotaDay(now, qr.startsAt)) {
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "fecha_distinta",
        message: `Esta reserva es del ${formatInTimeZone(qr.startsAt, "d MMM yyyy")}. Hoy no puede usarse.`,
      },
    };
  }

  // 8. La hora actual debe estar dentro de la franja.
  if (now < qr.startsAt) {
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "franja_no_iniciada",
        message: `La franja empieza a las ${formatClock(qr.startsAt)}. El cliente debe esperar.`,
      },
    };
  }
  if (now > qr.endsAt) {
    // La franja terminó: se marca el QR como expirado para que el panel lo refleje.
    await marcarQrExpirado(qr.qrTokenId);
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "franja_terminada",
        message: `La franja termino a las ${formatClock(qr.endsAt)}. No se puede dar acceso.`,
      },
    };
  }

  // 9. Zona del empleado: si el QR no es de una zona asignada al empleado,
  //    no se deniega; se avisa para que acompañe al cliente a la zona correcta.
  const reservationZone: ZoneInfo = summary.zone;
  const employeeZones: ZoneInfo[] = employee.zones.map((z) => ({
    serviceId: z.serviceId,
    serviceName: z.serviceName,
    categoryName: z.categoryName,
  }));
  const inZone = employeeZones.some((z) => z.serviceId === reservationZone.serviceId);

  return {
    outcome: "allowed",
    reservation: summary,
    ...(inZone ? {} : { outsideEmployeeZone: { reservationZone, employeeZones } }),
  };
}

// -----------------------------------------------------------------------------
// confirmAccess(input)
// Confirma el ingreso. Solo el empleado lo dispara. Repite la validación dentro
// de la transacción (lookupAccess) para no confiar en la consulta anterior y
// evitar condiciones de carrera entre empleados.
// -----------------------------------------------------------------------------
export async function confirmAccess(input: {
  rawToken: string;
  employee: EmployeeForAccess;
}): Promise<
  | { ok: true; grant: AccessGrant }
  | { ok: false; code: DenialCode; message: string }
> {
  if (!input.employee.isActive || !input.employee.userIsActive) {
    return { ok: false, code: "empleado_inactivo", message: "Tu usuario esta desactivado." };
  }

  const qr = await findQrByTokenHash(input.rawToken);
  if (!qr) {
    return { ok: false, code: "qr_invalido", message: "Este codigo QR no pertenece a ninguna reserva." };
  }

  const previous = await lookupAccess(input.rawToken, input.employee);
  if (previous.outcome !== "allowed" || !previous.reservation) {
    return {
      ok: false,
      code: previous.denial?.code ?? "qr_invalido",
      message: previous.denial?.message ?? "El QR ya no es valido.",
    };
  }

  const granted = await grantAccess({
    qrTokenId: qr.qrTokenId,
    employeeId: input.employee.id,
    result: "allowed",
    denialReason: null,
  });

  if (!granted.ok) {
    // Otro empleado consumió el QR entre la consulta y la confirmación.
    return {
      ok: false,
      code: "qr_ya_utilizado",
      message: "Otro ingreso con este QR se registro primero. No se puede dar acceso.",
    };
  }

  return {
    ok: true,
    grant: {
      accessId: granted.accessId,
      accessedAt: granted.accessedAt,
      personName: previous.reservation.personName,
      customerName: previous.reservation.customerName,
      zone: previous.reservation.zone,
    },
  };
}

// -----------------------------------------------------------------------------
// recordDenial(input)
// Registra un intento denegado en la tabla Access para auditoría del administrador.
//   - P2-6: si ya hubo una denegación reciente (5 min) del mismo QR por el
//     mismo empleado y mismo motivo, se omite para no llenar la tabla de filas
//     idénticas.
// -----------------------------------------------------------------------------
export async function recordDenial(input: {
  rawToken: string;
  employee: EmployeeForAccess;
  reason: string;
}): Promise<void> {
  const qr = await findQrByTokenHash(input.rawToken);
  if (!qr) return;
  if (await huboDenegacionReciente({ qrTokenId: qr.qrTokenId, employeeId: input.employee.id, reason: input.reason })) {
    return;
  }
  await grantAccess({
    qrTokenId: qr.qrTokenId,
    employeeId: input.employee.id,
    result: "denied",
    denialReason: input.reason,
  });
}

// -----------------------------------------------------------------------------
// denyAccess(input)
// El empleado deniega manualmente el acceso aunque el QR sea válido.
//   - Consume el QR válido (consumeQr: true) y lo marca como invalidación
//     manual (invalidacionManual: true) para auditoría.
//   - Exige doble confirmación en la UI (ficha → motivo → confirmar).
//   - Queda registrado quién, cuándo y por qué denegó.
// -----------------------------------------------------------------------------
export async function denyAccess(input: {
  rawToken: string;
  employee: EmployeeForAccess;
  reason: string;
}): Promise<
  | { ok: true; denial: { code: DenialCode; message: string } }
  | { ok: false; code: DenialCode; message: string }
> {
  if (!input.employee.isActive || !input.employee.userIsActive) {
    return { ok: false, code: "empleado_inactivo", message: "Tu usuario esta desactivado." };
  }

  const qr = await findQrByTokenHash(input.rawToken);
  if (!qr) {
    return { ok: false, code: "qr_invalido", message: "Este codigo QR no pertenece a ninguna reserva." };
  }

  const motivo = input.reason.trim() || "Denegado por el empleado en puerta.";
  const registrado = await grantAccess({
    qrTokenId: qr.qrTokenId,
    employeeId: input.employee.id,
    result: "denied",
    denialReason: motivo,
    consumeQr: true,
    invalidacionManual: true,
  });

  if (!registrado.ok) {
    return {
      ok: false,
      code: "qr_ya_utilizado",
      message: "Este QR ya se uso en otra puerta. No se puede denegar de nuevo.",
    };
  }

  return { ok: true, denial: { code: "denegado_por_empleado", message: motivo } };
}

// -----------------------------------------------------------------------------
// Utilidades de fecha en America/Bogota (COT = UTC-5 fijo).
// -----------------------------------------------------------------------------

function isSameBogotaDay(a: Date, b: Date): boolean {
  const key = (d: Date) => formatInTimeZone(d, "yyyy-MM-dd");
  return key(a) === key(b);
}

function labelReservationStatus(status: string): string {
  switch (status) {
    case "pending_payment": return "pendiente de pago";
    case "payment_processing": return "procesando el pago";
    case "payment_rejected": return "rechazada";
    case "expired": return "expirada";
    case "used": return "utilizada";
    default: return status;
  }
}

export type { DenialReason };
