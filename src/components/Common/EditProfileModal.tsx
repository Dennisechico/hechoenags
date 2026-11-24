import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, X, CheckCircle2, UserCheck, Mail, Phone, Shield } from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { currentUser, updateUserProfile } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(currentUser.id, {
      name: name.trim() || currentUser.name,
      email: email.trim(),
      phone: phone.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const roleLabel =
    currentUser.role === 'admin'
      ? 'Super Administrador (Operaciones)'
      : currentUser.role === 'warehouse'
      ? 'Administrador 2 (Almacén y Oficina)'
      : currentUser.role === 'driver'
      ? 'Repartidor de Ruta (Campo)'
      : 'Marca Pyme Afiliada';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        <div className="bg-[#FAFBFD] px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Editar Datos de Perfil
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Personaliza con tus datos reales para pruebas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900">¡Perfil Guardado!</h4>
            <p className="text-xs text-slate-500">
              Los cambios se han actualizado en tu sesión activa.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-extrabold text-slate-900 block">{roleLabel}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Usuario: @{currentUser.username}
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {currentUser.role}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo / Razón de Contacto
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre real para pruebas"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Este nombre aparecerá en tickets, remisiones y en el encabezado.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono / WhatsApp de Contacto
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ej. 449-123-4567"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-sm"
              >
                Guardar Datos Reales
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
