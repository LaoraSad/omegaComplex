import type { ReactNode } from "react";

interface AuthErrorProps {
  /** Puede llevar <strong> para destacar una parte del mensaje. */
  children: ReactNode;
}

export function AuthError({ children }: AuthErrorProps) {
  return (
    <p className="auth-error" role="alert">
      {children}
    </p>
  );
}
