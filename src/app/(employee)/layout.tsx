import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { EmployeeNav } from "./EmployeeNav";
import AmbientBubbles from "@/components/AmbientBubbles";
import SectionDivider from "@/components/SectionDivider";
import { cargarUsuarioDeSesion } from "@/shared/auth/session-user";
import { findEmployeeByUserId } from "@/features/access/access.repository";
import { getSession } from "@/shared/auth/session";

export const metadata: Metadata = {
  title: { default: "Control de acceso", template: "%s | Omega Complex" },
  description: "Validacion de QR e ingreso de clientes.",
};

/**
 * Shell del punto de control. Solo existe para el empleado: sus pantallas son
 * validar QR y consultar sus turnos. No hay enlace al sitio publico porque en
 * el punto de control no se necesita.
 */
export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/validar");
  if (session.role !== "employee" && session.role !== "admin") redirect("/");

  const user = await cargarUsuarioDeSesion(session.userId);
  if (!user) redirect("/login?next=/validar");

  const employee = await findEmployeeByUserId(session.userId);
  const sinZonas = !employee || employee.zones.length === 0;

  return (
    <div className="omega-dark-section relative flex min-h-screen flex-col text-[#f6f4f3]">
      {/* Fondo del Inicio: resplandor + burbujas. Decorativo y sin interacción. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="omega-cta-glow" />
        <AmbientBubbles variant="gold" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0e0b0d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/Logo-blanco.png"
              alt="Omega Complex"
              width={147}
              height={80}
              priority
              className="h-9 w-auto sm:h-10"
            />
          </div>
          <SignOutButton />
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-3">
          <p className="truncate text-xs text-white/55">
            {user.firstName} {user.lastName}
            {sinZonas ? (
              <span className="text-amber-300"> · Sin zonas asignadas</span>
            ) : (
              <>
                {" · "}
                <span className="text-white/75">
                  {employee.zones.length} {employee.zones.length === 1 ? "zona" : "zonas"}
                </span>
              </>
            )}
          </p>
        </div>

        <EmployeeNav />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>

      <div className="relative z-10">
        <SectionDivider />
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
        <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-white/35">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          El acceso nunca es automatico: revisa la ficha y confirma el ingreso. Cada QR es de un solo
          uso, no se permite el reingreso.
        </p>
      </footer>
    </div>
  );
}