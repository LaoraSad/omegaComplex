'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Menu,
  X,
  User,
  CalendarDays,
  Info,
  LogOut,
  Sparkles,
  Layers,
  LayoutDashboard,
} from 'lucide-react';
import { AuthApiError, logout, me, type AuthUser } from '@/lib/api/auth';

interface NavbarProps {
  initialUser: AuthUser | null;
}

export default function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [prevInitialUser, setPrevInitialUser] = useState<AuthUser | null>(initialUser);
  const [loggingOut, setLoggingOut] = useState(false);

  // Sincroniza si el layout entrega un usuario distinto (p. ej. tras login).
  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser);
  }

  // Respaldo: si el layout se renderizó sin sesión (navegación cliente),
  // consulta la sesión vigente una sola vez al montar.
  useEffect(() => {
    if (initialUser) return;
    let cancelled = false;
    me().then(
      (current) => {
        if (!cancelled) setUser(current);
      },
      (error: unknown) => {
        if (!cancelled && error instanceof AuthApiError && error.status === 401) {
          setUser(null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  const isAuthenticated = user !== null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Aunque falle la red, se limpia el estado local y se redirige.
    } finally {
      setUser(null);
      setMobileMenuOpen(false);
      setLoggingOut(false);
      router.push('/login');
      router.refresh();
    }
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo / Nombre */}
        <Link href="/piscinas/inicio" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#7A1F3D] text-white flex items-center justify-center font-black text-xl shadow-xs tracking-tighter group-hover:bg-[#631730] transition-colors">
            Ω
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-[#1F1F1F] leading-none">
              OMEGA <span className="text-[#7A1F3D]">COMPLEX</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#C8A96B] mt-0.5">
              Complejo Deportivo & Recreativo
            </span>
          </div>
        </Link>

        {/* Enlaces Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/piscinas/inicio"
            className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/piscinas/inicio')
                ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                : 'text-[#6B7280] hover:text-[#1F1F1F]'
            }`}
          >
            <span>Inicio</span>
          </Link>
          <Link
            href="/servicios"
            className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/servicios')
                ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                : 'text-[#6B7280] hover:text-[#1F1F1F]'
            }`}
          >
            <Layers className="w-4 h-4 opacity-70" />
            <span>Servicios</span>
          </Link>
          <Link
            href="/informacion"
            className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/informacion')
                ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                : 'text-[#6B7280] hover:text-[#1F1F1F]'
            }`}
          >
            <Info className="w-4 h-4 opacity-70" />
            <span>Información</span>
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/piscinas/dashboard"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/piscinas/dashboard')
                  ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                  : 'text-[#6B7280] hover:text-[#1F1F1F]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 opacity-70" />
              <span>Dashboard</span>
            </Link>
          )}

          {/* Enlaces específicos de Usuario Autenticado */}
          {isAuthenticated && (
            <>
              <Link
                href="/mis-reservas"
                className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/mis-reservas')
                    ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                    : 'text-[#6B7280] hover:text-[#1F1F1F]'
                }`}
              >
                <CalendarDays className="w-4 h-4 opacity-70" />
                <span>Mis reservas</span>
              </Link>
              <Link
                href="/perfil"
                className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/perfil')
                    ? 'text-[#7A1F3D] border-b-2 border-[#7A1F3D] pb-1'
                    : 'text-[#6B7280] hover:text-[#1F1F1F]'
                }`}
              >
                <User className="w-4 h-4 opacity-70" />
                <span>Perfil</span>
              </Link>
            </>
          )}
        </div>

        {/* Acciones de Autenticación Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <span
              className="text-[11px] font-semibold text-[#1F1F1F] bg-[#F5F5F5] px-3.5 py-1.5 rounded-full border border-[#E5E7EB] flex items-center gap-1.5"
              title={user.email}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hola, {user.firstName}</span>
            </span>
          ) : null}

          {!isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#1F1F1F] hover:text-[#7A1F3D] px-3 py-2 transition-colors cursor-pointer"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-[#7A1F3D] hover:bg-[#631730] text-white px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-[#C8A96B]" />
                <span>Registrarse</span>
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm font-semibold text-[#6B7280] hover:text-[#7A1F3D] px-4 py-2 rounded-xl border border-[#E5E7EB] hover:border-[#7A1F3D] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</span>
            </button>
          )}
        </div>

        {/* Botón Hamburger Mobile */}
        <div className="md:hidden flex items-center gap-2">
          {isAuthenticated && user ? (
            <span className="text-[11px] font-semibold text-[#1F1F1F] bg-[#F5F5F5] px-2.5 py-1 rounded-md border border-[#E5E7EB] max-w-28 truncate">
              {user.firstName}
            </span>
          ) : null}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-[#1F1F1F] hover:bg-[#F5F5F5] border border-[#E5E7EB]"
            aria-label="Menú principal"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-5 py-6 space-y-4 shadow-xl">
          <div className="flex flex-col space-y-3 font-semibold text-[#1F1F1F]">
            <Link
              href="/piscinas/inicio"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/piscinas/inicio') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
            >
              <span>Inicio</span>
            </Link>
            <Link
              href="/servicios"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/servicios') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
            >
              <Layers className="w-4 h-4 text-[#7A1F3D]" />
              <span>Servicios</span>
            </Link>
            <Link
              href="/informacion"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/informacion') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
            >
              <Info className="w-4 h-4 text-[#7A1F3D]" />
              <span>Información del complejo</span>
            </Link>
            {user?.role === 'admin' && (
              <Link
                href="/piscinas/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/piscinas/dashboard') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#7A1F3D]" />
                <span>Dashboard</span>
              </Link>
            )}

            {isAuthenticated && (
              <>
                <Link
                  href="/mis-reservas"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/mis-reservas') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
                >
                  <CalendarDays className="w-4 h-4 text-[#7A1F3D]" />
                  <span>Mis reservas y QR</span>
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg flex items-center gap-2.5 ${isActive('/perfil') ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'hover:bg-[#F5F5F5]'}`}
                >
                  <User className="w-4 h-4 text-[#7A1F3D]" />
                  <span>Perfil</span>
                </Link>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col gap-2.5">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-semibold text-sm text-[#1F1F1F] bg-[#F5F5F5] rounded-xl block"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-semibold text-sm bg-[#7A1F3D] text-white rounded-xl shadow-xs block"
                >
                  Registrarse
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full py-2.5 text-center font-semibold text-sm text-[#7A1F3D] border border-[#7A1F3D] rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
