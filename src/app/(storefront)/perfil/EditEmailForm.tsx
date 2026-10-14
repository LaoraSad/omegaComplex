"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { updateProfile, getAuthErrorMessage } from "@/lib/api/auth";

/** Fase 2: cambio de correo con re-verificación. Cierra la sesión y manda a /verify-email. */
export function EditEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await updateProfile({ email });
      if (result.emailChanged && result.newEmail) {
        router.push(`/verify-email?email=${encodeURIComponent(result.newEmail)}&sent=true`);
        router.refresh();
        return;
      }
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err, "No se pudo actualizar el correo."));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1F1F1F] outline-none focus:border-[#7A1F3D]";

  return (
    <section aria-label="Cambiar correo" className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] pb-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5" />
        <span>Contacto · Correo editable</span>
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="perfil-correo" className="block text-xs font-semibold text-[#6B7280] mb-1">
            Correo electrónico
          </label>
          <input
            id="perfil-correo"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <p className="text-[10px] text-[#6B7280] mt-1">
            Al cambiarlo se cierra tu sesión y debes verificar el correo nuevo con el código que te enviamos.
          </p>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] disabled:opacity-60 text-white text-xs font-bold transition-all"
          >
            {loading ? "Guardando…" : "Guardar correo"}
          </button>
          {error ? <p role="alert" className="text-xs font-bold text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
