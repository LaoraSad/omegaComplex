import { formatClock, formatInTimeZone } from "./access-dates";
import {
  findEmployeeByUserId,
  findQrByTokenHash,
  grantAccess,
  hashAccessToken,
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

// ---------------------------------------------------------------------------
// Reglas de validacion del QR (SCRUM seccion 16) y del ingreso (seccion 17).
//
// El acceso nunca es automatico: aqui solo se consulta. El empleado ve la ficha
// y confirma con un segundo paso (seccion 19).
// ---------------------------------------------------------------------------

/** Zona del empleado: solo valida instalaciones que tiene asignadas. */
export async function getEmployeeAccessContext(userId: string) {
  return findEmployeeByUserId(userId);
}

function denied(code: DenialCode, message: string): AccessLookup {
  return { outcome: "denied", denial: { code, message } };
}

/**
 * Valida un QR escaneado y devuelve la ficha de la reserva.
 * Todas las reglas se evaluan en el servidor: el cliente no decide nada.
 */
export async function lookupAccess(rawToken: string, employee: EmployeeForAccess): Promise<AccessLookup> {
  if (!employee.isActive || !employee.userIsActive) {
    return denied("empleado_inactivo", "Tu usuario esta desactivado. Avisa al administrador.");
  }

  // 1. El QR debe existir.
  const qr = await findQrByTokenHash(hashAccessToken(rawToken));
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
    // Un QR sin bloque es de una reserva de una sola zona: se usa el servicio de la
    // reserva. Con bloque, manda el bloque (piscina != baloncesto).
    zone: qr.serviceId
      ? { serviceId: qr.serviceId, serviceName: qr.serviceName, categoryName: qr.categoryName }
      : { serviceId: "", serviceName: "Zona no definida", categoryName: "Sin zona" },
  };

  // 2. La reserva debe existir (si hay QrToken, la FK la garantiza).
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

  // 4. El QR no debe haberse usado antes (uso unico, seccion 18).
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

  // 7. Debe corresponder a la fecha actual.
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

  // 8. La hora actual debe estar dentro de la franja (seccion 17).
  //    Respuesta 30: si llega antes, debe esperar. Seccion 17: despues del
  //    fin no puede ingresar.
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
    return {
      outcome: "denied",
      reservation: summary,
      denial: {
        code: "franja_terminada",
        message: `La franja termino a las ${formatClock(qr.endsAt)}. No se puede dar acceso.`,
      },
    };
  }

  // La reserva es valida. Si no esta en la zona del empleado no se deniega:
  // la respuesta 37 indica que el empleado lo acompania a la zona correcta.
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

/**
 * Confirma el ingreso. Solo el empleado lo dispara: la validacion se repite
 * dentro de la transaccion para no confiar en la consulta anterior.
 */
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

  const qr = await findQrByTokenHash(hashAccessToken(input.rawToken));
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
    // Otro empleado consumio el QR entre la consulta y la confirmacion.
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
      customerName: previous.reservation.customerName,
      zone: previous.reservation.zone,
    },
  };
}

/** Registra un intento denegado, para que el administrador lo consulte en Accesos. */
export async function recordDenial(input: {
  rawToken: string;
  employee: EmployeeForAccess;
  reason: string;
}): Promise<void> {
  const qr = await findQrByTokenHash(hashAccessToken(input.rawToken));
  if (!qr) return;
  await grantAccess({
    qrTokenId: qr.qrTokenId,
    employeeId: input.employee.id,
    result: "denied",
    denialReason: input.reason,
  });
}

// ---------------------------------------------------------------------------
// Utilidades de fecha en America/Bogota (COT = UTC-5 fijo).
// ---------------------------------------------------------------------------

function isSameBogotaDay(a: Date, b: Date): boolean {
  const key = (d: Date) => formatInTimeZone(d, "yyyy-MM-dd");
  return key(a) === key(b);
}

function labelReservationStatus(status: string): string {
  switch (status) {
    case "pending_payment":
      return "pendiente de pago";
    case "payment_processing":
      return "procesando el pago";
    case "payment_rejected":
      return "rechazada";
    case "expired":
      return "expirada";
    case "used":
      return "utilizada";
    default:
      return status;
  }
}

export type { DenialReason };