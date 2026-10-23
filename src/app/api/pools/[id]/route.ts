import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { NotFoundError } from "@/shared/http/errors";
import { ok } from "@/shared/http/api-response";
import { getCatalogService } from "@/features/catalog/catalog.repository";
import { db } from "@/shared/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/pools/[id] -> instalacion individual (UUID o slug, por compatibilidad
// con los enlaces que ya usaba la tienda).
export const GET = handler(async (_req, ctx) => {
  const id = String((await ctx?.params)?.id ?? "");

  const service = UUID.test(id)
    ? await getCatalogService(id)
    : await db.service.findFirst({
        where: { slug: id, category: { is: { isActive: true } } },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
        },
      });

  if (!service) throw new NotFoundError("Instalación no encontrada");
  return NextResponse.json(ok(service));
});