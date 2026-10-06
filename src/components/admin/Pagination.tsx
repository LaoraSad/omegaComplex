"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  itemLabel?: string;
}

function buildHref(base: URLSearchParams, page: number): string {
  if (page <= 1) {
    base.delete("page");
  } else {
    base.set("page", String(page));
  }
  const query = base.toString();
  return query ? `?${query}` : "?";
}

/** Paginación que conserva los filtros activos en la URL. */
export function Pagination({ page, totalPages, total, pageSize, itemLabel }: PaginationProps) {
  const searchParams = useSearchParams();
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const window_: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    window_.push(p);
  }

  const params = new URLSearchParams(searchParams.toString());

  return (
    <nav aria-label="Paginación" className="apagination">
      <p className="apagination-info">
        Mostrando {from}–{to} de {total} {itemLabel ?? "registros"}
      </p>
      {totalPages > 1 ? (
        <div className="apagination-pages">
          <Link
            aria-label="Página anterior"
            className="apage-btn"
            aria-disabled={page <= 1}
            href={buildHref(new URLSearchParams(params.toString()), page - 1)}
            style={page <= 1 ? { pointerEvents: "none", opacity: 0.45 } : undefined}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {window_.map((p) => (
            <Link
              key={p}
              className="apage-btn"
              aria-current={p === page ? "page" : undefined}
              href={buildHref(new URLSearchParams(params.toString()), p)}
            >
              {p}
            </Link>
          ))}
          <Link
            aria-label="Página siguiente"
            className="apage-btn"
            href={buildHref(new URLSearchParams(params.toString()), page + 1)}
            style={page >= totalPages ? { pointerEvents: "none", opacity: 0.45 } : undefined}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
