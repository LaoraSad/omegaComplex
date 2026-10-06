"use client";

import { TriangleAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="aempty" role="alert" style={{ padding: "4rem 1.5rem" }}>
      <span aria-hidden="true" className="aempty-icon">
        <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <p className="aempty-title">No se pudo cargar esta sección</p>
      <p className="aempty-text">
        {error.message || "Ocurrió un error inesperado al consultar el sistema. Inténtalo de nuevo."}
      </p>
      <div className="mt-2">
        <button type="button" className="abtn abtn-primary" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
