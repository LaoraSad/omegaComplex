"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, MailWarning, RefreshCw, TriangleAlert, X } from "lucide-react";
import OmegaCard from "@/components/ui/OmegaCard";

type Estado = "procesando" | "confirmado" | "fallido";

type Resultado = {
  estado: Estado;
  qrDisponibles: boolean;
  /** El pago se habia cobrarado en Stripe y se liquido aqui, sin webhook. */
  recuperado?: boolean;
  /** Pago cobrado pero algo fallo del lado nuestro. */
  recuperacion?: "requiere-reintento" | null;
};

/** Cada cuanto se pregunta. Corto al principio y espaciado despues. */
const INTERVALOS_MS = [1500, 2500, 3500, 5000];
const MAX_INTENTOS = 24; // ~2 minutos

export default function EsperaPago({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [intento, setIntento] = useState(0);
  const [agotado, setAgotado] = useState(false);
  const cancelado = useRef(false);

  useEffect(() => {
    return () => {
      cancelado.current = true;
    };
  }, []);

  useEffect(() => {
    let vivo = true;

    async function consultar() {
      try {
        const res = await fetch(`/api/reservations/${reservationId}/estado-pago`, {
          cache: "no-store",
        });
        const cuerpo = await res.json().catch(() => null);
        const datos = (cuerpo?.data ?? null) as Resultado | null;

        if (!vivo) return;
        if (!datos) throw new Error("sin respuesta");

        setResultado(datos);

        // Confirmado: se deja un instante para que se vea el check y se entra.
        // OJO: hay que navegar, no refrescar. Un refresh re-ejecuta el server
        // component con los mismos searchParams y volveria a mostrar esta misma
        // pantalla en bucle, dejando al usuario trabado en "Redirigiendo".
        if (datos.estado === "confirmado") {
          setTimeout(() => router.replace("/mis-reservas"), 1200);
          return;
        }

        if (datos.estado === "fallido") return;

        setIntento((n) => {
          if (n + 1 >= MAX_INTENTOS) {
            setAgotado(true);
            return n + 1;
          }
          return n + 1;
        });
      } catch {
        if (!vivo) return;
        setIntento((n) => {
          if (n + 1 >= MAX_INTENTOS) {
            setAgotado(true);
            return n + 1;
          }
          return n + 1;
        });
      }
    }

    consultar();
    const espera = INTERVALOS_MS[Math.min(intento, INTERVALOS_MS.length - 1)];
    const t = setTimeout(consultar, espera);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [reservationId, intento, router]);

  const confirmado = resultado?.estado === "confirmado";
  const fallido = resultado?.estado === "fallido";

  return (
    <OmegaCard className="mx-auto max-w-md" innerClassName="p-10 text-center" role="status">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[#e3bd74]"
      >
        {confirmado ? (
          <Check className="h-6 w-6" strokeWidth={2} />
        ) : fallido ? (
          <X className="h-6 w-6" strokeWidth={2} />
        ) : agotado ? (
          <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
        )}
      </span>

      <p className="text-lg font-black text-white">
        {confirmado
          ? "Pago confirmado"
          : fallido
            ? "El pago no se pudo completar"
            : agotado
              ? "Estamos confirmando tu pago"
              : "Procesando tu pago"}
      </p>

      <p className="mt-2 text-sm text-white/60">
        {confirmado
          ? "Tu reserva quedó confirmada. Te enviamos los códigos QR al correo."
          : fallido
            ? "No se pudo procesar el cobro. No se realizó ningún cargo."
            : agotado
              ? "Estamos verificando con la pasarela de pago. Tu reserva está apartada mientras tanto y el QR te llega al correo en cuanto se confirme."
              : "No cierres esta ventana. Esto tarda unos segundos."}
      </p>

      {confirmado ? (
        <p className="mt-3 text-sm text-white/50">
          Redirigiendo a tus reservas…
        </p>
      ) : null}

      {resultado?.recuperado ? (
        <p className="mt-3 text-sm text-white/60">
          Confirmamos tu pago directamente con la pasarela.
        </p>
      ) : null}

      {agotado && !confirmado && !fallido ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-[#7a1f3d] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#8f2547]"
            onClick={() => {
              setAgotado(false);
              setIntento(0);
            }}
          >
            <RefreshCw className="mr-1.5 inline h-4 w-4" />
            Volver a comprobar
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-white/85 transition-colors hover:border-white/30 hover:text-white"
            href="/mis-reservas"
          >
            Ir a mis reservas
          </Link>
        </div>
      ) : null}

      {agotado && !confirmado ? (
        <p className="mt-5 flex items-start gap-2 text-left text-xs text-white/50">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Si el pago se completó, los QR llegan al correo aunque esta pantalla siga
            esperando. No vuelvas a pagar.
          </span>
        </p>
      ) : null}
    </OmegaCard>
  );
}