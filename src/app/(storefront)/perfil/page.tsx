import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { findSessionUserById } from "@/features/auth/auth.repository";
import { getSession } from "@/shared/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Mi perfil",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  employee: "Empleado",
  user: "Cliente",
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

// Muestra UNICAMENTE la informacion del usuario autenticado en la sesion.
// Sin datos fijos, sin mocks, sin guardado ficticio.
export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/perfil");

  const user = await findSessionUserById(session.userId);
  if (!user) redirect("/login?next=/perfil");

  const roleLabel = ROLE_LABEL[user.role] ?? "Cliente";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Encabezado */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
          Configuración de Cuenta
        </span>
        <h1 className="text-3xl font-black text-[#1F1F1F] tracking-tight">
          Perfil del {roleLabel}
        </h1>
        <p className="text-sm text-[#6B7280]">
          Información de tu cuenta en Omega Complex, tal como está registrada en el sistema.
        </p>
      </div>

      <section
        aria-label="Datos de tu cuenta"
        className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6"
      >
        {/* Identidad */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#E5E7EB]">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#7A1F3D] text-lg font-bold text-white"
          >
            {initials(user.firstName, user.lastName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-[#1F1F1F]">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-sm text-[#6B7280]">{user.email}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#7A1F3D]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#7A1F3D]">
              <ShieldCheck className="h-3 w-3" />
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Datos de identificación */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] pb-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Datos de Identificación (No modificables)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="block text-xs font-semibold text-[#6B7280] mb-1">Nombre</p>
              <p className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F]">
                {user.firstName}
              </p>
            </div>
            <div>
              <p className="block text-xs font-semibold text-[#6B7280] mb-1">Apellido</p>
              <p className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F]">
                {user.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-[#1F1F1F] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#7A1F3D]" />
                <span>Correo electrónico</span>
              </p>
              <p className="w-full truncate px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F]">
                {user.email}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1">
                Aquí recibes los códigos QR de tus reservas.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F1F1F] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#7A1F3D]" />
                <span>Teléfono de contacto</span>
              </p>
              <p className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F]">
                {user.phone ?? "Sin registrar"}
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[#6B7280] flex items-start gap-1.5 rounded-xl bg-[#F5F5F5] border border-[#E5E7EB] px-3.5 py-2.5">
            <UserRound className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Por seguridad, los datos de identificación no se pueden modificar desde esta vista.
              El documento y la fecha de nacimiento no se muestran en tu sesión actual.
            </span>
          </p>
        </div>

        <ChangePasswordForm />

        {/* Acciones */}
        <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EB]">
          <Link href="/mis-reservas" className="text-xs font-bold text-[#6B7280] hover:text-[#7A1F3D] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir a mis reservas</span>
          </Link>
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="px-6 py-3 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white text-xs font-bold shadow-xs transition-all"
            >
              Ir al panel
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
