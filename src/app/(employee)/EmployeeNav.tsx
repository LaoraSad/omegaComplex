"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ScanLine } from "lucide-react";

// El empleado solo tiene dos pantallas: validar QR y ver sus zonas.
const TABS = [
  { href: "/validar", label: "Validar QR", icon: ScanLine },
  { href: "/turnos", label: "Mis zonas", icon: MapPin },
] as const;

export function EmployeeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del empleado" className="mx-auto max-w-2xl px-4 pb-3">
      <ul className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const activo = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  activo
                    ? "bg-[#7a1f3d] text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/85"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}