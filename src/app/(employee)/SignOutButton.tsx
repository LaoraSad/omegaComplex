"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/api/auth";

/**
 * Cierre de sesión del punto de control. Es una copia del LogoutButton del panel
 * con estilos propios: admin.css no se carga en el shell del empleado.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
    } catch {
      // Se limpia la sesión local aunque falle la red.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" />
      Salir
    </button>
  );
}