import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck, UserRound } from "lucide-react";
import { cargarUsuarioDeSesion } from "@/shared/auth/session-user";
import { getSession } from "@/shared/auth/session";
import DarkSection from "@/components/ui/DarkSection";
import OmegaCard from "@/components/ui/OmegaCard";
import SectionHeading from "@/components/ui/SectionHeading";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { EditEmailForm } from "./EditEmailForm";
import { EditPhoneForm } from "./EditPhoneForm";
import { PendingEmailBanner } from "./PendingEmailBanner";

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

  const user = await cargarUsuarioDeSesion(session.userId);
  if (!user) redirect("/login?next=/perfil");

  const roleLabel = ROLE_LABEL[user.role] ?? "Cliente";

  return (
    <DarkSection className="min-h-screen">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Configuración de Cuenta"
          title={`Perfil del ${roleLabel}`}
          subtitle="Información de tu cuenta en Omega Complex, tal como está registrada en el sistema."
        />

        <OmegaCard innerClassName="space-y-6 p-6 sm:p-8">
          {/* Identidad */}
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <span
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#7a1f3d] text-lg font-bold text-white"
            >
              {initials(user.firstName, user.lastName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-sm text-white/60">{user.email}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#e3bd74]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#e3bd74]">
                <ShieldCheck className="h-3 w-3" />
                {roleLabel}
              </p>
            </div>
          </div>

          {/* Datos de identificación */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
              <Lock className="h-3.5 w-3.5" />
              <span>Datos de Identificación (No modificables)</span>
            </h2>

            {user.emailVerified ? null : <PendingEmailBanner email={user.email} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 block text-xs font-semibold text-white/55">Nombre</p>
                <p className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-bold text-white">
                  {user.firstName}
                </p>
              </div>
              <div>
                <p className="mb-1 block text-xs font-semibold text-white/55">Apellido</p>
                <p className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-bold text-white">
                  {user.lastName}
                </p>
              </div>
            </div>

            <p className="flex items-start gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/55">
              <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Por seguridad, el nombre, el apellido, el documento y la fecha de nacimiento no se pueden
                modificar desde esta vista. El documento y la fecha de nacimiento no se muestran en tu sesión actual.
              </span>
            </p>
          </div>

          <EditEmailForm currentEmail={user.email} />

          <EditPhoneForm initialPhone={user.phone} />

          <ChangePasswordForm />

          {/* Acciones */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <Link href="/mis-reservas" className="flex items-center gap-1 text-xs font-bold text-white/60 hover:text-[#e3bd74]">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Ir a mis reservas</span>
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-xl bg-[#7a1f3d] px-6 py-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#8f2547]"
              >
                Ir al panel
              </Link>
            ) : null}
          </div>
        </OmegaCard>
      </div>
    </DarkSection>
  );
}
