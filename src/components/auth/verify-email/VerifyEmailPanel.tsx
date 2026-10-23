"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { getAuthErrorMessage, resendVerificationEmail, verifyEmail } from "@/lib/api/auth";

interface VerifyEmailPanelProps {
  email: string;
  sent: boolean;
}

export function VerifyEmailPanel({ email, sent: initiallySent }: VerifyEmailPanelProps) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(initiallySent);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email) {
      setError("No encontramos el correo asociado. Regresa al registro e inténtalo de nuevo.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Ingresa el código de verificación de 6 dígitos.");
      return;
    }

    setVerifying(true);
    try {
      await verifyEmail(email, code);
      setVerified(true);
    } catch (caughtError: unknown) {
      setError(getAuthErrorMessage(caughtError, "No se pudo verificar el correo. Intenta de nuevo."));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError("");
    if (!email) {
      setError("No encontramos el correo asociado. Regresa al registro e inténtalo de nuevo.");
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      setSent(true);
      setCode("");
    } catch (caughtError: unknown) {
      setError(
        getAuthErrorMessage(caughtError, "No se pudo reenviar el código. Intenta de nuevo."),
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-form">
      <p aria-live="polite" className="auth-info">
        {sent
          ? "Te enviamos un código de 6 dígitos a tu correo."
          : "Tu cuenta fue creada, pero no pudimos enviar el correo. Solicita un nuevo código."}
        {email ? (
          <>
            {" "}
            <strong>{email}</strong>
          </>
        ) : null}
        {sent ? " Revisa tu bandeja de entrada y correo no deseado." : null}
      </p>
      {error ? <AuthError>{error}</AuthError> : null}
      {verified ? (
        <>
          <p className="auth-success" role="status">Tu correo fue verificado correctamente. Ya puedes iniciar sesión.</p>
          <Link className="auth-link" href="/login">Ir al inicio de sesión</Link>
        </>
      ) : (
        <>
          <form className="auth-form" noValidate onSubmit={handleVerify}>
            <AuthInput
              autoComplete="one-time-code"
              inputMode="numeric"
              label="Código de verificación"
              maxLength={6}
              name="verificationCode"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              value={code}
            />
            <AuthButton disabled={verifying || resending} loading={verifying} type="submit">
              {verifying ? "Verificando..." : "Verificar correo"}
            </AuthButton>
          </form>
          <AuthButton disabled={verifying || resending} loading={resending} onClick={handleResend} type="button">
            {resending ? "Enviando..." : "Reenviar código"}
          </AuthButton>
          {sent ? <p className="auth-success" role="status">Código enviado.</p> : null}
        </>
      )}
      <p className="auth-form-footer">
        <Link className="auth-link" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
