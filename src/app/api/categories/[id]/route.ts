import { NextRequest, NextResponse } from "next/server";
import {
  archiveCategory,
  categoryIdSchema,
  getCategory,
  updateCategory,
  updateCategorySchema,
} from "@/features/catalog";
import { requireRole } from "@/shared/auth/require-role";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

async function getId(context?: { params?: Promise<Record<string, string>> }): Promise<string> {
  const id = (await context?.params)?.id;
  const parsed = categoryIdSchema.safeParse(id);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
  return parsed.data;
}

export const GET = handler(async (req: NextRequest, context) => {
  const id = await getId(context);
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  if (includeInactive) await requireRole("admin");
  return NextResponse.json(ok(await getCategory(id, includeInactive)));
});

export const PATCH = handler(async (req: NextRequest, context) => {
  await requireRole("admin");
  const id = await getId(context);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("El cuerpo debe ser JSON válido");
  }
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);

  return NextResponse.json(ok(await updateCategory(id, parsed.data)));
});

export const DELETE = handler(async (_req: NextRequest, context) => {
  await requireRole("admin");
  const id = await getId(context);
  return NextResponse.json(ok(await archiveCategory(id)));
});