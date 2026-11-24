import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, DeliveryTicket } from '../../types';
import { TicketReceiptModal } from '../Common/TicketReceiptModal';
import { EditProductModal } from '../Common/EditProductModal';
import { DeleteProductConfirmModal } from '../Common/DeleteProductConfirmModal';
import { BulkCsvImportModal } from '../Admin/BulkCsvImportModal';
import {
  Package,
  Store as StoreIcon,
  TrendingUp,
  CreditCard,
  Plus,
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle2,
  Lock,
  Truck,
  ChevronRight,
  Info,
  Trash2,
  Edit3,
  BarChart3,
  PackageX,
  Upload,
} from 'lucide-react';

export const BrandDashboard: React.FC = () => {
  const {
    currentUser,
    brands,
    products,
    stores,
    routes,
    storeStock,
    tickets,
    visitSnapshots,
    movements,
    addMultipleProducts,
  } = useApp();

  // STRICT MULTI-TENANT RESOLUTION (sin fallback silencioso a otras marcas)
  const activeBrand = brands.find((b) => b.id === currentUser?.brandId);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<DeliveryTicket | null>(null);
  const [restockSuccess, setRestockSuccess] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // New product forms (multi-product list support with flavor & barcode)
  const [productsDraftList, setProductsDraftList] = useState<
    {
      id: string;
      name: string;
      flavor: string;
      sku: string;
      barcode: string;
      unit: string;
      costPrice: number;
      retailPrice: number;
      initialStock: number;
    }[]
  >([
    {
      id: 'p-1',
      name: '',
      flavor: '',
      sku: '',
      barcode: '',
      unit: 'pza',
      costPrice: 60,
      retailPrice: 100,
      initialStock: 40,
    },
  ]);

  const brandProducts = useMemo(
    () => (activeBrand ? products.filter((p) => p.brandId === activeBrand.id) : []),
    [products, activeBrand]
  );
  const brandStockItems = useMemo(
    () => (activeBrand ? storeStock.filter((s) => s.brandId === activeBrand.id) : []),
    [storeStock, activeBrand]
  );
  const brandTickets = useMemo(
    () => (activeBrand ? tickets.filter((t) => t.brandIds.includes(activeBrand.id)) : []),
    [tickets, activeBrand]
  );
  const brandSnapshots = useMemo(
    () => (activeBrand ? visitSnapshots.filter((vs) => vs.brandId === activeBrand.id) : []),
    [visitSnapshots, activeBrand]
  );
  const brandMovements = useMemo(
    () => (activeBrand ? movements.filter((m) => m.brandId === activeBrand.id) : []),
    [movements, activeBrand]
  );

  // MÓDULO 5: ANALÍTICA REAL DE VENTA EN ANAQUEL
  const sellThroughAnalytics = useMemo(() => {
    const totalSoldPieces = brandSnapshots.reduce((acc, s) => acc + s.soldInPeriod, 0);
    const totalExpiredOrDamaged =
      brandSnapshots.reduce((acc, s) => acc + s.collectedQty, 0) +
      brandMovements
        .filter((m) => m.type === 'merma')
        .reduce((acc, m) => acc + m.quantity, 0);
    const stockoutEvents = brandSnapshots.filter((s) => s.stockoutDetected);

    const byProduct: Record<string, { name: string; sold: number; collected: number }> = {};
    const byStore: Record<string, { name: string; sold: number; stockouts: number; expired: number }> = {};
    const byRoute: Record<string, { code: string; name: string; sold: number }> = {};
    const byMonth: Record<string, { month: string; sold: number; delivered: number }> = {};

    brandSnapshots.forEach((s) => {
      if (!byProduct[s.productId]) {
        byProduct[s.productId] = { name: s.productName, sold: 0, collected: 0 };
      }
      byProduct[s.productId].sold += s.soldInPeriod;
      byProduct[s.productId].collected += s.collectedQty;

      if (!byStore[s.storeId]) {
        byStore[s.storeId] = { name: s.storeName, sold: 0, stockouts: 0, expired: 0 };
      }
      byStore[s.storeId].sold += s.soldInPeriod;
      if (s.stockoutDetected) byStore[s.storeId].stockouts += 1;
      byStore[s.storeId].expired += s.collectedQty;

      const rt = routes.find((r) => r.id === s.routeId);
      const rKey = rt?.id || s.routeId || 'sin-ruta';
      if (!byRoute[rKey]) {
        byRoute[rKey] = {
          code: rt?.code || 'RUTA',
          name: rt?.name || 'Ruta Asignada',
          sold: 0,
        };
      }
      byRoute[rKey].sold += s.soldInPeriod;

      const monthKey = s.timestamp.slice(0, 7) || '2026-10';
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { month: monthKey, sold: 0, delivered: 0 };
      }
      byMonth[monthKey].sold += s.soldInPeriod;
      byMonth[monthKey].delivered += s.deliveredQty;
    });

    const topProducts = Object.values(byProduct).sort((a, b) => b.sold - a.sold);
    const topStores = Object.values(byStore).sort((a, b) => b.sold - a.sold);
    const topRoutes = Object.values(byRoute).sort((a, b) => b.sold - a.sold);
    const seasonality = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalSoldPieces,
      totalExpiredOrDamaged,
      stockoutCount: stockoutEvents.length,
      stockoutStores: Object.values(byStore).filter((st) => st.stockouts > 0 || st.expired > 0),
      topProducts,
      topStores,
      topRoutes,
      seasonality,
    };
  }, [brandSnapshots, brandMovements, routes]);

  const handleAddProductDraftRow = () => {
    setProductsDraftList((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${prev.length + 1}`,
        name: '',
        flavor: '',
        sku: '',
        barcode: '',
        unit: 'pza',
        costPrice: 55,
        retailPrice: 95,
        initialStock: 30,
      },
    ]);
  };

  const handleRemoveProductDraftRow = (id: string) => {
    if (productsDraftList.length <= 1) return;
    setProductsDraftList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleProductDraftChange = (
    id: string,
    field: 'name' | 'flavor' | 'sku' | 'barcode' | 'unit' | 'costPrice' | 'retailPrice' | 'initialStock',
    value: string | number
  ) => {
    setProductsDraftList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Restock form
  const [selectedProductId, setSelectedProductId] = useState(brandProducts[0]?.id || '');
  const [restockQty, setRestockQty] = useState(25);
  const [restockNotes, setRestockNotes] = useState('Lote recién elaborado en taller local, listo para recolección.');

  // Strict multi-tenant guard
  if (!activeBrand) {
    return (
      <div className="bg-white border border-rose-200 rounded-[28px] p-8 text-center space-y-3 shadow-sm max-w-xl mx-auto mt-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Acceso Multi-Tenant Restringido
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Tu usuario (<span className="font-mono font-bold">{currentUser?.username}</span>) no tiene una marca vinculada actualmente. Por seguridad y separación de datos, no se muestran inventarios ni remisiones de otras marcas.
        </p>
      </div>
    );
  }

  // Aggregated metrics
  const totalPiecesInStores = brandStockItems.reduce((acc, item) => acc + item.currentStock, 0);
  const totalStoresPlaced = new Set(brandStockItems.map((item) => item.storeId)).size;
  const totalWarehouseStock = brandProducts.reduce((acc, p) => acc + p.centralWarehouseStock, 0);
  const totalConsignmentValue = brandStockItems.reduce((acc, item) => {
    const prod = brandProducts.find((p) => p.id === item.productId);
    return acc + item.currentStock * (prod?.costPrice || 0);
  }, 0);

  const handleCreateProducts = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = productsDraftList.filter((p) => p.name.trim().length > 0);
    if (valid.length === 0) return;

    const brandPrefix = activeBrand.name.slice(0, 3).toUpperCase();
    const itemsToSave = valid.map((item, idx) => ({
      brandId: activeBrand.id,
      name: item.name.trim(),
      flavor: item.flavor.trim() || 'Original',
      sku: item.sku.trim() || `${brandPrefix}-${Date.now().toString().slice(-4)}-0${idx + 1}`,
      barcode:
        item.barcode.trim() ||
        `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13),
      description: `Producto artesanal de ${activeBrand.name} hecho en Aguascalientes`,
      category: activeBrand.category,
      unit: item.unit || 'pza',
      costPrice: Number(item.costPrice) || 50,
      suggestedRetailPrice: Number(item.retailPrice) || 85,
      centralWarehouseStock: Number(item.initialStock) || 30,
      minStockAlert: 15,
    }));

    addMultipleProducts(itemsToSave);
    setShowAddProductModal(false);
    setProductsDraftList([
      {
        id: `p-${Date.now()}`,
        name: '',
        flavor: '',
        sku: '',
        barcode: '',
        unit: 'pza',
        costPrice: 60,
        retailPrice: 100,
        initialStock: 40,
      },
    ]);
  };

  const handleRequestRestock = (e: React.FormEvent) => {
    e.preventDefault();
    setRestockSuccess(true);
    setTimeout(() => {
      setRestockSuccess(false);
      setShowRestockModal(false);
    }, 2500);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Brand Profile Banner (Clean White + Luminous Accents) */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-sm relative overflow-hidden w-full max-w-full min-w-0">
        {/* Subtle warm decorative glow */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Multi-tenant badge */}
        <div className="sm:absolute sm:top-5 sm:right-5 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Acceso Multi-Tenant: <strong className="text-slate-900">{currentUser?.username}</strong></span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 relative z-10 min-w-0">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shadow-orange-500/20 shrink-0"
            style={{ backgroundColor: activeBrand.accentColor || '#f97316' }}
          >
            {activeBrand.name.charAt(0)}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-orange-600">
                {activeBrand.category}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-semibold truncate">{activeBrand.originLocation}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{activeBrand.name}</h1>
            <p className="text-xs text-slate-500 italic break-words">"{activeBrand.tagline}"</p>
          </div>
        </div>

        {/* Subscription Status Bar */}
        <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-600" />
            <span className="text-slate-600 font-medium">
              Suscripción Logística: <strong className="text-slate-900">{activeBrand.subscription.planName}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-extrabold text-[11px]">
              Activa (${activeBrand.subscription.monthlyFee} MXN/mes)
            </span>
          </div>
          <div className="text-slate-500 text-[11px] font-medium">
            Próximo corte: <span className="text-slate-900 font-bold">{activeBrand.subscription.nextBillingDate}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid (Luminous gradient cards + clean white cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Piezas en Anaqueles</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <StoreIcon className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{totalPiecesInStores}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Colocadas en tiendas de Aguascalientes</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Puntos de Venta Activos</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <StoreIcon className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{totalStoresPlaced} tiendas</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Boutiques y concept stores</p>
          </div>
        </div>

        {/* Card 3: Radiant Green Mesh Card */}
        <div className="p-5 rounded-[24px] text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between gradient-mesh-green relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold opacity-90 mb-2">
            <span>Valor Consignado en Tiendas</span>
            <TrendingUp className="w-4 h-4 bg-white/20 p-0.5 rounded-md" />
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">
              ${totalConsignmentValue.toLocaleString('es-MX')} <span className="text-xs font-bold opacity-80">MXN</span>
            </div>
            <p className="text-[11px] text-emerald-50 mt-1 font-medium">Valuación a precio de consignación</p>
          </div>
        </div>

        {/* Card 4: Radiant Orange Mesh Card */}
        <div className="p-5 rounded-[24px] text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between gradient-mesh-orange relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold opacity-90 mb-2">
            <span>Stock Bodega Central</span>
            <Package className="w-4 h-4 bg-white/20 p-0.5 rounded-md" />
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">{totalWarehouseStock} pzas</div>
            <p className="text-[11px] text-white/85 mt-1 font-medium">Disponibles para próximas rutas</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
        <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span>
            Las rutas de distribución compartida salen los martes y viernes cubriendo Centro, Norte y Sur de Ags.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRestockModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-orange-600" /> Programar Recolección en Taller
          </button>
          <button
            onClick={() => setShowCsvImportModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Carga Masiva CSV
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir Nuevo Producto
          </button>
        </div>
      </div>

      {/* MÓDULO 5: ANALÍTICA REAL DE VENTA EN ANAQUEL */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full inline-block">
              Analítica Real en Anaquel (Conteo Físico de Visita)
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
              <span>Venta Real al Público, Estacionalidad, Desabasto y Caducidad</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Fórmula: Venta en el periodo = Stock visita anterior + Entregado − Conteo en esta visita
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Venta Real Total</span>
              <span className="text-base font-black text-emerald-950 font-mono">
                {sellThroughAnalytics.totalSoldPieces} pzas vendidas
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Visitas con Desabasto</span>
              <span className="text-base font-black text-amber-950 font-mono">
                {sellThroughAnalytics.stockoutCount} alertas (0 pzas)
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-700 uppercase block">Caducado / Merma</span>
              <span className="text-base font-black text-rose-900 font-mono">
                {sellThroughAnalytics.totalExpiredOrDamaged} pzas
              </span>
            </div>
          </div>
        </div>

        {brandSnapshots.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#FAFBFD] border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Aún no se registran conteos físicos de anaquel en visitas para esta marca. Cada visita del repartidor generará métricas reales de desplazamiento automáticamente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Top Productos Vendidos */}
            <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                Qué se Vende Más (Top SKU)
              </h4>
              <div className="space-y-2">
                {sellThroughAnalytics.topProducts.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-orange-600 mr-1">#{idx + 1}</span>
                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-black text-emerald-700 shrink-0">
                      {item.sold} pzas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Top Tiendas y Rutas */}
            <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                Tiendas & Rutas Líderes
              </h4>
              <div className="space-y-1.5">
                {sellThroughAnalytics.topStores.slice(0, 3).map((st) => (
                  <div key={st.name} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-800 truncate pr-2">{st.name}</span>
                    <span className="font-mono font-black text-slate-900 shrink-0">{st.sold} pzas</span>
                  </div>
                ))}
                {sellThroughAnalytics.topRoutes.slice(0, 2).map((rt) => (
                  <div key={rt.code} className="flex items-center justify-between bg-blue-50/70 px-2.5 py-1.5 rounded-xl border border-blue-100">
                    <span className="font-mono font-bold text-blue-800 text-[11px] truncate pr-2">
                      {rt.code}
                    </span>
                    <span className="font-mono font-black text-blue-900 shrink-0">{rt.sold} pzas</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Estacionalidad Mensual */}
            <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-600" /> Estacionalidad por Mes
              </h4>
              <div className="space-y-2">
                {sellThroughAnalytics.seasonality.map((m) => (
                  <div key={m.month} className="bg-white p-2 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-700">{m.month}</span>
                      <span className="font-black text-emerald-700">{m.sold} vendidas</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((m.sold / Math.max(1, sellThroughAnalytics.totalSoldPieces)) * 100)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Desabasto y Caducidad por Tienda */}
            <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <PackageX className="w-3 h-3 text-rose-600" /> Desabasto & Caducidad
              </h4>
              {sellThroughAnalytics.stockoutStores.length === 0 ? (
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-emerald-800 font-semibold text-[11px]">
                  ✓ Cero quiebres de stock (anaqueles en 0) o mermas reportadas.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sellThroughAnalytics.stockoutStores.slice(0, 4).map((st) => (
                    <div key={st.name} className="bg-white p-2 rounded-xl border border-rose-100 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{st.name}</span>
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                        {st.stockouts > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                            {st.stockouts} sin stock
                          </span>
                        )}
                        {st.expired > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                            {st.expired} cad.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Stores with your stock & Products catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stores Consignment Details */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <StoreIcon className="w-4 h-4 text-orange-600" />
              Inventario en Anaqueles Físicos
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Actualizado en tiempo real</span>
          </div>

          <div className="space-y-3">
            {stores
              .filter((st) => brandStockItems.some((item) => item.storeId === st.id))
              .map((store) => {
                const storeItems = brandStockItems.filter((item) => item.storeId === store.id);
                const totalStorePieces = storeItems.reduce((acc, it) => acc + it.currentStock, 0);

                return (
                  <div
                    key={store.id}
                    className="bg-white border border-slate-200/90 rounded-[24px] p-5 space-y-3.5 hover:shadow-md transition shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-slate-900">{store.name}</h4>
                          <span className="text-[10px] text-slate-700 bg-slate-100 font-bold px-2 py-0.5 rounded-md">
                            {store.zone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{store.address}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Existencia en anaquel:</span>
                        <span className="text-base font-black text-orange-600">{totalStorePieces} piezas</span>
                      </div>
                    </div>

                    {/* Breakdown of this brand's products in this store */}
                    <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-3 divide-y divide-slate-100 text-xs">
                      {storeItems.map((item) => {
                        const prod = brandProducts.find((p) => p.id === item.productId);
                        const isLowStock = item.currentStock <= 5;

                        return (
                          <div
                            key={item.productId}
                            className="py-2 flex items-center justify-between first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{prod?.name}</span>
                              {isLowStock && (
                                <span className="text-[10px] text-rose-700 font-extrabold flex items-center gap-0.5 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Stock Bajo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 font-mono text-[11px]">
                                Último resurtido: {item.lastRestockedDate}
                              </span>
                              <span className="font-extrabold text-slate-900 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                                {item.currentStock} pzas
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {brandStockItems.length === 0 && (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                Aún no tienes productos consignados en tiendas. Programa un primer lote para la siguiente ruta de entrega.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Digital Remissions & Product Catalog */}
        <div className="lg:col-span-5 space-y-5">
          {/* Recent Delivery Tickets */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Comprobantes & Remisiones Recibidas
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Con firma digital</span>
            </div>

            <div className="space-y-2.5">
              {brandTickets.map((ticket) => {
                const brandItems = ticket.items.filter((it) => it.brandId === activeBrand.id);
                const brandPieces = brandItems.reduce((acc, it) => acc + it.quantity, 0);
                const brandSubtotal = brandItems.reduce((acc, it) => acc + it.subtotal, 0);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setViewingTicket(ticket)}
                    className="p-3.5 bg-[#FAFBFD] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-2xl transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-orange-600">{ticket.folio}</span>
                        <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Firmado
                        </span>
                      </div>
                      <p className="text-xs text-slate-900 font-bold mt-1">{ticket.storeName}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {brandPieces} pzas · ${brandSubtotal.toFixed(2)} MXN
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(ticket.timestamp).toLocaleDateString('es-MX')}
                      </span>
                      <span className="text-xs text-slate-900 hover:underline flex items-center gap-0.5 justify-end mt-1 font-bold">
                        Ver firma <ChevronRight className="w-3.5 h-3.5 text-orange-600" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {brandTickets.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">
                  No hay remisiones registradas para esta marca aún.
                </div>
              )}
            </div>
          </div>

          {/* Catalog of your brand's products */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-orange-600" />
                Catálogo de Productos de {activeBrand.name}
              </h3>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer font-bold"
              >
                <Plus className="w-3 h-3" /> Añadir
              </button>
            </div>

            <div className="space-y-2">
              {brandProducts.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Package className="w-8 h-8 text-orange-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Aún no tienes productos dados de alta.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(true)}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Producto
                  </button>
                </div>
              ) : (
                brandProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-[#FAFBFD] hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition shadow-2xs group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 block truncate">{p.name}</span>
                        {p.flavor && (
                          <span className="text-[10px] text-orange-700 font-bold bg-orange-50 px-1.5 py-0.2 rounded shrink-0">
                            {p.flavor}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                          {p.sku}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Unidad: {p.unit}</span>
                        <span>·</span>
                        <span>Mayoreo: <strong className="text-emerald-700 font-mono">${p.costPrice}</strong></span>
                        <span>·</span>
                        <span>PVP: <strong className="text-slate-800 font-mono">${p.suggestedRetailPrice}</strong></span>
                        {p.barcode && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-500">EAN: {p.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-500 font-medium block">
                          Bodega: <strong className="font-mono text-slate-900 font-bold">{p.centralWarehouseStock} {p.unit}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          title="Editar producto"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(p)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-rose-200/50"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Request Restock / Pickup */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" /> Solicitar Recolección de Nuevo Lote
            </h3>
            <p className="text-xs text-slate-500">
              La unidad de "Hecho en Ags" pasará a tu taller en <strong>{activeBrand.originLocation}</strong> a recoger el producto.
            </p>

            {restockSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-extrabold text-emerald-900">¡Recolección Programada!</p>
                <p className="text-[11px] text-emerald-700">
                  El repartidor asignado pasará a tu taller en la siguiente ventana de ruta.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestRestock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Producto a entregar</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                  >
                    {brandProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad de piezas</label>
                  <input
                    type="number"
                    min="5"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notas de recolección</label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRestockModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-orange-500/20"
                  >
                    Confirmar Recolección
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Products (Multi-Product Supported) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl p-6 space-y-4 shadow-2xl my-auto animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Añadir Productos al Catálogo de {activeBrand.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Puedes agregar uno o varios productos a la vez para su distribución en anaqueles compartidos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProducts} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Lista de Productos a Dar de Alta ({productsDraftList.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddProductDraftRow}
                  className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600" />
                  <span>+ Agregar otro producto</span>
                </button>
              </div>

              <div className="space-y-3">
                {productsDraftList.map((prod, index) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 space-y-2.5 relative group hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider bg-orange-100/60 px-2 py-0.5 rounded-md">
                        Producto #{index + 1}
                      </span>
                      {productsDraftList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProductDraftRow(prod.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar este producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nombre del Producto <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={index === 0 ? "ej. Miel de Azahar en Tarro 350g" : "ej. Mezquite Silvestre 500g"}
                          value={prod.name}
                          onChange={(e) => handleProductDraftChange(prod.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Sabor / Variante</label>
                        <input
                          type="text"
                          placeholder="ej. Azahar, Fresa..."
                          value={prod.flavor}
                          onChange={(e) => handleProductDraftChange(prod.id, 'flavor', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Código / SKU</label>
                        <input
                          type="text"
                          placeholder="ej. AZAH-350"
                          value={prod.sku}
                          onChange={(e) => handleProductDraftChange(prod.id, 'sku', e.target.value.toUpperCase())}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad</label>
                        <input
                          type="text"
                          placeholder="pza, frasco"
                          value={prod.unit}
                          onChange={(e) => handleProductDraftChange(prod.id, 'unit', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Código Barras / QR</label>
                        <input
                          type="text"
                          placeholder="750... (auto)"
                          value={prod.barcode}
                          onChange={(e) => handleProductDraftChange(prod.id, 'barcode', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mayorista / Consig. ($)</label>
                        <input
                          type="number"
                          value={prod.costPrice}
                          onChange={(e) => handleProductDraftChange(prod.id, 'costPrice', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">PVP Anaquel ($)</label>
                        <input
                          type="number"
                          value={prod.retailPrice}
                          onChange={(e) => handleProductDraftChange(prod.id, 'retailPrice', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Stock Bodega Inicial</label>
                        <input
                          type="number"
                          value={prod.initialStock}
                          onChange={(e) => handleProductDraftChange(prod.id, 'initialStock', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another product button directly under list */}
              <button
                type="button"
                onClick={handleAddProductDraftRow}
                className="w-full py-2.5 border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/40 hover:bg-orange-50/80 text-orange-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <span>+ Agregar otro producto a esta marca</span>
              </button>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Guardar {productsDraftList.length} {productsDraftList.length === 1 ? 'Producto' : 'Productos'} en Catálogo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {viewingTicket && (
        <TicketReceiptModal
          ticket={viewingTicket}
          store={stores.find((s) => s.id === viewingTicket.storeId)}
          onClose={() => setViewingTicket(null)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          brandName={activeBrand.name}
          onClose={() => setEditingProduct(null)}
          onSaved={() => setEditingProduct(null)}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {deletingProduct && (
        <DeleteProductConfirmModal
          product={deletingProduct}
          brandName={activeBrand.name}
          onClose={() => setDeletingProduct(null)}
          onDeleted={() => setDeletingProduct(null)}
        />
      )}

      {/* Bulk CSV Import Modal (Own Brand Products Only) */}
      {showCsvImportModal && (
        <BulkCsvImportModal
          mode="products"
          defaultBrandId={activeBrand.id}
          onClose={() => setShowCsvImportModal(false)}
        />
      )}
    </div>
  );
};
