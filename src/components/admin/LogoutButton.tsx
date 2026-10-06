"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/api/auth";

export function LogoutButton() {
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
      className="aicon-btn"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      style={{ border: "1px solid #e8e1de" }}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
