import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { listCustomerReservations } from "@/features/reservations/reservations.repository";
import { getSession } from "@/shared/auth/session";
import MisReservasView from "./MisReservasView";
import { toMisReserva } from "./reservas-view";

export const metadata: Metadata = { title: "Mis reservas" };

export default async function MisReservasPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={CalendarX2}
          title="Inicia sesión para ver tus reservas"
          text="Tus reservas y tus pases QR son personales. Entra con tu correo y contraseña."
          action={
            <Link href="/login?next=/mis-reservas" className="abtn abtn-primary">
              Iniciar sesión
            </Link>
          }
        />
      </div>
    );
  }

  const rows = await listCustomerReservations(session.userId);
  const now = new Date();
  const reservas = rows.map((r) => toMisReserva(r, now));

  return <MisReservasView reservas={reservas} />;
}