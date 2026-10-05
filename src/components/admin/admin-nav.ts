import {
  CalendarDays,
  Clock,
  FileText,
  Layers,
  LayoutDashboard,
  QrCode,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  match: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: "Operación",
    items: [
      {
        href: "/admin",
        label: "Panel",
        description: "Resumen del complejo",
        icon: LayoutDashboard,
        match: "^/admin$",
      },
      {
        href: "/admin/reservas",
        label: "Reservas",
        description: "Gestión y detalle",
        icon: CalendarDays,
        match: "^/admin/reservas",
      },
      {
        href: "/admin/accesos",
        label: "Accesos",
        description: "Entradas y QR",
        icon: QrCode,
        match: "^/admin/accesos",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      {
        href: "/admin/servicios",
        label: "Servicios",
        description: "Instalaciones y precios",
        icon: Layers,
        match: "^/admin/servicios",
      },
      {
        href: "/admin/horarios",
        label: "Horarios",
        description: "Disponibilidad y bloqueos",
        icon: Clock,
        match: "^/admin/horarios",
      },
    ],
  },
  {
    title: "Personas",
    items: [
      {
        href: "/admin/empleados",
        label: "Empleados",
        description: "Asignación por zona",
        icon: UserCheck,
        match: "^/admin/empleados",
      },
      {
        href: "/admin/clientes",
        label: "Clientes",
        description: "Directorio y cuentas",
        icon: Users,
        match: "^/admin/clientes",
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        href: "/admin/reportes",
        label: "Reportes",
        description: "Exportación de datos",
        icon: FileText,
        match: "^/admin/reportes",
      },
    ],
  },
];

export function findActiveNav(pathname: string): AdminNavItem | null {
  for (const section of ADMIN_NAV) {
    for (const item of section.items) {
      if (new RegExp(item.match).test(pathname)) return item;
    }
  }
  return null;
}
