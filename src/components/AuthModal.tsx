import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
  X,
} from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, isOpen = true }) => {
  const { login, users } = useApp();
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa usuario y contraseña.');
      return;
    }
    const res = login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      if (onClose) onClose();
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg(null);
    const term = resetIdentifier.trim().toLowerCase();
    if (!term) {
      setResetErrorMsg('Ingresa tu usuario o correo electrónico.');
      return;
    }

    setResetSubmitted(true);
    setResetSuccessMessage(
      `Solicitud enviada para "${resetIdentifier.trim()}". La Administración General validará la solicitud para emitir tus nuevas credenciales.`
    );
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in relative">
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Banner */}
        <div className="bg-[#FAFBFD] p-6 text-center border-b border-slate-100 relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white font-black text-base mx-auto shadow-md shadow-orange-500/20 mb-3 border border-white">
            AGS
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4F63D] text-slate-900 text-[10px] font-black mb-1.5 shadow-2xs">
            <KeyRound className="w-3 h-3" /> Acceso Seguro
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {mode === 'login' ? 'Iniciar Sesión' : 'Recuperar Contraseña'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Red Logística y de Distribución "Hecho en Aguascalientes"
          </p>
        </div>

        <div className="p-6 space-y-5 bg-white">
          {mode === 'login' ? (
            <>
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario o Correo
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ingresa tu usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-slate-900/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Credenciales protegidas y aisladas</span>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetSubmitted(false);
                  setResetErrorMsg(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a iniciar sesión</span>
              </button>

              {resetErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{resetErrorMsg}</span>
                </div>
              )}

              {!resetSubmitted ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Usuario o Correo Registrado
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="ej. tu_usuario o correo"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-orange-600/15 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Enviar Solicitud</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Solicitud Enviada</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                      {resetSuccessMessage}
                    </p>
                  </div>

                  <a
                    href="https://wa.me/524491234567?text=Hola,%20necesito%20restablecer%20mi%20contrase%C3%B1a%20en%20la%20plataforma%20Hecho%20en%20Aguascalientes"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contactar a Soporte por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setResetSubmitted(false);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Regresar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
