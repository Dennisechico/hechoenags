import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Truck,
  Building2,
  ChevronDown,
  LogOut,
  RotateCcw,
  Check,
  Bell,
  Search,
  CheckCheck,
  Users,
  ArrowLeftRight,
  KeyRound,
  UserCheck,
  Zap,
} from 'lucide-react';
import { GlobalSearchModal } from './Common/GlobalSearchModal';
import { UserSwitcherModal } from './Common/UserSwitcherModal';
import { EditProfileModal } from './Common/EditProfileModal';

interface HeaderProps {
  onOpenCreateBrandModal?: () => void;
  onOpenCreateRouteModal?: () => void;
  onOpenCreateStoreModal?: () => void;
  onOpenLoginModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLoginModal,
}) => {
  const {
    currentUser,
    impersonatorUser,
    users,
    brands,
    switchUser,
    logout,
    resetAllData,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveAdminTab,
    setIsSmartRouteGeneratorModalOpen,
  } = useApp();
  const canSwitchRoles = currentUser?.role === 'admin' || impersonatorUser?.role === 'admin';

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUserSwitcherModal, setShowUserSwitcherModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Group users by role for quick selector
  const adminUsers = users.filter((u) => u.role === 'admin');
  const warehouseUsers = users.filter((u) => u.role === 'warehouse');
  const driverUsers = users.filter((u) => u.role === 'driver');
  const brandUsers = users.filter((u) => u.role === 'brand');

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRoleLabel = () => {
    if (!currentUser) return 'Invitado / No autenticado';
    if (currentUser.role === 'admin') return 'Super Administradora';
    if (currentUser.role === 'warehouse') return 'Encargada de Almacén';
    if (currentUser.role === 'driver') return 'Conductor / Repartidor';
    const brand = brands.find((b) => b.id === currentUser.brandId);
    return brand ? `Marca: ${brand.name}` : 'Marca Local';
  };

  const getRoleBadgeStyle = () => {
    if (!currentUser) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (currentUser.role === 'admin') return 'bg-amber-50 text-amber-800 border-amber-200/80 font-bold';
    if (currentUser.role === 'warehouse') return 'bg-purple-50 text-purple-800 border-purple-200/80 font-bold';
    if (currentUser.role === 'driver') return 'bg-blue-50 text-blue-800 border-blue-200/80 font-bold';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold';
  };

  const handleNotificationClick = (notifId: string, linkTab?: string) => {
    markNotificationAsRead(notifId);
    if (linkTab) {
      setActiveAdminTab(linkTab);
    }
    setShowNotifDropdown(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 border border-white shrink-0">
              AGS
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 truncate">
                  Hecho en <span className="text-orange-600">Aguascalientes</span>
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-900 bg-[#D4F63D] px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                  <ShieldCheck className="w-3 h-3" /> Red Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden lg:block truncate">
                Logística Colaborativa & Anaqueles Compartidos
              </p>
            </div>
          </div>

          {/* Center: Global Search & Live System Status */}
          {currentUser && (
            <div className="flex items-center gap-2 flex-1 justify-center max-w-sm lg:max-w-md mx-1 sm:mx-2 min-w-0">
              {/* Search trigger on larger screens */}
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="hidden sm:flex w-full items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer group min-w-0"
                title="Buscador global (Ctrl + K)"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 transition shrink-0" />
                  <span className="truncate text-xs">Buscar marcas, rutas, tiendas...</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded-lg shadow-2xs ml-1 shrink-0">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </button>

              {/* Compact search button on mobile */}
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="sm:hidden p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
                title="Buscador global"
              >
                <Search className="w-4 h-4 text-slate-600" />
              </button>

              {/* Quick Smart Route Generator shortcut button in header */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'warehouse') && (
                <button
                  type="button"
                  onClick={() => setIsSmartRouteGeneratorModalOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white text-xs font-black shadow-xs transition cursor-pointer shrink-0 ring-1 ring-amber-400/30"
                  title="Generador de rutas cortas optimizadas por zona y rendimiento con Google Maps"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-200 fill-current" />
                  <span>Ruta Corta (GPS)</span>
                </button>
              )}

              {/* Live Status indicator */}
              <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-bold shadow-2xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>GPS & Servidor Online</span>
              </div>
            </div>
          )}

          {/* Right: Notifications Bell, User Switcher & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Notification Bell Icon */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer relative"
                  title="Notificaciones en tiempo real"
                >
                  <Bell className="w-4 h-4 text-slate-600" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-xs animate-bounce">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Popover */}
                {showNotifDropdown && (
                  <div
                    className="absolute right-0 top-12 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl py-3 z-50 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">Notificaciones en Vivo</span>
                        {unreadNotificationsCount > 0 && (
                          <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            {unreadNotificationsCount} nuevas
                          </span>
                        )}
                      </div>

                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Marcar leídas</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No hay notificaciones recientes
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif.id, notif.linkTab)}
                            className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5 ${
                              !notif.read ? 'bg-orange-50/40' : ''
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {notif.severity === 'success' ? (
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                  ✓
                                </div>
                              ) : notif.severity === 'warning' ? (
                                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                  ⚠️
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                  ℹ
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className={`text-xs ${!notif.read ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {notif.title}
                                </h5>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.linkTab && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-orange-600 hover:underline">
                                  Ver detalles en panel →
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 px-4 border-t border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Monitoreo activo de remisiones, anaqueles y GPS
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prominent "Entrar como" Button (Solo Super Admin) */}
            {currentUser && canSwitchRoles && (
              <button
                type="button"
                onClick={() => setShowUserSwitcherModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-extrabold transition cursor-pointer shadow-2xs"
                title="Entrar como otro usuario (auditado en bitácora)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="hidden md:inline">Entrar como</span>
                <span className="md:hidden text-[11px]">Roles</span>
              </button>
            )}

            {/* User Profile Card & Dropdown */}
            <div className="relative flex items-center gap-2">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition cursor-pointer text-left shadow-2xs max-w-[200px] sm:max-w-xs"
                  >
                    <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {currentUser.role === 'admin' ? (
                        '👑'
                      ) : currentUser.role === 'warehouse' ? (
                        '📦'
                      ) : currentUser.role === 'driver' ? (
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>

                    <div className="hidden sm:block text-left min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span className="truncate max-w-[90px] md:max-w-[120px]">{currentUser.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full border shrink-0 ${getRoleBadgeStyle()}`}
                        >
                          {currentUser.role === 'admin'
                            ? 'Admin'
                            : currentUser.role === 'warehouse'
                            ? 'Almacén'
                            : currentUser.role === 'driver'
                            ? 'Repartidor'
                            : 'Marca'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        {getRoleLabel()}
                      </div>
                    </div>

                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* Direct quick logout button */}
                  <button
                    type="button"
                    onClick={logout}
                    title="Cerrar sesión"
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden lg:inline text-xs">Salir</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenLoginModal}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Iniciar Sesión
                </button>
              )}

              {/* Quick inline Dropdown Menu for fast switching */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 top-12 w-[calc(100vw-24px)] sm:w-80 max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl py-2 z-50 animate-in fade-in divide-y divide-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-3.5 bg-slate-50/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Sesión Iniciada Como
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{currentUser?.name}</p>
                    <p className="text-xs text-orange-600 font-semibold">{getRoleLabel()}</p>
                  </div>

                  {canSwitchRoles && (
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Entrar como (Auditado)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowUserSwitcherModal(true);
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        <span>Ver todos</span>
                      </button>
                    </div>

                    {adminUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          currentUser?.id === u.id
                            ? 'bg-amber-50 text-amber-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">👑</span>
                          <span className="truncate">{u.name} (Super Admin)</span>
                        </div>
                        {currentUser?.id === u.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </button>
                    ))}

                    {warehouseUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          currentUser?.id === u.id
                            ? 'bg-purple-50 text-purple-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">📦</span>
                          <span className="truncate">{u.name} (Almacén)</span>
                        </div>
                        {currentUser?.id === u.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </button>
                    ))}

                    {driverUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          currentUser?.id === u.id
                            ? 'bg-blue-50 text-blue-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span className="truncate">{u.name} (Repartidor)</span>
                        </div>
                        {currentUser?.id === u.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}

                    {brandUsers.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 px-3 py-1 block font-bold uppercase tracking-wider">
                          Marcas Locales:
                        </span>
                        {brandUsers.map((u) => {
                          const brand = brands.find((b) => b.id === u.brandId);
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                switchUser(u.id);
                                setShowUserDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                                currentUser?.id === u.id
                                  ? 'bg-emerald-50 text-emerald-900 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="truncate">{brand?.name || u.name}</span>
                              </div>
                              {currentUser?.id === u.id && (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}

                  <div className="p-2 space-y-1 bg-slate-50/50">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-orange-950 bg-orange-100/60 hover:bg-orange-100 transition cursor-pointer font-extrabold"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                      <span>Editar Mi Perfil (Datos Reales)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowUserSwitcherModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-amber-800 hover:bg-amber-100/70 transition cursor-pointer font-bold"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Panel Completo de Usuarios & Roles</span>
                    </button>
                    {onOpenLoginModal && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenLoginModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-700 hover:bg-white transition cursor-pointer font-semibold"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ingresar con otra contraseña</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        resetAllData();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-900 hover:bg-white transition cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Restablecer datos limpios (0 marcas)</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Command Palette */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigateTab={(tab) => setActiveAdminTab(tab)}
      />

      {/* Dedicated Full User Switcher & Session Modal */}
      <UserSwitcherModal
        isOpen={showUserSwitcherModal}
        onClose={() => setShowUserSwitcherModal(false)}
        onOpenLoginModal={onOpenLoginModal}
      />

      {/* Edit Profile Modal for Real Testing */}
      {showEditProfileModal && (
        <EditProfileModal onClose={() => setShowEditProfileModal(false)} />
      )}
    </>
  );
};
