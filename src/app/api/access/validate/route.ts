import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { requireRole } from "@/shared/auth/require-role";
import {
  firstIssue,
  grantRequestSchema,
  validateRequestSchema,
} from "@/features/access/access.schemas";
import {
  confirmAccess,
  getEmployeeAccessContext,
  lookupAccess,
  recordDenial,
} from "@/features/access/access.service";

// ---------------------------------------------------------------------------
// Control de acceso del empleado (SCRUM secciones 15 a 19).
//
// Dos pasos obligatorios, nunca automaticos:
//   POST /api/access/validate           -> consulta: ficha de la reserva
//   POST /api/access/validate?action=confirm -> el empleado da el acceso
// ---------------------------------------------------------------------------

export const POST = handler(async (req) => {
  const session = await requireRole("employee", "admin");
  const isConfirm = new URL(req.url).searchParams.get("action") === "confirm";
  const body: unknown = await req.json().catch(() => null);

  const employee = await getEmployeeAccessContext(session.userId);
  if (!employee) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_EMPLOYEE", message: "Tu usuario no es un empleado." } },
      { status: 403 },
    );
  }

  if (!isConfirm) {
    const parsed = validateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ok({ outcome: "denied", denial: { code: "qr_invalido", message: firstIssue(parsed.error) } }),
      );
    }

    const lookup = await lookupAccess(parsed.data.token, employee);
    // El intento denegado tambien se registra: el administrador lo consulta en
    // Accesos con su motivo (seccion 20).
    if (lookup.outcome === "denied" && lookup.denial) {
      await recordDenial({ rawToken: parsed.data.token, employee, reason: lookup.denial.message });
    }
    return NextResponse.json(ok(lookup));
  }

  const parsed = grantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      ok({
        outcome: "denied",
        denial: { code: "qr_invalido", message: firstIssue(parsed.error) },
      }),
    );
  }

  const result = await confirmAccess({
    rawToken: parsed.data.token,
    employee,
  });

  if (!result.ok) {
    return NextResponse.json(
      ok({ outcome: "denied", denial: { code: result.code, message: result.message } }),
    );
  }
  return NextResponse.json(ok({ outcome: "granted", grant: result.grant }));
});