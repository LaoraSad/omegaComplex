import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
}

export function AuthButton({
  children,
  disabled,
  loading = false,
  ...buttonProps
}: AuthButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`auth-button auth-button-primary ${buttonProps.className ?? ""}`.trim()}
      disabled={disabled || loading}
    >
      {loading ? <span aria-hidden="true" className="auth-spinner" /> : null}
      {loading ? "Procesando..." : children}
    </button>
  );
}
