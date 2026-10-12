"use client";

import { Database, TriangleAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // El mensaje crudo no se muestra. En desarrollo contiene la excepción del
  // driver de base de datos, con el host, el puerto y el nombre del proyecto:
  // confirmarle a cualquiera que abra el panel cómo es la infraestructura por
  // dentro. En producción Next.js lo reemplaza por el digest de todos modos.
  const mensaje = error.message?.includes("Can't reach database server")
    ? "No pudimos conectarnos con la base de datos. Es un problema de conectividad, no de tu cuenta."
    : "Ocurrió un error inesperado al consultar el sistema. Inténtalo de nuevo.";

  const esConectividad = Boolean(error.message?.includes("Can't reach database server"));

  return (
    <div className="aempty" role="alert" style={{ padding: "4rem 1.5rem" }}>
      <span aria-hidden="true" className="aempty-icon">
        {esConectividad ? (
          <Database className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
        )}
      </span>
      <p className="aempty-title">
        {esConectividad ? "Servicio no disponible" : "No se pudo cargar esta sección"}
      </p>
      <p className="aempty-text">{mensaje}</p>
      {error.digest ? (
        <p className="aempty-text" style={{ opacity: 0.6 }}>
          Referencia: {error.digest}
        </p>
      ) : null}
      <div className="mt-2">
        <button type="button" className="abtn abtn-primary" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
