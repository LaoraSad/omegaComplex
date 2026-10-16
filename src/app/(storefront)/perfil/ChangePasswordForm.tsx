"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { changePassword, getAuthErrorMessage } from "@/lib/api/auth";

/** Cambio de contraseña con sesión iniciada. Vive en /perfil. */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await changePassword({ currentPassword, newPassword });
      setMessage(result.message);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(getAuthErrorMessage(err, "No se pudo cambiar la contraseña."));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 bg-black/30 border border-white/15 rounded-xl text-sm text-white outline-none placeholder:text-white/35 focus:border-[#c8a96b]";

  return (
    <section aria-label="Cambiar contraseña" className="space-y-4">
      <h2 className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
        <KeyRound className="w-3.5 h-3.5" />
        <span>Seguridad · Cambiar contraseña</span>
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cp-actual" className="block text-xs font-semibold text-white/55 mb-1">
            Contraseña actual
          </label>
          <input
            id="cp-actual"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cp-nueva" className="block text-xs font-semibold text-white/55 mb-1">
            Nueva contraseña (mínimo 8 caracteres)
          </label>
          <input
            id="cp-nueva"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#7a1f3d] hover:bg-[#8f2547] disabled:opacity-60 text-white text-xs font-bold transition-all"
          >
            {loading ? "Guardando…" : "Cambiar contraseña"}
          </button>
          {message ? <p role="status" className="text-xs font-bold text-emerald-300">{message}</p> : null}
          {error ? <p role="alert" className="text-xs font-bold text-rose-300">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
