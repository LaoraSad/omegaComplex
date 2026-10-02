"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { getAuthErrorMessage, resetPassword } from "@/lib/api/auth";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("El enlace no contiene un código de restablecimiento válido.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setPassword("");
      setConfirmation("");
    } catch (caughtError: unknown) {
      setError(
        getAuthErrorMessage(caughtError, "No se pudo restablecer la contraseña. Intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error ? <AuthError>{error}</AuthError> : null}
      {success ? (
        <p className="auth-success" role="status">
          Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.
        </p>
      ) : null}
      {!token ? (
        <p className="auth-info" role="status">
          Abre el enlace enviado a tu correo para continuar.
        </p>
      ) : null}
      <PasswordInput
        autoComplete="new-password"
        label="Nueva contraseña"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        value={password}
      />
      <p className="auth-hint">Usa al menos 8 caracteres.</p>
      <PasswordInput
        autoComplete="new-password"
        label="Confirmar contraseña"
        name="confirmPassword"
        onChange={(event) => setConfirmation(event.target.value)}
        required
        value={confirmation}
      />
      <AuthButton disabled={!token} loading={loading} type="submit">
        Restablecer contraseña
      </AuthButton>
      <p className="auth-form-footer">
        <Link className="auth-link" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
