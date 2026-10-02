"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { forgotPassword, getAuthErrorMessage } from "@/lib/api/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (caughtError: unknown) {
      setError(
        getAuthErrorMessage(caughtError, "No se pudo enviar la solicitud. Intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error ? <AuthError>{error}</AuthError> : null}
      {sent ? (
        <p className="auth-success" role="status">
          Solicitud enviada. Si la cuenta corresponde a este correo, recibirás instrucciones para
          continuar.
        </p>
      ) : null}
      <AuthInput
        autoComplete="email"
        label="Correo electrónico"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="nombre@correo.com"
        required
        type="email"
        value={email}
      />
      <AuthButton loading={loading} type="submit">
        Enviar enlace
      </AuthButton>
      <p className="auth-form-footer">
        <Link className="auth-link" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
