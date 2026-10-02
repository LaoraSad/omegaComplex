"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { getAuthErrorMessage, register } from "@/lib/api/auth";
import type { RegisterData } from "@/types/auth";

type RegisterField = keyof RegisterData | "confirmPassword";
type RegisterFormValues = RegisterData & { confirmPassword: string };
type RegisterErrors = Partial<Record<RegisterField, string>>;

const initialValues: RegisterFormValues = {
  firstName: "",
  lastName: "",
  document: "",
  phone: "",
  birthDate: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validate(values: RegisterFormValues): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!values.firstName.trim()) errors.firstName = "Ingresa tu nombre.";
  if (!values.lastName.trim()) errors.lastName = "Ingresa tu apellido.";

  const document = values.document.trim();
  if (!document) {
    errors.document = "El documento de identidad es obligatorio.";
  } else if (!/^[\p{L}\d][\p{L}\d.-]{2,19}$/u.test(document)) {
    errors.document = "Ingresa un documento válido.";
  }

  const digitsInPhone = values.phone.replace(/\D/g, "").length;
  if (!values.phone.trim()) {
    errors.phone = "Ingresa tu teléfono.";
  } else if (!/^\+?[\d\s().-]+$/.test(values.phone) || digitsInPhone < 7 || digitsInPhone > 15) {
    errors.phone = "Ingresa un teléfono válido.";
  }

  if (!values.birthDate) {
    errors.birthDate = "Ingresa tu fecha de nacimiento.";
  } else {
    const date = new Date(`${values.birthDate}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== values.birthDate) {
      errors.birthDate = "Ingresa una fecha válida.";
    } else if (date > new Date()) {
      errors.birthDate = "La fecha de nacimiento no puede ser futura.";
    }
  }

  if (!values.email.trim()) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.password) {
    errors.password = "Ingresa una contraseña.";
  } else if (values.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: RegisterField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const data: RegisterData = {
        firstName: values.firstName,
        lastName: values.lastName,
        document: values.document,
        phone: values.phone,
        birthDate: values.birthDate,
        email: values.email,
        password: values.password,
      };
      await register({
        ...data,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        document: data.document.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
      });
      router.push(`/verify-email?email=${encodeURIComponent(values.email.trim())}`);
    } catch (caughtError: unknown) {
      setServerError(
        getAuthErrorMessage(caughtError, "No se pudo completar el registro. Intenta de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {serverError ? <AuthError>{serverError}</AuthError> : null}
      <div className="auth-fields-grid">
        <AuthInput
          autoComplete="given-name"
          error={errors.firstName}
          label="Nombre"
          name="firstName"
          onChange={(event) => updateField("firstName", event.target.value)}
          placeholder="Tu nombre"
          required
          value={values.firstName}
        />
        <AuthInput
          autoComplete="family-name"
          error={errors.lastName}
          label="Apellido"
          name="lastName"
          onChange={(event) => updateField("lastName", event.target.value)}
          placeholder="Tu apellido"
          required
          value={values.lastName}
        />
        <AuthInput
          autoComplete="off"
          error={errors.document}
          label="Documento de identidad"
          name="document"
          onChange={(event) => updateField("document", event.target.value)}
          placeholder="Número de documento"
          required
          value={values.document}
        />
        <AuthInput
          autoComplete="tel"
          error={errors.phone}
          label="Teléfono"
          name="phone"
          onChange={(event) => updateField("phone", event.target.value)}
          placeholder="+57 300 000 0000"
          required
          type="tel"
          value={values.phone}
        />
        <AuthInput
          autoComplete="bday"
          error={errors.birthDate}
          label="Fecha de nacimiento"
          name="birthDate"
          onChange={(event) => updateField("birthDate", event.target.value)}
          required
          type="date"
          value={values.birthDate}
        />
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
      </div>
      <PasswordInput
        autoComplete="new-password"
        error={errors.password}
        label="Contraseña"
        name="password"
        onChange={(event) => updateField("password", event.target.value)}
        required
        value={values.password}
      />
      <p className="auth-hint">Usa al menos 8 caracteres.</p>
      <PasswordInput
        autoComplete="new-password"
        error={errors.confirmPassword}
        label="Confirmar contraseña"
        name="confirmPassword"
        onChange={(event) => updateField("confirmPassword", event.target.value)}
        required
        value={values.confirmPassword}
      />
      <p className="auth-hint">
        Tu documento debe estar asociado a una sola cuenta. Verificaremos los datos con el servicio
        de la plataforma.
      </p>
      <AuthButton loading={loading} type="submit">
        Crear cuenta
      </AuthButton>
      <p className="auth-form-footer">
        ¿Ya tienes una cuenta?{" "}
        <Link className="auth-link" href="/login">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
