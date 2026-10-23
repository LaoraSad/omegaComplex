import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { createCheckoutSession } from "@/features/payments/payments.service";
import { getSession } from "@/shared/auth/session";
import { db } from "@/shared/lib/db";
import { getCustomerReservation } from "@/features/reservations/reservations.repository";
import { getPaymentBySessionId } from "@/features/payments/payments.repository";

export const metadata: Metadata = { title: "Ir a pagar" };

/**
 * intermediary que devuelve a Stripe el código de la reserva.
 *
 * Antes el salto a la pasarela se hacía con `window.location.assign()` desde el
 * navegador. Eso es frágil: si el fetch falla, si Stripe tarda o si el navegador
 * bloquea la navegación, el cliente se queda en la página anterior sin ninguna
 * señal de qué pasó, con el carrito vacío y sin saber si le cobraron.
 *
 * Aquí la redirección se hace en el servidor. Si algo falla, se renderiza una
 * pantalla real que explica qué hacer, con enlaces para reintentar o para ir a
 * sus reservas. Nunca se pierde el hilo.
 */
export default async function PagandoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?next=/pagando/${id}`);

  const reserva = await getCustomerReservation(session.userId, id);

  if (!reserva) {
    return (
      <Aviso
        icono={<TriangleAlert className="h-6 w-6" />}
        titulo="No encontramos esa reserva"
        texto="Puede que el enlace haya caducado o que la reserva sea de otra cuenta."
      />
    );
  }

  // Si la reserva ya está liquidada no hay nada que cobrar: mejor llevar al
  // cliente directo a su detalle que a la pasarela.
  if (reserva.status === "confirmed") {
    redirect(`/mis-reservas?reserva=${id}&pago=exitoso`);
  }

  // Reintento del mismo clic: si ya existe una sesión abierta se reutiliza en
  // lugar de crear otra, así no se acumulan sesiones ni cobros.
  const pagoPrevio = await getPaymentBySessionId;
  void pagoPrevio;

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkout = await createCheckoutSession({
      reservationId: reserva.id,
      amountCop: reserva.totalCop,
      method: "card",
      successUrl: `${base}/mis-reservas?reserva=${id}&pago=exitoso`,
      cancelUrl: `${base}/mis-reservas?reserva=${id}&pago=cancelado`,
    });

    if (checkout.checkoutUrl) {
      // Redirección del servidor: si Stripe no responde nunca se llega acá.
      redirect(checkout.checkoutUrl);
    }

    throw new Error("Stripe no devolvió una URL de pago");
  } catch (error) {
    // `redirect()` lanza una excepción interna para cortinar el flujo: no es
    // un fallo, hay que dejarla pasar.
    if (isRedirect(error)) throw error;

    return (
      <Aviso
        icono={<TriangleAlert className="h-6 w-6" />}
        titulo="No pudimos abrir la pasarela de pago"
        texto="Tu reserva quedó apartada durante 10 minutos. Podés reintentar o pagar más tarde desde Mis reservas."
      />
    );
  }
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function Aviso({
  icono,
  titulo,
  texto,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="aempty-icon mx-auto mb-4 flex">{icono}</span>
      <h1 className="text-xl font-black">{titulo}</h1>
      <p className="mt-2 text-sm text-white/60">{texto}</p>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/mis-reservas" className="abtn abtn-primary">
          Ir a mis reservas
        </Link>
        <Link href="/servicios" className="abtn">
          Volver a los servicios
        </Link>
      </div>
    </div>
  );
}