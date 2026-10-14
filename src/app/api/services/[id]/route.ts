import { NextRequest, NextResponse } from "next/server";
import { getCatalogService } from "@/features/catalog";
import { updateService } from "@/features/admin/admin.repository";
import { firstIssue, serviceUpdateSchema } from "@/features/admin/admin.schemas";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { requireRole } from "@/shared/auth/require-role";

export const GET = handler(async (_req, context) => {
  const id = (await context?.params)?.id;
  const parsed = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "");
  if (!parsed) throw new ValidationError("El identificador de servicio no es válido");
  return NextResponse.json(ok(await getCatalogService(id!)));
});

export const PATCH = handler(async (req: NextRequest, context) => {
  await requireRole("admin");
  const id = (await context?.params)?.id;
  if (!id) throw new ValidationError("El identificador de servicio no es válido");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("El cuerpo debe ser JSON válido");
  }
  const parsed = serviceUpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));

  return NextResponse.json(ok(await updateService(id, parsed.data)));
});