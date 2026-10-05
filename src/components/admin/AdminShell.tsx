"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Menu, Search, X } from "lucide-react";
import { ADMIN_NAV } from "./admin-nav";
import { formatTodayLong, initials } from "./format";
import { LogoutButton } from "./LogoutButton";

export interface AdminUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface AdminShellProps {
  user: AdminUser;
  children: React.ReactNode;
}

function isActive(pathname: string, match: string): boolean {
  return new RegExp(match).test(pathname);
}

/** Estructura admin: sidebar fija + topbar + contenido. Drawer en mobile. */
export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div className={`admin-shell${navOpen ? " nav-open" : ""}`}>
      <a href="#admin-content" className="admin-skip">
        Saltar al contenido
      </a>

      {navOpen ? (
        <div
          aria-hidden="true"
          className="admin-scrim"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside aria-label="Navegación administrativa" className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <Link href="/admin" aria-label="Omega Complex — Panel" className="admin-brand-link">
            <Image
              src="/Logo-blanco.png"
              alt="Omega Complex"
              width={300}
              height={120}
              priority
              className="admin-sidebar-logo"
            />
          </Link>
          <button
            type="button"
            className="aicon-btn admin-menu-btn admin-menu-btn-light"
            style={{ marginLeft: "auto" }}
            aria-label="Cerrar menú"
            onClick={() => setNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_NAV.map((section) => (
            <div key={section.title} className="admin-nav-section">
              <p className="admin-nav-title">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const current = isActive(pathname, item.match);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className="admin-nav-link"
                      onClick={() => setNavOpen(false)}
                    >
                      <span aria-hidden="true" className="admin-nav-icon">
                        <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.9} />
                      </span>
                      <span className="admin-nav-text">
                        <span className="admin-nav-label">{item.label}</span>
                        <span className="admin-nav-desc">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-profile">
            <span
              aria-hidden="true"
              className="admin-profile-avatar"
            >
              {initials(user.firstName, user.lastName)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="admin-profile-name block truncate text-[0.84rem] font-bold">
                {user.firstName} {user.lastName}
              </span>
              <span className="admin-profile-role block truncate text-[0.7rem]">
                Administrador · {user.email}
              </span>
            </span>
            <LogoutButton />
          </div>
          <Link href="/piscinas/inicio" className="admin-site-link">
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.9} />
            <span>Ver sitio público</span>
          </Link>
        </div>
      </aside>

      <div className="admin-main-col">
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <button
              type="button"
              className="aicon-btn admin-menu-btn"
              aria-label="Abrir menú de navegación"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
              style={{ border: "1px solid #e8e1de" }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <form action="/admin/reservas" method="GET" role="search" className="admin-topbar-search">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
              <input
                type="search"
                name="q"
                placeholder="Buscar en Omega Complex…"
                aria-label="Buscar reservas por cliente, documento o servicio"
                autoComplete="off"
              />
            </form>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="admin-topbar-date hidden md:inline">{formatTodayLong()}</span>
              <span
                title={`${user.firstName} ${user.lastName} · Administrador`}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#7a1f3d] text-xs font-bold text-white"
              >
                {initials(user.firstName, user.lastName)}
              </span>
            </div>
          </div>
        </header>

        <main id="admin-content" className="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
