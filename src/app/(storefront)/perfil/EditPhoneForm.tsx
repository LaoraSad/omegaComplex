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
    "w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1F1F1F] outline-none focus:border-[#7A1F3D]";

  return (
    <section aria-label="Editar teléfono" className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] pb-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5" />
        <span>Contacto · Teléfono editable</span>
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="perfil-telefono" className="block text-xs font-semibold text-[#6B7280] mb-1">
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
            className="px-6 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] disabled:opacity-60 text-white text-xs font-bold transition-all"
          >
            {loading ? "Guardando…" : "Guardar teléfono"}
          </button>
          {message ? <p role="status" className="text-xs font-bold text-green-700">{message}</p> : null}
          {error ? <p role="alert" className="text-xs font-bold text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
