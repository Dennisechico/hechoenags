import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Mail,
  MessageCircle,
  Building2,
  Truck,
} from 'lucide-react';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { login, users } = useApp();
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password form state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu usuario y contraseña.');
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      const res = login(username.trim(), password);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        if (onSuccess) onSuccess();
      }
    }, 250);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg(null);

    const term = resetIdentifier.trim().toLowerCase();
    if (!term) {
      setResetErrorMsg('Ingresa tu nombre de usuario o correo para continuar.');
      return;
    }

    // Check if user exists (without exposing their credentials)
    const matchingUser = users.find(
      (u) => u.username.toLowerCase() === term || u.email.toLowerCase() === term
    );

    setResetSubmitted(true);
    if (matchingUser) {
      setResetSuccessMessage(
        `Hemos localizado la cuenta vinculada a "${resetIdentifier.trim()}". Tu solicitud de restablecimiento ha sido turnada a la Administración General. Se validará tu identidad para emitir tu nueva contraseña segura.`
      );
    } else {
      setResetSuccessMessage(
        `Si la cuenta "${resetIdentifier.trim()}" existe en la plataforma, la solicitud ha sido enviada para verificación del administrador.`
      );
    }
  };

  const resetFormState = () => {
    setMode('login');
    setResetSubmitted(false);
    setResetIdentifier('');
    setResetErrorMsg(null);
    setResetSuccessMessage(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[32px] border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Left Column: Visual Showcase & Brand Value (White base with vivid pops) */}
        <div className="lg:col-span-5 bg-[#FAFBFD] p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="space-y-6">
            {/* Header Brand */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-orange-500/25 border-2 border-white flex-shrink-0">
                AGS
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                  Ecosistema Hidrocálido
                </span>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Hecho en <span className="text-orange-600">Aguascalientes</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">Logística B2B Colaborativa</p>
              </div>
            </div>

            {/* Glowing Hero Metric Cards */}
            <div className="space-y-3.5">
              <div className="p-5 rounded-2xl text-white shadow-lg shadow-orange-500/20 relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600">
                <div className="flex items-center justify-between text-xs font-semibold opacity-95 mb-2">
                  <span>Red Logística Activa</span>
                  <span className="bg-white/25 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    AGUASCALIENTES
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight">48%</span>
                  <span className="text-xs font-bold text-amber-100">Ahorro en fletes</span>
                </div>
                <p className="text-[11px] text-white/90 mt-1 leading-relaxed">
                  Consolidación de entregas en tiendas de abarrotes, vinaterías y puntos gourmet de la entidad.
                </p>
              </div>

              <div className="p-5 rounded-2xl text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900">
                <div className="flex items-center justify-between text-xs font-semibold opacity-95 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D4F63D]" />
                    Acceso Multi-Tenant Seguro
                  </span>
                  <span className="bg-[#D4F63D] text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                    Privado
                  </span>
                </div>
                <p className="text-xs text-emerald-50 mt-1 font-medium leading-relaxed">
                  Cada marca local y operador cuenta con acceso individualizado. La información de inventarios, pedidos y clientes está estrictamente aislada.
                </p>
              </div>
            </div>

            {/* Enterprise Security Callout */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-slate-800 text-xs font-extrabold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Portal Protegido y Cifrado</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Acceso exclusivo para personal operativo autorizado y marcas locales aliadas de Aguascalientes. Introduce tus credenciales personales para ingresar al panel de control.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Sistema Seguro con Cifrado SSL · Aguascalientes, Mx</span>
          </div>
        </div>

        {/* Right Column: Clean Login & Forgot Password Dashboard (NO user or password leaks) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            {mode === 'login' ? (
              <>
                {/* Header */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4F63D] text-slate-900 text-xs font-black mb-2 shadow-2xs">
                    <KeyRound className="w-3.5 h-3.5" /> Portal de Acceso
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Iniciar Sesión
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Ingresa tus credenciales autorizadas para acceder a tu panel de control.
                  </p>
                </div>

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Usuario o Correo Electrónico
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="Ingresa tu usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="font-medium text-[11px]">Recordar en este equipo</span>
                    </label>

                    {/* Forgot password link */}
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
                    disabled={isSubmitting}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-slate-900/15 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Footer security badge */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Conexión cifrada de extremo a extremo</span>
                </div>
              </>
            ) : (
              /* FORGOT PASSWORD DASHBOARD */
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <button
                    type="button"
                    onClick={resetFormState}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold mb-3 cursor-pointer group"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Volver al inicio de sesión</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black mb-2 shadow-2xs">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Recuperación de Clave
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    ¿Olvidaste tu contraseña?
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Ingresa el nombre de usuario o correo asignado a tu cuenta para solicitar un restablecimiento seguro.
                  </p>
                </div>

                {resetErrorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span>{resetErrorMsg}</span>
                  </div>
                )}

                {!resetSubmitted ? (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Usuario o Correo Registrado
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="ej. tu_usuario o correo@ejemplo.com"
                          value={resetIdentifier}
                          onChange={(e) => setResetIdentifier(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:border-slate-900 focus:bg-white focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Enviar Solicitud de Restablecimiento</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Solicitud Registrada con Éxito</span>
                      </div>
                      <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                        {resetSuccessMessage}
                      </p>
                    </div>

                    <div className="bg-[#FAFBFD] border border-slate-200/90 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Contacto Directo con Administración</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Si requieres acceso urgente para coordinar entregas o actualizar existencias, contacta directamente a <strong>Administración General</strong>:
                      </p>

                      <a
                        href="https://wa.me/524491234567?text=Hola,%20necesito%20restablecer%20mi%20contrase%C3%B1a%20en%20la%20plataforma%20Hecho%20en%20Aguascalientes"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Contactar a Soporte por WhatsApp</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={resetFormState}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Regresar al Inicio de Sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
