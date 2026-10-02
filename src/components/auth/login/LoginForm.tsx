"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { getAuthErrorMessage, login, loginWithGoogle } from "@/lib/api/auth";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const initialValues: LoginFormValues = {
  email: "",
  password: "",
};

function validate(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.password) {
    errors.password = "Ingresa tu contraseña.";
  }

  return errors;
}

export function LoginForm() {
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof LoginFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Revisa los campos para continuar.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      setSuccess("Inicio de sesión correcto.");
    } catch (caughtError: unknown) {
      setError(getAuthErrorMessage(caughtError, "No se pudo iniciar sesión. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      await loginWithGoogle();
    } catch (caughtError: unknown) {
      setError(
        getAuthErrorMessage(caughtError, "La integración con Google aún no está configurada."),
      );
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {error ? <AuthError>{error}</AuthError> : null}
      {success ? (
        <p className="auth-success" role="status">
          {success}
        </p>
      ) : null}

      <AuthInput
        autoComplete="email"
        error={errors.email}
        label="Correo electrónico"
        name="email"
        onChange={(event) => updateField("email", event.target.value)}
        placeholder="nombre@correo.com"
        required
        type="email"
        value={values.email}
      />

      <PasswordInput
        autoComplete="current-password"
        error={errors.password}
        label="Contraseña"
        name="password"
        onChange={(event) => updateField("password", event.target.value)}
        placeholder="Ingresa tu contraseña"
        required
        value={values.password}
      />

      <div className="auth-row">
        <span />
        <Link className="auth-link" href="/forgot-password">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <AuthButton disabled={loading} loading={loading} type="submit">
        Iniciar sesión
      </AuthButton>

      <div aria-hidden="true" className="auth-divider">
        o continúa con
      </div>

      <SocialLoginButton disabled={loading} onClick={handleGoogleLogin} />

      <p className="auth-form-footer">
        ¿No tienes una cuenta? <Link className="auth-link" href="/register">Regístrate</Link>
      </p>
    </form>
  );
}
