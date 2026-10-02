"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { getAuthErrorMessage, resendVerificationEmail } from "@/lib/api/auth";

interface VerifyEmailPanelProps {
  email: string;
}

export function VerifyEmailPanel({ email }: VerifyEmailPanelProps) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setError("");
    setSent(false);
    if (!email) {
      setError("No encontramos el correo asociado. Regresa al registro e inténtalo de nuevo.");
      return;
    }

    setLoading(true);
    try {
      await resendVerificationEmail(email);
      setSent(true);
    } catch (caughtError: unknown) {
      setError(
        getAuthErrorMessage(caughtError, "No se pudo reenviar el correo. Intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form">
      <p aria-live="polite" className="auth-info">
        Enviamos un correo de verificación{email ? " a:" : "."}
        {email ? (
          <>
            {" "}
            <strong>{email}</strong>
          </>
        ) : null}
        . Revisa tu bandeja de entrada y la carpeta de correo no deseado.
      </p>
      {error ? <AuthError>{error}</AuthError> : null}
      {sent ? (
        <p className="auth-success" role="status">
          Solicitud de reenvío enviada.
        </p>
      ) : null}
      <AuthButton loading={loading} onClick={handleResend} type="button">
        Reenviar correo
      </AuthButton>
      <p className="auth-form-footer">
        <Link className="auth-link" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
