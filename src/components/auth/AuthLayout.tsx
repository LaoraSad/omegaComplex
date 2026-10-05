import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  brandVideoSrc?: string;
}

function Wordmark() {
  return (
    <Link aria-label="Omega Complex, inicio" className="auth-wordmark" href="/">
      <Image
        alt="Omega Complex"
        className="auth-logo-image"
        height={180}
        priority
        src="/logo-fondo-blanco.jpeg"
        width={260}
      />
    </Link>
  );
}

export function AuthLayout({
  children,
  description,
  eyebrow = "Omega Complex",
  title,
  brandVideoSrc,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <aside
        aria-label="Omega Complex"
        className={`auth-brand-panel${brandVideoSrc ? " auth-brand-panel--video" : ""}`}
      >
        {brandVideoSrc ? (
          <>
            <video
              aria-hidden="true"
              autoPlay
              className="auth-brand-video"
              loop
              muted
              playsInline
              preload="metadata"
              tabIndex={-1}
            >
              <source src={brandVideoSrc} type="video/mp4" />
            </video>
            <div aria-hidden="true" className="auth-brand-overlay" />
          </>
        ) : null}
        <div className="auth-brand-content">
          <p className="auth-brand-kicker">Entrena. Disfruta. Evoluciona.</p>
          <h1>Tu próximo nivel empieza aquí.</h1>
          <p>
            Un espacio para moverte, conectar y disfrutar de cada momento en Omega Complex.
          </p>
          <ul className="auth-brand-points" aria-label="Beneficios de Omega Complex">
            <li>Natación</li>
            <li>Running</li>
            <li>Basket</li>
            <li>Wellness</li>
          </ul>
        </div>

        <footer className="auth-brand-footer">Una experiencia hecha para ti.</footer>
      </aside>

      <main className="auth-main">
        <section aria-labelledby="auth-title" className="auth-card">
          <div className="auth-mobile-brand">
            <Wordmark />
          </div>
          <div className="auth-form-brand">
            <Wordmark />
          </div>
          {eyebrow ? <p className="auth-kicker">{eyebrow}</p> : null}
          <h2 className="auth-heading" id="auth-title">
            {title}
          </h2>
          <p className="auth-description">{description}</p>
          {children}
        </section>
      </main>
    </div>
  );
}
