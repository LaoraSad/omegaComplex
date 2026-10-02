interface SocialLoginButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export function SocialLoginButton({ disabled = false, onClick }: SocialLoginButtonProps) {
  return (
    <button
      className="auth-button auth-button-social"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18">
        <path
          d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 01-4.1 6.2v5.1h6.6c3.8-3.5 6.1-8.7 6.1-15z"
          fill="#4285F4"
        />
        <path
          d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0024 44z"
          fill="#34A853"
        />
        <path
          d="M12.6 27.7a12 12 0 010-7.4V15H5.8a20 20 0 000 18l6.8-5.3z"
          fill="#FBBC05"
        />
        <path
          d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 005.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4z"
          fill="#EA4335"
        />
      </svg>
      Continuar con Google
    </button>
  );
}
