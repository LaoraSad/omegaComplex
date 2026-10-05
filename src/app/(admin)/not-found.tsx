import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="aempty" style={{ padding: "4rem 1.5rem" }}>
      <span aria-hidden="true" className="aempty-icon">
        <SearchX className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <p className="aempty-title">No se encontró este registro</p>
      <p className="aempty-text">
        El recurso que buscas no existe o fue eliminado. Verifica el enlace o vuelve al listado.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/admin" className="abtn abtn-secondary">
          Ir al panel
        </Link>
        <Link href="/admin/reservas" className="abtn abtn-primary">
          Ver reservas
        </Link>
      </div>
    </div>
  );
}
