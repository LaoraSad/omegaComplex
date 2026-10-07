"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LoginForm } from "./login/LoginForm";
import { RegisterForm } from "./register/RegisterForm";

interface AuthSwitchCardProps {
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
        src="/Logo-vino.png"
        width={280}
      />
    </Link>
  );
}

export function AuthSwitchCard({ initialMode = "login" }: AuthSwitchCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Determine current mode based on prop or current URL
  const currentUrlMode = pathname?.includes("register") ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode || currentUrlMode);
  const [direction, setDirection] = useState<number>(0);

  const handleModeChange = (newMode: "login" | "register") => {
    if (newMode === mode) return;
    setDirection(newMode === "register" ? 1 : -1);
    setMode(newMode);

    // Sync URL smoothly without forcing hard reload
    startTransition(() => {
      window.history.pushState(null, "", newMode === "register" ? "/register" : "/login");
    });
  };

  const isLogin = mode === "login";

  return (
    <div className="auth-card">
      <div className="auth-mobile-brand">
        <Wordmark />
      </div>
      <div className="auth-form-brand">
        <Wordmark />
      </div>

      {/* Modern Athletic Pill Switcher */}
      <div className="auth-tabs-container" role="tablist" aria-label="Opciones de autenticación">
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          onClick={() => handleModeChange("login")}
          className={`auth-tab-btn ${isLogin ? "auth-tab-btn--active" : ""}`}
        >
          <span>Iniciar sesión</span>
          {isLogin && (
            <motion.div
              layoutId="auth-active-tab-pill"
              className="auth-tab-indicator"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          onClick={() => handleModeChange("register")}
          className={`auth-tab-btn ${!isLogin ? "auth-tab-btn--active" : ""}`}
        >
          <span>Crear cuenta</span>
          {!isLogin && (
            <motion.div
              layoutId="auth-active-tab-pill"
              className="auth-tab-indicator"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Header Info */}
      <div className="auth-header-block">
        <p className="auth-kicker">
          {isLogin ? "Qué bueno tenerte de vuelta" : "Únete a nuestra comunidad"}
        </p>
        <h2 className="auth-heading" id="auth-title">
          {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
        </h2>
        <p className="auth-description">
          {isLogin
            ? "Ingresa con tu correo y contraseña para continuar."
            : "Crea tu cuenta y empieza a disfrutar de Omega Complex."}
        </p>
      </div>

      {/* Animated Form Container */}
      <div className="auth-motion-container">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={mode}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? 30 : -30,
                opacity: 0,
                filter: "blur(4px)",
              }),
              center: {
                x: 0,
                opacity: 1,
                filter: "blur(0px)",
                transition: {
                  x: { type: "spring", stiffness: 350, damping: 30 },
                  opacity: { duration: 0.22 },
                  filter: { duration: 0.2 },
                },
              },
              exit: (dir: number) => ({
                x: dir > 0 ? -30 : 30,
                opacity: 0,
                filter: "blur(4px)",
                transition: {
                  x: { type: "spring", stiffness: 350, damping: 30 },
                  opacity: { duration: 0.18 },
                },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {isLogin ? (
              <LoginForm onSwitchToRegister={() => handleModeChange("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => handleModeChange("login")} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

