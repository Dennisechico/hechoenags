import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { DriverView } from './components/Driver/DriverView';
import { BrandDashboard } from './components/Brand/BrandDashboard';
import { WarehouseView } from './components/Warehouse/WarehouseView';
import { AuthModal } from './components/AuthModal';
import { CreateBrandUserModal } from './components/Admin/CreateBrandUserModal';
import { CreateRouteModal } from './components/Admin/CreateRouteModal';
import { CreateStoreModal } from './components/Admin/CreateStoreModal';
import { SmartRouteGeneratorModal } from './components/Admin/SmartRouteGeneratorModal';
import { CheckCircle2, X, AlertTriangle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';

const MainContent: React.FC = () => {
  const {
    currentUser,
    impersonatorUser,
    exitImpersonation,
    isCreateBrandModalOpen,
    setIsCreateBrandModalOpen,
    isCreateStoreModalOpen,
    setIsCreateStoreModalOpen,
    isCreateRouteModalOpen,
    setIsCreateRouteModalOpen,
    isSmartRouteGeneratorModalOpen,
    setIsSmartRouteGeneratorModalOpen,
    toastMessage,
    dismissToast,
  } = useApp();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaError = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaError);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaError);
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col">
      {/* Google Maps Platform Quota Defense Banner (Tier 1) */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-center gap-3 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Se alcanzó la cuota temporal de Google Maps Platform en esta vista. Los mapas y coordenadas operan en modo respaldo local.
            </span>
          </div>
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-extrabold text-amber-800 hover:text-amber-950"
          >
            Ver guía de cuota / billing
          </a>
        </div>
      )}

      {/* Impersonation Top Security Banner */}
      {impersonatorUser && currentUser && (
        <div className="bg-slate-900 text-white border-b border-amber-400/50 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 z-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Modo Soporte Auditado: <strong>{impersonatorUser.name}</strong> está viendo la plataforma como{' '}
              <strong className="text-amber-300">{currentUser.name} ({currentUser.role})</strong>. Toda acción queda registrada en bitácora.
            </span>
          </div>
          <button
            type="button"
            onClick={exitImpersonation}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Salir a Super Admin</span>
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <Header
        onOpenCreateBrandModal={() => setIsCreateBrandModalOpen(true)}
        onOpenCreateRouteModal={() => setIsCreateRouteModalOpen(true)}
        onOpenCreateStoreModal={() => setIsCreateStoreModalOpen(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-3 sm:right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[calc(100vw-24px)] sm:max-w-md">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span className="truncate">{toastMessage.text}</span>
            </div>
            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden min-w-0">
        {!currentUser ? (
          <LoginScreen />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard />
        ) : currentUser.role === 'warehouse' ? (
          <WarehouseView />
        ) : currentUser.role === 'driver' ? (
          <DriverView />
        ) : (
          <BrandDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-6 bg-white text-slate-500 text-xs shadow-2xs overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">Hecho en Aguascalientes</span>
            <span>·</span>
            <span>Red Logística y de Distribución Colaborativa B2B</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Aislamiento Multi-tenant Estricto · Kardex por Movimientos Inmutables · Bitácora Auditada
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      {isCreateBrandModalOpen && (
        <CreateBrandUserModal
          onClose={() => setIsCreateBrandModalOpen(false)}
          onSuccess={() => setIsCreateBrandModalOpen(false)}
        />
      )}

      {isCreateStoreModalOpen && (
        <CreateStoreModal
          onClose={() => setIsCreateStoreModalOpen(false)}
          onSuccess={() => setIsCreateStoreModalOpen(false)}
        />
      )}

      {isCreateRouteModalOpen && (
        <CreateRouteModal
          onClose={() => setIsCreateRouteModalOpen(false)}
          onSuccess={() => setIsCreateRouteModalOpen(false)}
        />
      )}

      {isSmartRouteGeneratorModalOpen && (
        <SmartRouteGeneratorModal
          onClose={() => setIsSmartRouteGeneratorModalOpen(false)}
        />
      )}

      {showLoginModal && (
        <AuthModal
          isOpen={true}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
