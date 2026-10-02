interface AuthErrorProps {
  children: string;
}

export function AuthError({ children }: AuthErrorProps) {
  return (
    <p className="auth-error" role="alert">
      {children}
    </p>
  );
}
