import { redirect } from "next/navigation";

// La vista de administración vive ahora en /admin.
// Se conserva esta ruta como redirección para no romper enlaces existentes.
export default function LegacyDashboardPage() {
  redirect("/admin");
}
