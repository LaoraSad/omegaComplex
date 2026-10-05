'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, CheckCircle2, ArrowLeft, Phone, Mail, Key } from 'lucide-react';

export default function ProfilePage() {
  const [phone, setPhone] = useState('310 123 4567');
  const [email, setEmail] = useState('cliente@ejemplo.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Encabezado */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
          Configuración de Cuenta
        </span>
        <h1 className="text-3xl font-black text-[#1F1F1F] tracking-tight">
          Perfil del Cliente
        </h1>
        <p className="text-sm text-[#6B7280]">
          Consulta tus datos de identificación y actualiza tu información de contacto autorizada.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
        {/* Notificación de guardado */}
        {isSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tus datos de contacto han sido actualizados correctamente.</span>
          </div>
        )}

        {/* Sección: Datos no editables */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] pb-2 border-b border-[#E5E7EB] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Datos de Identificación (No modificables)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1">Nombre</label>
              <input
                type="text"
                value="Carlos Andrés"
                disabled
                className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F] cursor-not-allowed opacity-80"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1">Apellido</label>
              <input
                type="text"
                value="Rodríguez Gómez"
                disabled
                className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F] cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1">
                Documento de Identidad (Bloqueado)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value="CC 1.020.304.506"
                  disabled
                  className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F] cursor-not-allowed opacity-80"
                />
                <Lock className="w-3.5 h-3.5 absolute right-3.5 top-3.5 text-[#6B7280]" />
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1">
                El número de documento no puede ser modificado por seguridad.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1">Fecha de Nacimiento</label>
              <input
                type="text"
                value="14 / 08 / 1995"
                disabled
                className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#1F1F1F] cursor-not-allowed opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Sección: Datos modificables */}
        <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1F3D] pb-2 border-b border-[#E5E7EB]">
            Datos de Contacto y Seguridad (Modificables)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#7A1F3D]" />
                <span>Teléfono móvil de contacto</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:border-[#7A1F3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#7A1F3D]" />
                <span>Correo electrónico (Para recepción de códigos QR)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:border-[#7A1F3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#7A1F3D]" />
                <span>Contraseña de acceso</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:border-[#7A1F3D]"
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 flex items-center justify-between">
          <Link href="/mis-reservas" className="text-xs font-bold text-[#6B7280] hover:text-[#7A1F3D] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir a mis reservas</span>
          </Link>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
