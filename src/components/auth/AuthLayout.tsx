import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Waves, Trophy, Flame, Dumbbell, Sparkles } from "lucide-react";
import { AuthSwitchCard } from "./AuthSwitchCard";
import SectionDivider from "@/components/SectionDivider";
import AmbientBubbles from "@/components/AmbientBubbles";

interface AuthLayoutProps {
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title?: string;
  brandVideoSrc?: string;
  useSwitchCard?: boolean;
  initialMode?: "login" | "register";
}

function Wordmark() {
  return (
    <Link aria-label="Omega Complex, inicio" className="auth-wordmark" href="/">
      <Image
        alt="Omega Complex"
        className="auth-logo-image"
        height={77}
        priority
        src="/Logo-blanco.png"
        width={280}
      />
    </Link>
  );
}

export function AuthLayout({
  children,
  description = "Ingresa con tu correo y contraseña para continuar.",
  eyebrow = "Complejo Deportivo Omega",
  title = "Inicia sesión",
  brandVideoSrc = "/video_login6b39a628.mp4",
  useSwitchCard = false,
  initialMode = "login",
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

        <SectionDivider orientation="vertical" className="auth-seam" />

        <div className="auth-brand-content">
          <p className="auth-brand-kicker">ENTRENA • COMPITE • EVOLUCIONA</p>
          <h1 className="auth-brand-title">
            Tu próximo nivel <br />
            <span className="auth-title-accent">empieza aquí.</span>
          </h1>
          <p className="auth-brand-subtitle">
            Instalaciones profesionales, piscinas climatizadas, canchas de pádel, fútbol y
            espacios diseñados para tu máximo rendimiento deportivo.
          </p>

          <ul className="auth-brand-points" aria-label="Instalaciones de Omega Complex">
            <li>
              <Waves className="auth-point-icon" size={16} />
              <span>Natación Olímpica</span>
            </li>
            <li>
              <Trophy className="auth-point-icon" size={16} />
              <span>Pádel & Tenis</span>
            </li>
            <li>
              <Flame className="auth-point-icon" size={16} />
              <span>Canchas Sintéticas</span>
            </li>
            <li>
              <Dumbbell className="auth-point-icon" size={16} />
              <span>Gimnasio Pro</span>
            </li>
            <li>
              <Sparkles className="auth-point-icon" size={16} />
              <span>Spa & Hidroterapia</span>
            </li>
          </ul>
        </div>

        <footer className="auth-brand-footer">
          <span>Omega Complex © 2026</span>
          <span className="auth-footer-divider">•</span>
          <span>Experiencia deportiva integral</span>
        </footer>
      </aside>

      <main className="auth-main">
        <AmbientBubbles variant="wine" />
        {useSwitchCard ? (
          <AuthSwitchCard initialMode={initialMode} />
        ) : (
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
        )}
      </main>
    </div>
  );
}
