"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  label: string;
}

export function PasswordInput({ error, id, label, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? inputProps.name;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="auth-field">
      <label className="auth-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="auth-input-wrap">
        <input
          {...inputProps}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className={`auth-input auth-input-has-action ${inputProps.className ?? ""}`.trim()}
          id={inputId}
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="auth-input-action"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <svg aria-hidden="true" fill="none" height="19" viewBox="0 0 24 24" width="19">
              <path
                d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.6 10 7-.4.8-1.3 2.2-2.6 3.4M6.2 6.3C3.9 7.8 2.5 10 2 12c1.2 2.4 4.8 7 10 7 1 0 1.9-.2 2.8-.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" fill="none" height="19" viewBox="0 0 24 24" width="19">
              <path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p className="auth-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
