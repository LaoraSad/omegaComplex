"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { updateProfile, getAuthErrorMessage } from "@/lib/api/auth";

/** Cambio de correo con re-verificación. Cierra la sesión y manda a /verify-email. */
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
    "w-full px-3.5 py-2.5 bg-black/30 border border-white/15 rounded-xl text-sm text-white outline-none placeholder:text-white/35 focus:border-[#c8a96b]";

  return (
    <section aria-label="Cambiar correo" className="space-y-4">
      <h2 className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
        <Mail className="w-3.5 h-3.5" />
        <span>Contacto · Correo editable</span>
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="perfil-correo" className="block text-xs font-semibold text-white/55 mb-1">
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
          <p className="text-[10px] text-white/45 mt-1">
            Al cambiarlo se cierra tu sesión y debes verificar el correo nuevo con el código que te enviamos.
          </p>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7a1f3d] hover:bg-[#8f2547] disabled:opacity-60 text-white text-xs font-bold transition-all"
          >
            {loading ? "Guardando…" : "Guardar correo"}
          </button>
          {error ? <p role="alert" className="text-xs font-bold text-rose-300">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
