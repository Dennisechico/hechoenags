import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Users,
  ShieldCheck,
  Truck,
  Building2,
  Boxes,
  Check,
  LogOut,
  ArrowRight,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoginModal?: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenLoginModal,
}) => {
  const { currentUser, impersonatorUser, users, brands, switchUser, exitImpersonation, logout } = useApp();

  if (!isOpen) return null;

  const isRealSuperAdmin = (impersonatorUser || currentUser)?.role === 'admin';
  const adminUsers = users.filter((u) => u.role === 'admin');
  const warehouseUsers = users.filter((u) => u.role === 'warehouse');
  const driverUsers = users.filter((u) => u.role === 'driver');
  const brandUsers = users.filter((u) => u.role === 'brand');

  const handleSelect = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.status === 'blocked') return;
    if (impersonatorUser && target.id === impersonatorUser.id) {
      exitImpersonation();
      onClose();
      return;
    }
    switchUser(userId);
    onClose();
  };

  const handleLogoutAndLogin = () => {
    logout();
    onClose();
    if (onOpenLoginModal) {
      onOpenLoginModal();
    }
  };

  const handleOpenLoginScreen = () => {
    onClose();
    if (onOpenLoginModal) {
      onOpenLoginModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBFD] px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {isRealSuperAdmin ? 'Entrar como (Supervisión Auditada)' : 'Sesión & Cambio de Cuenta'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isRealSuperAdmin
                  ? 'Toda vista como otro usuario queda registrada en la Bitácora de Auditoría'
                  : 'Por seguridad, inicia sesión con tu usuario y contraseña para cambiar de rol'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Current user banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                {currentUser?.role === 'admin'
                  ? '👑'
                  : currentUser?.role === 'warehouse'
                  ? '📦'
                  : currentUser?.role === 'driver'
                  ? '🚚'
                  : '🏬'}
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Sesión Activa Actualmente:
                </span>
                <span className="text-xs font-black text-slate-900">{currentUser?.name}</span>
                <span className="text-[11px] text-orange-600 font-bold block">
                  {currentUser?.role === 'admin'
                    ? 'Rol 1: Administrador 1 (Operaciones y Marcas)'
                    : currentUser?.role === 'warehouse'
                    ? 'Rol 2: Administrador 2 (Almacén y Oficina)'
                    : currentUser?.role === 'driver'
                    ? 'Rol 3: Repartidor de Ruta (Campo)'
                    : 'Marca Pyme Afiliada'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En Línea
            </span>
          </div>

          {!isRealSuperAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-extrabold">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Cambio de usuario protegido</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Solo el Super Administrador puede usar la función auditada "Entrar como". Para cambiar de cuenta, cierra sesión o ingresa con credenciales.
              </p>
            </div>
          )}

          {isRealSuperAdmin && (
            <>
              {/* Section 1: Super Administrador */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
                  <span>Rol 1: Super Administrador (Operaciones y Marcas)</span>
                </span>
                {adminUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isBlocked = u.status === 'blocked';
                  return (
                    <button
                      key={u.id}
                      disabled={isBlocked}
                      onClick={() => handleSelect(u.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                        isBlocked
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                          : isCurrent
                          ? 'bg-amber-50/80 border-amber-300 shadow-2xs cursor-pointer'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">👑</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Usuario: <strong className="font-mono text-slate-800">{u.username}</strong> · Acceso total estratégico
                          </p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                          Activo ✓
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 hover:text-slate-900 shrink-0">
                          {impersonatorUser?.id === u.id ? 'Volver a Admin →' : 'Entrar como →'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section 2: Administrador de Almacén y Oficina */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
                  <span>Rol 2: Administrador de Oficina y Almacén (Encargada de Acopio)</span>
                </span>
                {warehouseUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isBlocked = u.status === 'blocked';
                  return (
                    <button
                      key={u.id}
                      disabled={isBlocked}
                      onClick={() => handleSelect(u.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                        isBlocked
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                          : isCurrent
                          ? 'bg-purple-50/80 border-purple-300 shadow-2xs cursor-pointer'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">📦</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Usuario: <strong className="font-mono text-slate-800">{u.username}</strong> · Cargas, retornos y auditoría
                          </p>
                        </div>
                      </div>
                      {isBlocked ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                          Bloqueado
                        </span>
                      ) : isCurrent ? (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full shrink-0">
                          Activo ✓
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 hover:text-slate-900 shrink-0">
                          Entrar como →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section 3: Repartidor en Campo */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
                  <span>Rol 3: Repartidor (Ejecución en Campo)</span>
                </span>
                {driverUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isBlocked = u.status === 'blocked';
                  return (
                    <button
                      key={u.id}
                      disabled={isBlocked}
                      onClick={() => handleSelect(u.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                        isBlocked
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                          : isCurrent
                          ? 'bg-blue-50/80 border-blue-300 shadow-2xs cursor-pointer'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Usuario: <strong className="font-mono text-slate-800">{u.username}</strong> · Rutas, geocerca 100m y recolección
                          </p>
                        </div>
                      </div>
                      {isBlocked ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                          Bloqueado
                        </span>
                      ) : isCurrent ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                          Activo ✓
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 hover:text-slate-900 shrink-0">
                          Entrar como →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section 4: Marcas Locales Aliadas */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
                  <span>Portal de Marcas Suscritas (Multi-tenant Aislado)</span>
                </span>
                {brandUsers.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
                    <span className="text-xs font-bold text-slate-700 block">0 Marcas Registradas</span>
                    <p className="text-[11px] text-slate-500">
                      Las marcas dadas de alta por la Administradora aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {brandUsers.map((u) => {
                      const brand = brands.find((b) => b.id === u.brandId);
                      const isCurrent = currentUser?.id === u.id;
                      const isBlocked = u.status === 'blocked';
                      return (
                        <button
                          key={u.id}
                          disabled={isBlocked}
                          onClick={() => handleSelect(u.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition text-left ${
                            isBlocked
                              ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                              : isCurrent
                              ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs cursor-pointer'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-extrabold text-slate-900 truncate">
                              {brand?.name || u.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Usuario: {u.username}
                            </p>
                          </div>
                          {isBlocked ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                              Bloq.
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                              ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                              Entrar como
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Cerrar Sesión & Iniciar Sesión con otra cuenta */}
        <div className="bg-[#FAFBFD] px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogoutAndLogin}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
            {onOpenLoginModal && (
              <button
                onClick={handleOpenLoginScreen}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ingresar con Usuario & Contraseña</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
