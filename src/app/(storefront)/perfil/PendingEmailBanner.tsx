"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { resendVerificationEmail, getAuthErrorMessage } from "@/lib/api/auth";

/** Aviso cuando el correo está pendiente de verificación, con reenvío. */
export function PendingEmailBanner({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await resendVerificationEmail(email);
      setMessage("Si la cuenta necesita verificación, enviamos un nuevo código.");
    } catch (err) {
      setError(getAuthErrorMessage(err, "No se pudo reenviar el código."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-100"
    >
      <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
      <span className="font-bold">Tu correo está pendiente de verificación.</span>
      <Link
        href={`/verify-email?email=${encodeURIComponent(email)}`}
        className="font-bold underline underline-offset-2"
      >
        Verificar ahora
      </Link>
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="font-bold underline underline-offset-2 disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Reenviar código"}
      </button>
      {message ? <span className="w-full font-semibold text-emerald-300">{message}</span> : null}
      {error ? <span role="alert" className="w-full font-bold text-rose-300">{error}</span> : null}
    </div>
  );
}
