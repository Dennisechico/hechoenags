import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  Building2,
  Truck,
  Store,
  Package,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    brands,
    routes,
    stores,
    products,
    tickets,
    setActiveAdminTab,
    setIsCreateRouteModalOpen,
    setIsCreateStoreModalOpen,
    setIsCreateBrandModalOpen,
    currentUser,
  } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchingBrands = q
    ? brands.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.originLocation.toLowerCase().includes(q)
      )
    : brands.slice(0, 3);

  const matchingRoutes = q
    ? routes.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.zone.toLowerCase().includes(q)
      )
    : routes.slice(0, 2);

  const matchingStores = q
    ? stores.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.zone.toLowerCase().includes(q)
      )
    : stores.slice(0, 3);

  const matchingProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : products.slice(0, 3);

  const matchingTickets = q
    ? tickets.filter(
        (t) =>
          t.folio.toLowerCase().includes(q) ||
          t.storeName.toLowerCase().includes(q) ||
          t.recipientName.toLowerCase().includes(q)
      )
    : tickets.slice(0, 2);

  const totalResults =
    matchingBrands.length +
    matchingRoutes.length +
    matchingStores.length +
    matchingProducts.length +
    matchingTickets.length;

  const handleSelect = (tab: string) => {
    setActiveAdminTab(tab);
    if (onNavigateTab) onNavigateTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto animate-in fade-in">
      <div
        className="bg-white rounded-[28px] border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden mb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar marca, ruta, tienda aliada, producto o remisión..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              ESC para salir
            </span>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Quick Actions (Planificar Ruta, Añadir Punto de Entrega, Nueva Marca) */}
          {currentUser?.role === 'admin' && (!q || 'planificar ruta nueva entrega punto tienda anaquel marca'.includes(q) || q.includes('ruta') || q.includes('tienda') || q.includes('plan') || q.includes('punto')) && (
            <div className="space-y-2 pb-3 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> Acciones Rápidas del Administrador
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateRouteModalOpen(true);
                    onClose();
                  }}
                  className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-2.5 text-left cursor-pointer group shadow-xs"
                >
                  <div className="p-2 rounded-xl bg-white/10 text-amber-400 group-hover:scale-105 transition">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block">Planificar Ruta</span>
                    <span className="text-[10px] text-slate-300">Asignar paradas</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreateStoreModalOpen(true);
                    onClose();
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white transition flex items-center gap-2.5 text-left cursor-pointer group shadow-sm shadow-orange-500/20"
                >
                  <div className="p-2 rounded-xl bg-white/20 text-white group-hover:scale-105 transition">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block">Punto de Entrega</span>
                    <span className="text-[10px] text-amber-100">Nueva tienda aliada</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreateBrandModalOpen(true);
                    onClose();
                  }}
                  className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 transition flex items-center gap-2.5 text-left cursor-pointer group shadow-2xs"
                >
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-600 group-hover:scale-105 transition">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block">Nueva Marca</span>
                    <span className="text-[10px] text-slate-500">Alta & credenciales</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {totalResults === 0 && (!q || !('planificar ruta nueva entrega punto tienda anaquel marca'.includes(q))) ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto text-lg">
                🔍
              </div>
              <p className="text-sm font-bold text-slate-800">No se encontraron resultados para "{query}"</p>
              <p className="text-xs text-slate-500">Prueba con palabras como "Centro", "Guayaba", "Cerveza" o "Colosio".</p>
            </div>
          ) : (
            <>
              {/* Marcas */}
              {matchingBrands.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-orange-500" /> Marcas Registradas ({matchingBrands.length})
                    </span>
                    <button
                      onClick={() => handleSelect('brands')}
                      className="text-orange-600 hover:underline cursor-pointer"
                    >
                      Ver todas en panel →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {matchingBrands.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelect('brands')}
                        className="p-3 rounded-2xl bg-[#F8FAFC] hover:bg-orange-50/60 border border-slate-100 hover:border-orange-200/80 transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0"
                            style={{ backgroundColor: b.accentColor || '#ea580c' }}
                          >
                            {b.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-orange-700 transition">
                              {b.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {b.category} · <span className="text-slate-700 font-medium">{b.originLocation}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rutas de Entrega */}
              {matchingRoutes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" /> Rutas de Entrega ({matchingRoutes.length})
                    </span>
                    <button
                      onClick={() => handleSelect('routes')}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Ir a Rutas →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {matchingRoutes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSelect('routes')}
                        className="p-3 rounded-2xl bg-[#F8FAFC] hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200/80 transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition flex items-center gap-2">
                              <span>{r.name}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {r.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Zona: {r.zone} · {r.scheduledStores.length} paradas
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Puntos de Venta (Tiendas) */}
              {matchingStores.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600" /> Puntos de Venta Aliados ({matchingStores.length})
                    </span>
                    <button
                      onClick={() => handleSelect('stores')}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      Ver Tiendas →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {matchingStores.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelect('stores')}
                        className="p-3 rounded-2xl bg-[#F8FAFC] hover:bg-emerald-50/60 border border-slate-100 hover:border-emerald-200/80 transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {s.category} · {s.zone} · Encargado: {s.managerName}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remisiones */}
              {matchingTickets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-600" /> Remisiones Firmadas ({matchingTickets.length})
                    </span>
                    <button
                      onClick={() => handleSelect('tickets')}
                      className="text-purple-600 hover:underline cursor-pointer"
                    >
                      Ver Remisiones →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {matchingTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelect('tickets')}
                        className="p-3 rounded-2xl bg-[#F8FAFC] hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200/80 transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            REM
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition flex items-center gap-2">
                              <span>{t.folio}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                  t.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {t.status === 'delivered' ? 'Firmado' : 'Con Discrepancia'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {t.storeName} · Recibió: {t.recipientName} ({t.totalPieces} pzas)
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500">
          <div className="flex items-center gap-2 sm:gap-3">
            <span>Presiona <strong className="font-mono text-slate-700">Enter</strong> para navegar</span>
            <span>·</span>
            <span><strong className="font-mono text-slate-700">Tab</strong> para alternar</span>
          </div>
          <span className="text-orange-600 font-bold hidden sm:inline">Búsqueda Inteligente Hecho en Ags</span>
        </div>
      </div>
    </div>
  );
};
