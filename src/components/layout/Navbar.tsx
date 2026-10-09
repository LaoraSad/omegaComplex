'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Menu, X, LogOut, CalendarDays, User, LayoutDashboard } from 'lucide-react';
import { AuthApiError, logout, me, type AuthUser } from '@/lib/api/auth';

interface NavbarProps {
  initialUser: AuthUser | null;
}

const LINKS = [
  { id: 'inicio', label: 'Inicio', href: '/#inicio' },
  { id: 'instalaciones', label: 'Instalaciones', href: '/#instalaciones' },
  { id: 'reservas', label: 'Reservas', href: '/#reservas' },
  { id: 'nosotros', label: 'Nosotros', href: '/#nosotros' },
  { id: 'contacto', label: 'Contacto', href: '/#contacto' },
];

export default function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [prevInitial, setPrevInitial] = useState(initialUser);
  const [sessionChecked, setSessionChecked] = useState(initialUser !== null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  // Cierra el menú móvil al navegar, igual que se sincroniza initialUser arriba.
  const [prevPathname, setPrevPathname] = useState(pathname);
  // Bloqueo post-click: evita que el spy pelee con el desplazamiento suave.
  const scrollLockRef = useRef(false);

  const goToSection = (id: string) => {
    setActiveSection(id);
    scrollLockRef.current = true;
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 1200);
    // Si ya estamos en la landing, asegura el desplazamiento aunque el hash no cambie.
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (initialUser !== prevInitial) {
    setPrevInitial(initialUser);
    setUser(initialUser);
    setSessionChecked(true);
  }

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (initialUser) return;
    let cancelled = false;
    me().then(
      (current) => {
        if (cancelled) return;
        setUser(current);
        setSessionChecked(true);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.status === 401) setUser(null);
        setSessionChecked(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: la barra dorada sigue la sección visible en la landing.
  // Además cierra el menú móvil al cambiar de ruta.
  useEffect(() => {
    setMobileOpen(false);
    if (typeof window === 'undefined') return;
    const ids = LINKS.map((l) => l.id);
    const updateFromScroll = () => {
      if (window.location.pathname !== '/') return;
      // Respeta el click reciente: deja terminar el desplazamiento suave.
      if (scrollLockRef.current) return;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) {
          current = id;
        }
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    };
    updateFromScroll();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateFromScroll);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      /* limpia estado local aunque falle la red */
    } finally {
      setUser(null);
      setMobileOpen(false);
      setLoggingOut(false);
      router.push('/login');
      router.refresh();
    }
  }

  const isHome = pathname === '/';
  const solid = !isHome || scrolled || mobileOpen;
  const isAuthenticated = user !== null;

  const isActive = (id: string) => isHome && activeSection === id;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[60] transition-all duration-300 ${
        solid
          ? 'bg-[#0e0b0d]/95 backdrop-blur-md border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
          : 'bg-gradient-to-b from-black/85 via-black/55 to-black/5 border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Logo real */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="Omega Complex - Inicio">
          <Image
            src="/Logo-blanco.png"
            alt="Omega Complex"
            width={280}
            height={77}
            priority
            className="h-[52px] w-auto sm:h-[58px]"
          />
        </Link>

        {/* Links desktop */}
        <nav className="hidden items-center gap-7 lg:flex xl:gap-9" aria-label="Navegación principal">
          {LINKS.map((l) => {
            const active = isActive(l.id);
            return (
              <Link
                key={l.id}
                href={l.href}
                onClick={() => goToSection(l.id)}
                className={`relative pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors [text-shadow:0_1px_12px_rgba(0,0,0,0.65)] ${
                  active ? 'text-white' : 'text-white/65 hover:text-white'
                }`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-active-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-x-0 -bottom-[1px] h-[2px]"
                  >
                    <span className="nav-indicator-breathe block h-full w-full rounded-full" />
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Acciones derecha */}
        <div className="hidden items-center gap-3 lg:flex">
          {!sessionChecked ? (
            <span className="inline-block h-10 w-40 animate-pulse rounded-full bg-white/10" />
          ) : isAuthenticated && user ? (
            <>
              <span
                className="max-w-[160px] truncate rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white"
                title={user.email}
              >
                Hola, {user.firstName}
              </span>
              <Link
                href="/mis-reservas"
                className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:text-white"
              >
                <CalendarDays className="h-4 w-4" />
                <span>Mis reservas</span>
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Panel</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/50 hover:text-white disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{loggingOut ? 'Saliendo…' : 'Salir'}</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#d9b56c] px-7 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#1d1214] transition-all hover:bg-[#e9c886]"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

        {/* Botón móvil */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-white/20 p-2.5 text-white lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0e0b0d]/98 px-6 py-6 backdrop-blur-md lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Menú móvil">
            {LINKS.map((l) => {
              const active = isActive(l.id);
              return (
                <Link
                  key={l.id}
                  href={l.href}
                  onClick={() => {
                    goToSection(l.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-white/5 ${
                    active ? 'text-[#e9c886]' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-5 w-[2px] rounded-full transition-all ${
                      active ? 'bg-[#e9c886] shadow-[0_0_10px_rgba(233,200,134,0.9)]' : 'bg-white/15'
                    }`}
                  />
                  {l.label}
                </Link>
              );
            })}
            {isAuthenticated && user && (
              <>
                <Link
                  href="/mis-reservas"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-white/5"
                >
                  <CalendarDays className="h-4 w-4 text-[#d9b56c]" />
                  <span>Mis reservas y QR</span>
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-white/5"
                >
                  <User className="h-4 w-4 text-[#d9b56c]" />
                  <span>Perfil</span>
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-white/5"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#d9b56c]" />
                    <span>Panel admin</span>
                  </Link>
                )}
              </>
            )}
          </nav>
          <div className="mt-5 border-t border-white/10 pt-5">
            {!sessionChecked ? (
              <span className="block h-12 w-full animate-pulse rounded-xl bg-white/10" />
            ) : !isAuthenticated ? (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full bg-[#d9b56c] py-3.5 text-center text-sm font-bold uppercase tracking-[0.14em] text-[#1d1214]"
              >
                Iniciar sesión
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
