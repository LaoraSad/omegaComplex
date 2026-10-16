"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { updateProfile, getAuthErrorMessage } from "@/lib/api/auth";

/** Edición del teléfono de contacto. Vive en /perfil. */
export function EditPhoneForm({ initialPhone }: { initialPhone: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await updateProfile({ phone });
      setMessage("Teléfono actualizado correctamente.");
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err, "No se pudo actualizar el teléfono."));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 bg-black/30 border border-white/15 rounded-xl text-sm text-white outline-none placeholder:text-white/35 focus:border-[#c8a96b]";

  return (
    <section aria-label="Editar teléfono" className="space-y-4">
      <h2 className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
        <Phone className="w-3.5 h-3.5" />
        <span>Contacto · Teléfono editable</span>
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="perfil-telefono" className="block text-xs font-semibold text-white/55 mb-1">
            Teléfono de contacto
          </label>
          <input
            id="perfil-telefono"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+573001234567"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7a1f3d] hover:bg-[#8f2547] disabled:opacity-60 text-white text-xs font-bold transition-all"
          >
            {loading ? "Guardando…" : "Guardar teléfono"}
          </button>
          {message ? <p role="status" className="text-xs font-bold text-emerald-300">{message}</p> : null}
          {error ? <p role="alert" className="text-xs font-bold text-rose-300">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
