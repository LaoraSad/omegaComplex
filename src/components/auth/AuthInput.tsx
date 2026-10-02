import type { InputHTMLAttributes, ReactNode } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: ReactNode;
  label: string;
}

export function AuthInput({
  error,
  hint,
  id,
  label,
  ...inputProps
}: AuthInputProps) {
  const inputId = id ?? inputProps.name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const hintId = inputId ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="auth-field">
      <label className="auth-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`auth-input ${inputProps.className ?? ""}`.trim()}
        id={inputId}
      />
      {hint ? (
        <span className="auth-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <p className="auth-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
