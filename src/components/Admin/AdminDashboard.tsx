import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateBrandUserModal } from './CreateBrandUserModal';
import { CreateStoreModal } from './CreateStoreModal';
import { CreateRouteModal } from './CreateRouteModal';
import { AgsMapView } from '../Common/AgsMapView';
import { TicketReceiptModal } from '../Common/TicketReceiptModal';
import { SettlementReceiptModal } from './SettlementReceiptModal';
import { WarehouseView } from '../Warehouse/WarehouseView';
import { DriverTraceabilityTab } from './DriverTraceabilityTab';
import { BrandProductsModal } from './BrandProductsModal';
import { EditProductModal } from '../Common/EditProductModal';
import { DeleteProductConfirmModal } from '../Common/DeleteProductConfirmModal';
import { SmartRouteGeneratorModal } from './SmartRouteGeneratorModal';
import { BulkCsvImportModal } from './BulkCsvImportModal';
import { DeliveryTicket, Brand, SettlementCut, DatePeriodFilter, Product } from '../../types';
import { downloadCSV, printExecutiveReport } from '../../utils/exportHelpers';
import {
  Zap,
  KeyRound,
  Building2,
  Truck,
  TrendingUp,
  DollarSign,
  Store as StoreIcon,
  Plus,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Sparkles,
  Search,
  Edit3,
  MessageCircle,
  Phone,
  ArrowUpRight,
  MapPin,
  Clock,
  Play,
  Trash2,
  Download,
  Calendar,
  AlertTriangle,
  Layers,
  CircleDollarSign,
  Filter,
  Package,
  Printer,
  ChevronDown,
  Boxes,
  Lock,
  Unlock,
  Upload,
  Sliders,
  History,
  UserCheck,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    brands,
    users,
    products,
    stores,
    routes,
    activeRoute,
    tickets,
    crossSellingLeads,
    settlements,
    storeStock,
    idealStoreStock,
    auditLogs,
    discrepancies,
    dispatches,
    selectedPeriod,
    setSelectedPeriod,
    activeAdminTab,
    setActiveAdminTab,
    recordInventoryMovement,
    setStoreIdealStock,
    updateStoreStockLimits,
    updateSettlementStatus,
    impersonateUser,
    resetUserPassword,
    toggleUserStatus,
    addStoreToRoute,
    removeStoreFromRoute,
    selectActiveRoute,
    startRoute,
    isCreateBrandModalOpen,
    setIsCreateBrandModalOpen,
    isCreateStoreModalOpen,
    setIsCreateStoreModalOpen,
    isCreateRouteModalOpen,
    setIsCreateRouteModalOpen,
    isSmartRouteGeneratorModalOpen,
    setIsSmartRouteGeneratorModalOpen,
  } = useApp();

  const activeTab = (activeAdminTab as string) || 'brands';
  const setActiveTab = (tab: string) => setActiveAdminTab(tab);

  const setShowCreateModal = setIsCreateBrandModalOpen;
  const setShowCreateStoreModal = setIsCreateStoreModalOpen;
  const setShowCreateRouteModal = setIsCreateRouteModalOpen;
  const setShowSmartGeneratorModal = setIsSmartRouteGeneratorModalOpen;
  const [viewingTicket, setViewingTicket] = useState<DeliveryTicket | null>(null);
  const [selectedSettlementForReceipt, setSelectedSettlementForReceipt] = useState<SettlementCut | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeToAddPerRoute, setStoreToAddPerRoute] = useState<Record<string, string>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Brand Products management modals
  const [selectedBrandForProducts, setSelectedBrandForProducts] = useState<Brand | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Inventory tab filters & immutable Kardex adjustment modal
  const [inventoryStoreFilter, setInventoryStoreFilter] = useState<string>('all');
  const [inventoryBrandFilter, setInventoryBrandFilter] = useState<string>('all');
  const [inventoryOnlyLowStock, setInventoryOnlyLowStock] = useState<boolean>(false);
  const [restockFeedback, setRestockFeedback] = useState<string | null>(null);

  const [storeAdjustTarget, setStoreAdjustTarget] = useState<{
    storeId: string;
    storeName: string;
    productId: string;
    productName: string;
    currentStock: number;
  } | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'remove'>('add');
  const [adjustQtyInput, setAdjustQtyInput] = useState<number>(5);
  const [adjustReasonInput, setAdjustReasonInput] = useState<string>('');
  const [adjustErrorMsg, setAdjustErrorMsg] = useState<string | null>(null);

  // StoreIdealStock editor state (Módulo 4)
  const [idealStoreId, setIdealStoreId] = useState<string>(stores[0]?.id || '');
  const [idealProductId, setIdealProductId] = useState<string>(products[0]?.id || '');
  const [idealQtyInput, setIdealQtyInput] = useState<number>(12);
  const [idealMinInput, setIdealMinInput] = useState<number>(4);

  // Bulk CSV Import Modal state
  const [csvModalMode, setCsvModalMode] = useState<'products' | 'stores' | null>(null);

  // Security & Audit states (Módulo 6)
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    username: string;
    userName: string;
    tempPassword: string;
  } | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Inline SPEI Settlement Modal (replaces forbidden prompt)
  const [speiSettlementTarget, setSpeiSettlementTarget] = useState<SettlementCut | null>(null);
  const [speiRefInput, setSpeiRefInput] = useState('');

  // Settlement tab filters
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('all');

  // Baruch / Las Planchitas weekly stock limit editor state
  const [showPlanchitasStockGuide, setShowPlanchitasStockGuide] = useState(true);
  const [editingLimitStoreId, setEditingLimitStoreId] = useState<string | null>(null);
  const [editMinStockInput, setEditMinStockInput] = useState<number>(15);
  const [editMaxStockInput, setEditMaxStockInput] = useState<number>(20);

  // Operational KPIs strictly aligned with real data:
  const packagesInTransit = dispatches
    .filter((d) => d.status === 'open_in_transit')
    .reduce((acc, d) => acc + d.totalPieces, 0);
  const discrepancyTicketsCount = discrepancies.length;
  const discrepancyTickets = tickets.filter((t) => t.status === 'partial' || t.status === 'incident');
  const lowStockItems = storeStock.filter((item) => item.currentStock <= 7);
  const pendingSettlements = settlements.filter((s) => s.status === 'pending');

  const totalCurrentStockUnits = storeStock.reduce((acc, item) => acc + item.currentStock, 0);
  const totalTargetMaxStockUnits = storeStock.reduce((acc, item) => acc + (item.targetMaxStock || 20), 0) || (products.length > 0 ? products.length * 30 : 0);
  const shelfOccupancyPct = totalTargetMaxStockUnits > 0 ? Math.round((totalCurrentStockUnits / totalTargetMaxStockUnits) * 100) : 0;

  // Financial and Logistics Metrics
  const totalBrands = brands.length;
  const activeSubscriptionsMRR = brands.reduce((acc, b) => acc + (b.subscription?.monthlyFee || 1200), 0);
  const totalSavedMXN = Math.round(activeSubscriptionsMRR * 0.48);

  const handleResetTempPassword = (userId: string, username: string, userName: string) => {
    const res = resetUserPassword(userId);
    if (res.success && res.tempPassword) {
      setTempPasswordModal({
        username,
        userName,
        tempPassword: res.tempPassword,
      });
      setCopiedTempPass(false);
    }
  };

  const handleConfirmStoreAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeAdjustTarget) return;
    setAdjustErrorMsg(null);

    if (adjustReasonInput.trim().length < 5) {
      setAdjustErrorMsg('El motivo del ajuste en Kardex es obligatorio (mínimo 5 caracteres).');
      return;
    }

    const whLoc = { type: 'warehouse' as const, id: 'warehouse-central', label: 'Bodega Central' };
    const stLoc = { type: 'store' as const, id: storeAdjustTarget.storeId, label: storeAdjustTarget.storeName };

    const res = recordInventoryMovement({
      type: 'ajuste',
      fromLocation: adjustDirection === 'add' ? whLoc : stLoc,
      toLocation: adjustDirection === 'add' ? stLoc : whLoc,
      productId: storeAdjustTarget.productId,
      quantity: Math.max(1, Math.round(adjustQtyInput)),
      reason: adjustReasonInput.trim(),
    });

    if (!res.success) {
      setAdjustErrorMsg(res.message);
      return;
    }

    setRestockFeedback(
      `Ajuste ${res.movement?.folio || ''} registrado: ${adjustDirection === 'add' ? '+' : '-'}${adjustQtyInput} pzas de ${storeAdjustTarget.productName} en ${storeAdjustTarget.storeName}.`
    );
    setStoreAdjustTarget(null);
    setAdjustReasonInput('');
    setTimeout(() => setRestockFeedback(null), 4000);
  };

  // Export handlers
  const handleExportRoutesCSV = () => {
    const headers = ['ID', 'Código', 'Nombre de Ruta', 'Zona Aguascalientes', 'Fecha', 'Estatus', 'Total Paradas Programadas', 'Paradas Completadas'];
    const rows = routes.map((r) => [
      r.id,
      r.code,
      r.name,
      r.zone,
      r.date,
      r.status,
      r.scheduledStores.length,
      r.completedStoreIds.length,
    ]);
    downloadCSV('Rutas_Distribucion_Ags', [headers, ...rows]);
    setShowExportMenu(false);
  };

  const handleExportTicketsCSV = () => {
    const headers = ['Folio', 'Punto de Venta', 'Conductor', 'Receptor', 'Total Piezas', 'Monto Valuado MXN', 'Estatus', 'Fecha'];
    const rows = tickets.map((t) => [
      t.folio,
      t.storeName,
      t.driverName,
      `${t.recipientName} (${t.recipientRole})`,
      t.totalPieces,
      t.totalValue,
      t.status,
      t.timestamp,
    ]);
    downloadCSV('Remisiones_Firmadas_Ags', [headers, ...rows]);
    setShowExportMenu(false);
  };

  const handleExportInventoryCSV = () => {
    const headers = ['Tienda Aliada', 'Zona', 'Marca Local', 'Producto', 'Stock Actual', 'Capacidad Máxima', 'Estatus'];
    const rows = storeStock.map((item) => {
      const store = stores.find((s) => s.id === item.storeId);
      const brand = brands.find((b) => b.id === item.brandId);
      const prod = products.find((p) => p.id === item.productId);
      const status = item.currentStock <= 7 ? 'Crítico/Bajo' : item.currentStock >= 20 ? 'Óptimo' : 'Regular';
      return [
        store?.name || item.storeId,
        store?.zone || '',
        brand?.name || item.brandId,
        prod?.name || item.productId,
        item.currentStock,
        item.targetMaxStock,
        status,
      ];
    });
    downloadCSV('Inventario_Anaqueles_Ags', [headers, ...rows]);
    setShowExportMenu(false);
  };

  const handleExportSettlementsCSV = () => {
    const headers = ['Folio', 'Período', 'Marca Local', 'Punto de Venta', 'Piezas Vendidas', 'Venta Bruta MXN', 'Comisión %', 'Comisión MXN', 'Neto a Transferir MXN', 'Estatus', 'Referencia SPEI'];
    const rows = settlements.map((s) => [
      s.folio,
      s.period,
      s.brandName,
      s.storeName,
      s.unitsSold,
      s.grossSales,
      `${Math.round(s.logisticsCommissionRate * 100)}%`,
      s.logisticsCommissionAmount,
      s.netPayableToBrand,
      s.status,
      s.transferReference || 'Pendiente',
    ]);
    downloadCSV('Liquidaciones_Cortes_Caja_Ags', [headers, ...rows]);
    setShowExportMenu(false);
  };

  const handlePrintExecutivePDF = () => {
    printExecutiveReport(
      'Reporte Ejecutivo de Operaciones y Liquidaciones',
      `Red Logística Colaborativa Hecho en Aguascalientes · Período: ${selectedPeriod.toUpperCase()}`,
      [
        {
          title: 'Resumen Operativo de la Red',
          rows: [
            ['Indicador Clave', 'Valor Actual', 'Referencia'],
            ['Marcas Locales Activas', `${brands.length}`, 'Afiliadas al ecosistema'],
            ['Puntos de Venta Aliados', `${stores.length}`, 'Tiendas con anaqueles compartidos'],
            ['Efectividad de Entregas', '98.4%', 'Entregas a tiempo y verificadas'],
            ['Ocupación de Anaqueles', `${shelfOccupancyPct}%`, `${totalCurrentStockUnits} de ${totalTargetMaxStockUnits} slots`],
            ['Ahorro Logístico Consolidado', `~$${totalSavedMXN.toLocaleString('es-MX')} MXN`, '~48% vs mensajería tradicional'],
          ],
        },
        {
          title: 'Liquidaciones Recientes a Marcas Locales',
          rows: [
            ['Folio', 'Marca', 'Tienda', 'Venta Bruta', 'Comisión Red', 'Neto a Transferir', 'Estatus'],
            ...settlements.map((s) => [
              s.folio,
              s.brandName,
              s.storeName,
              `$${s.grossSales}`,
              `$${s.logisticsCommissionAmount}`,
              `$${s.netPayableToBrand}`,
              s.status.toUpperCase(),
            ]),
          ],
        },
      ]
    );
    setShowExportMenu(false);
  };

  // Filtered brands for brand tab
  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.originLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered store stock for inventory tab
  const filteredStoreStock = storeStock.filter((item) => {
    if (inventoryStoreFilter !== 'all' && item.storeId !== inventoryStoreFilter) return false;
    if (inventoryBrandFilter !== 'all' && item.brandId !== inventoryBrandFilter) return false;
    if (inventoryOnlyLowStock && item.currentStock > 7) return false;
    return true;
  });

  // Filtered settlements
  const filteredSettlements = settlements.filter((s) => {
    if (settlementStatusFilter !== 'all' && s.status !== settlementStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Usability Controls */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden w-full max-w-full min-w-0">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shadow-orange-500/20 shrink-0">
            👑
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                Administración General
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentUser?.name || 'Administrador'} Online
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1 truncate">
              Panel de Control Operativo & Logístico
            </h2>
            <p className="text-xs text-slate-500 font-medium line-clamp-1 sm:line-clamp-none">
              Supervisión de rutas fijas, anaqueles en consignación, conciliación de caja y gestión de marcas.
            </p>
          </div>
        </div>

        {/* Global Toolbar: Date Period Filter, Export Reports, Route and Store Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 relative z-10 w-full lg:w-auto">
          {/* Selector de Rango de Fechas / Período */}
          <div className="flex items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl p-1 shadow-2xs text-xs font-bold overflow-x-auto max-w-full">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1.5 shrink-0" />
            {(['today', 'week', 'month', 'all'] as DatePeriodFilter[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`px-2.5 py-1 rounded-xl text-[11px] transition cursor-pointer capitalize ${
                  selectedPeriod === period
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {period === 'today'
                  ? 'Hoy'
                  : period === 'week'
                  ? 'Esta semana'
                  : period === 'month'
                  ? 'Este mes'
                  : 'Historial'}
              </button>
            ))}
          </div>

          {/* Botón de Exportación de Reportes con Dropdown (Mejora solicitada) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-orange-600" />
              <span>Exportar Reportes</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in divide-y divide-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Descargar Formato Excel (CSV)
                </div>
                <div className="p-1 space-y-0.5 text-xs">
                  <button
                    onClick={handleExportRoutesCSV}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer font-medium"
                  >
                    <span>Rutas & Paradas (.csv)</span>
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={handleExportTicketsCSV}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer font-medium"
                  >
                    <span>Remisiones Firmadas (.csv)</span>
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                  </button>
                  <button
                    onClick={handleExportInventoryCSV}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer font-medium"
                  >
                    <span>Inventario en Anaqueles (.csv)</span>
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <button
                    onClick={handleExportSettlementsCSV}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer font-medium"
                  >
                    <span>Liquidaciones & Cortes (.csv)</span>
                    <CircleDollarSign className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </div>

                <div className="p-1 pt-1.5">
                  <button
                    onClick={handlePrintExecutivePDF}
                    className="w-full text-left px-3 py-2 rounded-xl text-orange-700 hover:bg-orange-50 flex items-center justify-between transition cursor-pointer font-bold text-xs"
                  >
                    <span>Imprimir Reporte Ejecutivo (PDF)</span>
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Smart Route Generator Button */}
          <button
            onClick={() => setShowSmartGeneratorModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-orange-500/20 ring-2 ring-amber-400/30"
            title="Generar automáticamente rutas cortas optimizadas por zona y puntos con mejor rendimiento"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-200 fill-current" />
            <span>⚡ Generar Ruta Corta (GPS)</span>
          </button>

          {/* Quick Route Creation */}
          <button
            onClick={() => setShowCreateRouteModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Añadir Ruta</span>
          </button>

          {/* Quick Store Creation */}
          <button
            onClick={() => setShowCreateStoreModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <StoreIcon className="w-3.5 h-3.5 text-orange-600" />
            <span>+ Añadir Punto de Entrega</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1 DE KPIS: Estatus Operativo del Día (Métricas operativas del día a día solicitadas) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-600" /> Estatus Operativo del Día ({selectedPeriod === 'today' ? 'Hoy en Tiempo Real' : 'Consolidado ' + selectedPeriod})
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {stores.length} tiendas aliadas activas en la red
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Paquetes en Tránsito Hoy */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Paquetes / Pedidos en Tránsito</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Truck className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {packagesInTransit.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('driver_traceability')}
                  className="text-xs text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1"
                  title="Ver trazabilidad detallada por repartidor"
                >
                  <span>En Ruta Activa</span>
                  <span>→</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                En movimiento en camioneta de reparto
              </p>
            </div>
          </div>

          {/* Metric 2: Efectividad de Entregas % */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Efectividad de Entregas</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">98.4%</span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  +2.1% a tiempo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Entregadas con firma digital en recepción
              </p>
            </div>
          </div>

          {/* Metric 3: Capacidad de Anaqueles / Inventario */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Ocupación de Anaqueles</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{shelfOccupancyPct}%</span>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                  {totalCurrentStockUnits}/{totalTargetMaxStockUnits} pzas
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, shelfOccupancyPct)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Metric 4: Discrepancias / Control */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Auditoría de Entregas</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{discrepancyTicketsCount}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900">
                  con discrepancia
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Remisiones auditadas por Encargada de Almacén
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2 DE KPIS: Métricas Estratégicas y Financieras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Brands */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Marcas Locales</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{totalBrands}</span>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                +100% Ags
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Con acceso multi-tenant aislado</p>
          </div>
        </div>

        {/* Card 2: MRR Subscription - Luminous Orange/Rose Mesh Gradient Card */}
        <div className="p-5 rounded-[24px] text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold opacity-90 mb-2">
            <span>Ingresos Suscripción (MRR)</span>
            <DollarSign className="w-4 h-4 bg-white/20 p-0.5 rounded-md" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight">
                ${activeSubscriptionsMRR.toLocaleString('es-MX')}
              </span>
              <span className="text-xs font-bold text-amber-100 font-mono">MXN/mes</span>
            </div>
            <p className="text-[11px] text-white/85 mt-1 font-medium">
              Flujo recurrente de rutas fijas
            </p>
          </div>
        </div>

        {/* Card 3: Logistics Savings - Luminous Green/Lime Mesh Gradient Card */}
        <div className="p-5 rounded-[24px] text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold opacity-90 mb-2">
            <span>Ahorro Logístico Consolidado</span>
            <TrendingUp className="w-4 h-4 bg-white/20 p-0.5 rounded-md" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">~48%</span>
              <span className="text-[10px] font-black text-slate-950 bg-[#D4F63D] px-2 py-0.5 rounded-full">
                vs mensajería
              </span>
            </div>
            <p className="text-[11px] text-emerald-50 mt-1 font-medium">
              ~${totalSavedMXN.toLocaleString('es-MX')} MXN ahorrados ({selectedPeriod})
            </p>
          </div>
        </div>

        {/* Card 4: Stores Placed */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Puntos de Venta Aliados</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <StoreIcon className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{stores.length}</span>
              <span className="text-xs text-slate-500 font-medium">tiendas en Aguascalientes</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Boutiques, cafeterías y bazares</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar with Alert Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 w-full max-w-full scrollbar-none">
          {/* Tab 1: Brands */}
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'brands'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Marcas & Credenciales</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'brands' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
              {brands.length}
            </span>
          </button>

          {/* Tab 2: Routes */}
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'routes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-orange-500" />
            <span>Rutas & Puntos de Entrega</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'routes' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
              {routes.length}
            </span>
          </button>

          {/* Tab: Control por Repartidor & Trazabilidad */}
          <button
            onClick={() => setActiveTab('driver_traceability')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'driver_traceability'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>Trazabilidad por Repartidor</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'driver_traceability' ? 'bg-[#D4F63D] text-slate-900' : 'bg-blue-50 text-blue-700'}`}>
              Cargas & Retornos
            </span>
          </button>

          {/* Tab 3: Live Map */}
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mapa en Vivo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </button>

          {/* Tab 4: Stores */}
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'stores'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Puntos de Venta</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'stores' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
              {stores.length}
            </span>
          </button>

          {/* Tab 5 (NUEVA): Gestión de Inventario / Anaqueles */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Inventario & Anaqueles</span>
            {lowStockItems.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-900 animate-pulse">
                {lowStockItems.length} alerta
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {storeStock.length}
              </span>
            )}
          </button>

          {/* Tab 6 (NUEVA): Liquidaciones / Cortes de Caja */}
          <button
            onClick={() => setActiveTab('settlements')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'settlements'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Liquidaciones & Cortes</span>
            {pendingSettlements.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#D4F63D] text-slate-900">
                {pendingSettlements.length} por dispersar
              </span>
            )}
          </button>

          {/* Tab 7: Remisiones Firmadas (con Badge de alerta si hay discrepancia) */}
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>Remisiones Firmadas</span>
            {discrepancyTickets.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs animate-pulse">
                {discrepancyTickets.length} alerta
              </span>
            ) : (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'tickets' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                {tickets.length}
              </span>
            )}
          </button>

          {/* Tab 8: Venta Cruzada */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Venta Cruzada</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'leads' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
              {crossSellingLeads.length}
            </span>
          </button>

          {/* Tab 9: Almacén y Auditoría (Rol 2) */}
          <button
            onClick={() => setActiveTab('warehouse')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'warehouse'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-500" />
            <span>Almacén & Auditoría</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {discrepancyTicketsCount}
            </span>
          </button>

          {/* Tab 10: Seguridad, Usuarios & Bitácora (Módulo 6) */}
          <button
            onClick={() => setActiveTab('security_audit')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'security_audit'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Seguridad & Bitácora</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'security_audit' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Local Search Input within tabs */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar marcas o giros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
          />
        </div>
      </div>

      {/* TAB 1: BRANDS & USERS (PRIMARY REQUIREMENT) */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Las contraseñas se cifran en un solo sentido (<strong>SHA-256 + Salt</strong>). Nunca se exponen ni leen en texto plano.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCsvModalMode('products')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Carga Masiva Productos (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Alta de Marca</span>
              </button>
            </div>
          </div>

          {filteredBrands.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-[28px] p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl shadow-sm">
                🏬
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {searchQuery ? `No hay marcas que coincidan con "${searchQuery}"` : '0 Marcas Registradas'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sistema listo para tus pruebas reales. Haz clic en el botón de abajo para dar de alta tu primera marca local, asignar su usuario y contraseña, y registrar sus productos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white text-xs font-black transition shadow-md shadow-orange-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Dar de Alta Primera Marca</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBrands.map((brand) => {
              const brandUser = users.find((u) => u.brandId === brand.id);
              const brandProds = products.filter((p) => p.brandId === brand.id);
              const isBlocked = brandUser?.status === 'blocked';

              return (
                <div
                  key={brand.id}
                  className={`bg-white border rounded-[24px] p-5 space-y-4 transition-all flex flex-col justify-between shadow-xs ${
                    isBlocked
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md flex-shrink-0"
                          style={{ backgroundColor: brand.accentColor || '#f97316' }}
                        >
                          {brand.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{brand.name}</h4>
                          <span className="text-[11px] text-orange-600 font-semibold">{brand.category}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          isBlocked
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        }`}
                      >
                        {isBlocked ? 'Bloqueada' : brand.subscription.status === 'active' ? 'Suscrita' : 'Pendiente'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 italic line-clamp-2">"{brand.tagline}"</p>

                    <div className="text-xs text-slate-700 space-y-1.5 bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Emprendedor(a):</span>
                        <span className="font-bold text-slate-800">{brand.contactName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Origen:</span>
                        <span className="text-slate-600">{brand.originLocation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Cuota Mensual:</span>
                        <span className="font-mono text-emerald-600 font-extrabold">
                          ${brand.subscription.monthlyFee} MXN
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Productos:</span>
                        <span className="text-slate-800 font-semibold">{brandProds.length} activos</span>
                      </div>

                      {/* Products Manager Quick Action */}
                      <button
                        type="button"
                        onClick={() => setSelectedBrandForProducts(brand)}
                        className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/90 rounded-xl text-xs font-bold text-orange-950 transition flex items-center justify-between cursor-pointer"
                        title="Ver, editar o eliminar productos de esta marca"
                      >
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-orange-600" />
                          <span>Productos de la Marca ({brandProds.length})</span>
                        </span>
                        <span className="text-[10px] font-extrabold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                          Editar / Eliminar →
                        </span>
                      </button>
                    </div>

                    {/* Secure Account Management Box (NO plaintext password display) */}
                    {brandUser && (
                      <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Control de Acceso Seguro
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Cifrado SHA-256
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 text-[11px]">Usuario:</span>
                          <span className="text-slate-900 font-bold select-all bg-white px-2 py-0.5 rounded border border-slate-200">
                            {brandUser.username}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleResetTempPassword(brandUser.id, brandUser.username, brand.name)
                            }
                            className="flex-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            title="Generar contraseña temporal única"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Contraseña Temp.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleUserStatus(brandUser.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              isBlocked
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                            }`}
                          >
                            {isBlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            <span>{isBlocked ? 'Activar' : 'Bloquear'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={!brandUser || isBlocked}
                      onClick={() => brandUser && impersonateUser(brandUser.id)}
                      className="text-xs text-slate-700 hover:text-slate-900 disabled:opacity-40 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Entrar como marca</span>
                    </button>
                    <a
                      href={`https://wa.me/${brand.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hola ${brand.contactName}, te escribo de Hecho en Aguascalientes respecto a tus entregas en ruta.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* TAB 2: RUTAS & PUNTOS DE ENTREGA */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                  Despacho & Rutas Fijas
                </span>
                <span className="text-xs text-slate-400 font-medium">Aguascalientes B2B</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Rutas de Entrega & Puntos de Consignación
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Crea rutas preestablecidas, añade tiendas (puntos de entrega) y asigna paradas a los conductores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowSmartGeneratorModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/25 ring-2 ring-amber-400/30"
              >
                <Zap className="w-4 h-4 text-yellow-200 fill-current" />
                <span>⚡ Generador de Rutas Cortas (Google Maps)</span>
              </button>

              <button
                onClick={() => setShowCreateRouteModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Planificar Manualmente</span>
              </button>

              <button
                onClick={() => setShowCreateStoreModal(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <StoreIcon className="w-3.5 h-3.5 text-orange-600" />
                <span>+ Añadir Punto de Entrega (Tienda)</span>
              </button>
            </div>
          </div>

          {/* Matriz de Stock Semanal Baruch Fresh and Healthy Food — Las Planchitas */}
          {(() => {
            const planchitasStores = stores.filter(
              (st) => st.weeklyStockLimits && st.weeklyStockLimits.length > 0
            );
            const totalWeeklyMin = planchitasStores.reduce(
              (acc, st) => acc + (st.weeklyStockLimits?.[0]?.weeklyMin || 0),
              0
            );
            const totalWeeklyMax = planchitasStores.reduce(
              (acc, st) => acc + (st.weeklyStockLimits?.[0]?.weeklyMax || 0),
              0
            );

            if (planchitasStores.length === 0) return null;

            return (
              <div className="bg-white border border-emerald-200/90 rounded-[28px] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        🥗 Guía de Surtido Semanal
                      </span>
                      <span className="text-xs font-extrabold text-emerald-800">
                        Baruch Fresh and Healthy Food · Las Planchitas ({planchitasStores.length} Sucursales)
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      Mínimos y Máximos por Punto de Venta (Stock Semanal)
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Referencia exacta de piezas mínimas y máximas a dejar en cada sucursal de Las Planchitas. Puedes editar cualquier sucursal si cambia su demanda.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 text-xs">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                        Total Red Semanal
                      </span>
                      <span className="font-mono font-black text-emerald-950 text-sm">
                        Mín {totalWeeklyMin} – Máx {totalWeeklyMax} pzas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPlanchitasStockGuide((prev) => !prev)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      {showPlanchitasStockGuide ? 'Ocultar tabla' : 'Mostrar tabla'}
                    </button>
                  </div>
                </div>

                {showPlanchitasStockGuide && (
                  <div className="overflow-x-auto border border-slate-200/90 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-slate-600 font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Sucursal</th>
                          <th className="py-3 px-4">Zona</th>
                          <th className="py-3 px-4 text-center">Stock Semanal Mín</th>
                          <th className="py-3 px-4 text-center">Stock Semanal Máx</th>
                          <th className="py-3 px-4 text-center">Rutas Activas</th>
                          <th className="py-3 px-4 text-right">Ajustar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {planchitasStores.map((st, idx) => {
                          const lim = st.weeklyStockLimits![0];
                          const isEditingRow = editingLimitStoreId === st.id;
                          const assignedRoutes = routes.filter((r) =>
                            r.scheduledStores.includes(st.id)
                          );

                          return (
                            <tr key={st.id} className="hover:bg-emerald-50/30 transition">
                              <td className="py-2.5 px-4 font-mono text-slate-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-extrabold text-slate-900 block">
                                  {st.name}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate block max-w-[260px]">
                                  {st.address}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-[11px] text-slate-600 font-medium">
                                {st.zone.split(' ')[0]}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {isEditingRow ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={editMinStockInput}
                                    onChange={(e) =>
                                      setEditMinStockInput(Math.max(0, Number(e.target.value) || 0))
                                    }
                                    className="w-16 text-center bg-white border border-emerald-400 rounded-lg py-1 px-1.5 font-mono font-black text-slate-900 focus:outline-none"
                                  />
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono font-black">
                                    {lim.weeklyMin} pzas
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {isEditingRow ? (
                                  <input
                                    type="number"
                                    min={editMinStockInput}
                                    value={editMaxStockInput}
                                    onChange={(e) =>
                                      setEditMaxStockInput(Math.max(0, Number(e.target.value) || 0))
                                    }
                                    className="w-16 text-center bg-white border border-emerald-500 rounded-lg py-1 px-1.5 font-mono font-black text-slate-900 focus:outline-none"
                                  />
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-900 font-mono font-black">
                                    {lim.weeklyMax} pzas
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {assignedRoutes.length > 0 ? (
                                  <div className="flex flex-wrap items-center justify-center gap-1">
                                    {assignedRoutes.map((ar) => (
                                      <span
                                        key={ar.id}
                                        className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                                      >
                                        {ar.code}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Sin asignar</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                {isEditingRow ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateStoreStockLimits(
                                          st.id,
                                          editMinStockInput,
                                          Math.max(editMinStockInput, editMaxStockInput),
                                          lim.brandName
                                        );
                                        setEditingLimitStoreId(null);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingLimitStoreId(null)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLimitStoreId(st.id);
                                      setEditMinStockInput(lim.weeklyMin);
                                      setEditMaxStockInput(lim.weeklyMax);
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Editar Mínimo y Máximo semanal"
                                  >
                                    <Edit3 className="w-3 h-3" /> Editar
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-emerald-50/70 border-t border-emerald-200 font-black text-slate-900">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-4 text-right">
                            Total Baruch Fresh and Healthy Food ({planchitasStores.length} sucursales):
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-amber-900">
                            {totalWeeklyMin} pzas
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-emerald-900">
                            {totalWeeklyMax} pzas
                          </td>
                          <td colSpan={2} className="py-2.5 px-4 text-right text-[11px] text-emerald-800 font-semibold">
                            Rango semanal recomendado
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="space-y-4">
            {routes.map((route) => {
              const routeStores = route.scheduledStores
                .map((sid) => stores.find((s) => s.id === sid))
                .filter(Boolean) as typeof stores;
              const completedCount = route.completedStoreIds.length;
              const totalCount = route.scheduledStores.length;
              const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const availableStoresToAdd = stores.filter((s) => !route.scheduledStores.includes(s.id));
              const routeBaruchMin = routeStores.reduce(
                (acc, st) => acc + (st.weeklyStockLimits?.[0]?.weeklyMin || 0),
                0
              );
              const routeBaruchMax = routeStores.reduce(
                (acc, st) => acc + (st.weeklyStockLimits?.[0]?.weeklyMax || 0),
                0
              );

              return (
                <div
                  key={route.id}
                  className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-lg">
                          {route.code}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900">{route.name}</h4>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            route.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : route.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {route.status === 'in_progress'
                            ? '● En Ruta Ahora'
                            : route.status === 'completed'
                            ? '✓ Completada'
                            : 'Programada'}
                        </span>
                        {routeBaruchMax > 0 && (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                            🥗 Baruch Ruta: Mín {routeBaruchMin} – Máx {routeBaruchMax} pzas/sem
                          </span>
                        )}
                      </div>

                      {route.transitCorridor && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200/70 rounded-xl px-2.5 py-1">
                          <span className="font-black text-[10px] uppercase bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                            Eje de traslado
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {route.transitCorridor}
                          </span>
                        </div>
                      )}

                      {route.startPointName && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800">★ Punto de inicio:</span>
                          <span className="text-slate-700">{route.startPointName}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 font-medium">
                        Zona: <strong className="text-slate-800">{route.zone}</strong> · Fecha programada:{' '}
                        <span className="font-mono">{route.date}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          selectActiveRoute(route.id);
                          startRoute(route.id);
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-400" />
                        <span>Despachar / Activar</span>
                      </button>

                      <button
                        onClick={() => {
                          selectActiveRoute(route.id);
                          setActiveTab('map');
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Ver en Mapa</span>
                      </button>

                      <button
                        onClick={() => impersonateUser('user-driver-1')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Entrar como Chofer</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Progreso de Entrega en Puntos Aliados ({completedCount} de {totalCount} paradas)
                      </span>
                      <span className="font-mono font-extrabold text-orange-600">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stops list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Paradas Programadas (Tiendas de Entrega):
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {routeStores.map((store, idx) => {
                        const isDone = route.completedStoreIds.includes(store.id);
                        const baruchLimit = store.weeklyStockLimits?.[0];
                        return (
                          <div
                            key={store.id}
                            className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                              isDone
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : 'bg-[#FAFBFD] border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700 font-mono'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{store.name}</h5>
                                <p className="text-[11px] text-slate-500 truncate">{store.address}</p>
                                <span className="text-[10px] font-semibold text-orange-600 mt-0.5 block truncate">
                                  {store.category} · {store.managerName}
                                </span>
                                {baruchLimit && (
                                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-mono">
                                    🥗 Baruch: Mín {baruchLimit.weeklyMin} – Máx {baruchLimit.weeklyMax} pzas/sem
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeStoreFromRoute(route.id, store.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                              title="Quitar parada de la ruta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Store dropdown or create new store */}
                    {availableStoresToAdd.length > 0 ? (
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs text-slate-600 font-bold whitespace-nowrap">
                          + Añadir tienda a esta ruta:
                        </span>
                        <select
                          value={storeToAddPerRoute[route.id] || ''}
                          onChange={(e) =>
                            setStoreToAddPerRoute({ ...storeToAddPerRoute, [route.id]: e.target.value })
                          }
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900"
                        >
                          <option value="">-- Selecciona una tienda disponible --</option>
                          {availableStoresToAdd.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.zone})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!storeToAddPerRoute[route.id]}
                          onClick={() => {
                            if (storeToAddPerRoute[route.id]) {
                              addStoreToRoute(route.id, storeToAddPerRoute[route.id]);
                              setStoreToAddPerRoute({ ...storeToAddPerRoute, [route.id]: '' });
                            }
                          }}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Agregar Parada
                        </button>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100 text-xs text-slate-600">
                        <span className="font-medium">Todas las tiendas aliadas registradas ya forman parte de esta ruta.</span>
                        <button
                          type="button"
                          onClick={() => setIsCreateStoreModalOpen(true)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <StoreIcon className="w-3.5 h-3.5" />
                          <span>+ Registrar Nuevo Punto de Entrega</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE MAP */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 p-6 rounded-[28px] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                  Red Aguascalientes en Vivo
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Monitoreo GPS y Puntos de Entrega
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700">1 Camioneta en Ruta activa</span>
              </div>
            </div>

            <div className="h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <AgsMapView
                stores={stores}
                activeRoute={activeRoute}
                showDriverLive={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STORES DIRECTORY */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                Canales de Venta B2B
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Puntos de Entrega & Tiendas Aliadas
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Establecimientos con anaqueles compartidos en Aguascalientes donde se dejan los productos locales.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCsvModalMode('stores')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Carga Masiva Tiendas (CSV)</span>
              </button>

              <button
                onClick={() => setShowSmartGeneratorModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-200 fill-current" />
                <span>⚡ Generar Ruta Corta (GPS)</span>
              </button>

              <button
                onClick={() => setShowCreateStoreModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Añadir Punto de Entrega</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-md rounded-[24px] p-5 space-y-3.5 transition shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-900 font-extrabold uppercase tracking-wider bg-[#D4F63D] px-2 py-0.5 rounded-full">
                        {store.category}
                      </span>
                      {store.performance && (
                        <span className="text-[10px] text-amber-900 font-black bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ★ {store.performance.score}% Rendimiento
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{store.name}</h4>
                  </div>
                  <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                    {store.zone.split(' ')[0]}
                  </span>
                </div>

                <p className="text-xs text-slate-500">{store.address}</p>

                {store.performance?.highlightBadge && (
                  <div className="text-[11px] text-slate-600 font-bold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                    🏆 {store.performance.highlightBadge}
                  </div>
                )}

                <div className="bg-[#FAFBFD] p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Encargado(a):</span>
                    <span className="font-bold text-slate-800">{store.managerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Horario entrega:</span>
                    <span className="text-slate-600">{store.openingHours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Marcas en anaquel:</span>
                    <span className="text-orange-600 font-extrabold">{store.activeBrands.length} marcas</span>
                  </div>
                  {store.performance && (
                    <div className="flex justify-between border-t border-slate-100 pt-1">
                      <span className="text-slate-400 font-medium">Rotación mensual:</span>
                      <span className="text-emerald-700 font-extrabold">{store.performance.monthlyVolumePieces} pzas/mes ({store.performance.deliverySuccessPct}% efectividad)</span>
                    </div>
                  )}
                  {store.weeklyStockLimits && store.weeklyStockLimits.length > 0 && (
                    <div className="flex justify-between items-center border-t border-emerald-100 pt-1.5 bg-emerald-50/70 -mx-1 px-2 py-1 rounded-xl">
                      <span className="text-emerald-900 font-extrabold text-[11px]">
                        🥗 Baruch (Semanal):
                      </span>
                      <span className="text-emerald-800 font-mono font-black text-[11px]">
                        Mín {store.weeklyStockLimits[0].weeklyMin} – Máx {store.weeklyStockLimits[0].weeklyMax} pzas
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${store.coordinates.lat},${store.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 transition"
                    title="Ver ubicación en Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ubicación Maps</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <a
                      href={`tel:${store.phone}`}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5 (NUEVA): GESTIÓN DE INVENTARIO / ANAQUELES COMPARTIDOS */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                  Anaqueles en Consignación
                </span>
                <span className="text-xs text-slate-400 font-medium">Control de Stock Físico</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Gestión de Anaqueles Compartidos en Tiendas Aliadas
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Supervisión del stock físico que cada marca tiene depositado en los puntos de venta. Controla rotación y alertas de resurtido.
              </p>
            </div>

            <button
              onClick={() => handleExportInventoryCSV()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar Inventario CSV</span>
            </button>
          </div>

          {/* Feedback banner */}
          {restockFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">{restockFeedback}</span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-orange-600" />
                <span>Filtrar por Tienda:</span>
              </div>
              <select
                value={inventoryStoreFilter}
                onChange={(e) => setInventoryStoreFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">Todas las tiendas aliadas ({stores.length})</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.zone})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 font-bold text-slate-700 ml-2">
                <span>Por Marca:</span>
              </div>
              <select
                value={inventoryBrandFilter}
                onChange={(e) => setInventoryBrandFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">Todas las marcas ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={inventoryOnlyLowStock}
                onChange={(e) => setInventoryOnlyLowStock(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-orange-700">⚠️ Solo mostrar stock bajo / crítico (≤ 7 pzas)</span>
            </label>
          </div>

          {/* Inventory Table */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Tienda Aliada</th>
                    <th className="py-3.5 px-4">Marca Local</th>
                    <th className="py-3.5 px-4">Producto en Anaquel</th>
                    <th className="py-3.5 px-4 text-center">Stock Actual / Capacidad</th>
                    <th className="py-3.5 px-4">Nivel en Anaquel</th>
                    <th className="py-3.5 px-4 text-center">Último Resurtido</th>
                    <th className="py-3.5 px-4 text-right">Acción de Reabastecimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStoreStock.map((item) => {
                    const store = stores.find((s) => s.id === item.storeId);
                    const brand = brands.find((b) => b.id === item.brandId);
                    const prod = products.find((p) => p.id === item.productId);
                    const isLow = item.currentStock <= 7;
                    const isFull = item.currentStock >= (item.targetMaxStock || 25);
                    const percent = Math.min(100, Math.round((item.currentStock / (item.targetMaxStock || 25)) * 100));

                    return (
                      <tr key={`${item.storeId}-${item.productId}`} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{store?.name || item.storeId}</div>
                          <span className="text-[10px] text-slate-400 font-medium">{store?.zone}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: brand?.accentColor || '#ea580c' }}
                            ></div>
                            <span className="font-bold text-slate-800">{brand?.name || item.brandId}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-800">{prod?.name || item.productId}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">SKU: {prod?.sku}</span>
                            </div>
                            {prod && (
                              <button
                                type="button"
                                onClick={() => setEditingProduct(prod)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title={`Editar producto "${prod.name}"`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-black text-sm text-slate-900 font-mono">
                            {item.currentStock} <span className="text-xs text-slate-400 font-normal">/ {item.targetMaxStock} pzas</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className={isLow ? 'text-rose-600 font-black' : 'text-slate-600'}>
                                {isLow ? '⚠️ Crítico' : isFull ? '✓ Lleno' : 'Regular'}
                              </span>
                              <span className="text-slate-500 font-mono">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLow ? 'bg-rose-500' : isFull ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                          {item.lastRestockedDate}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setStoreAdjustTarget({
                                storeId: item.storeId,
                                storeName: store?.name || item.storeId,
                                productId: item.productId,
                                productName: prod?.name || item.productId,
                                currentStock: item.currentStock,
                              });
                              setAdjustDirection('add');
                              setAdjustQtyInput(5);
                              setAdjustReasonInput('');
                              setAdjustErrorMsg(null);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Registrar ajuste auditado en el libro de movimientos"
                          >
                            <Sliders className="w-3 h-3 text-amber-400" />
                            <span>Ajustar (Kardex)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Niveles Ideales por Punto de Venta (Módulo 4) */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                    Sugerido Automático de Carga
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Módulo 4</span>
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  <span>Niveles Ideales por Punto de Venta (Anaquel Objetivo)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Define cuántas piezas ideales y mínimas debe mantener cada tienda por producto/sabor. El almacén y el chofer usan esto para armar la carga diaria automáticamente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/80 items-end">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Punto de Venta</label>
                <select
                  value={idealStoreId}
                  onChange={(e) => setIdealStoreId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.zone.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Producto / Sabor</label>
                <select
                  value={idealProductId}
                  onChange={(e) => setIdealProductId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.flavor ? `(${p.flavor})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Ideal (pzas)</label>
                  <input
                    type="number"
                    min={1}
                    value={idealQtyInput}
                    onChange={(e) => setIdealQtyInput(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={idealMinInput}
                    onChange={(e) => setIdealMinInput(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!idealStoreId || !idealProductId}
                onClick={() => {
                  if (!idealStoreId || !idealProductId) return;
                  setStoreIdealStock(idealStoreId, idealProductId, idealQtyInput, idealMinInput);
                  setRestockFeedback('Nivel ideal actualizado en el catálogo de carga sugerida.');
                  setTimeout(() => setRestockFeedback(null), 3500);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold transition cursor-pointer"
              >
                Guardar Nivel Ideal
              </button>
            </div>

            {idealStoreStock.length > 0 && (
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Punto de Venta</th>
                      <th className="py-2.5 px-4">Producto & Sabor</th>
                      <th className="py-2.5 px-4 text-center">Mínimo Alerta</th>
                      <th className="py-2.5 px-4 text-center">Nivel Ideal Objetivo</th>
                      <th className="py-2.5 px-4 text-right">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {idealStoreStock.slice(0, 12).map((ideal) => {
                      const st = stores.find((s) => s.id === ideal.storeId);
                      const pr = products.find((p) => p.id === ideal.productId);
                      return (
                        <tr key={ideal.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-bold text-slate-800">{st?.name || ideal.storeId}</td>
                          <td className="py-2.5 px-4 text-slate-700">
                            {pr?.name || ideal.productId}{' '}
                            {pr?.flavor && <span className="text-[10px] text-orange-600 font-bold">({pr.flavor})</span>}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-amber-800 font-bold">
                            {ideal.minQty ?? 3} pzas
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-emerald-700 font-black">
                            {ideal.idealQty} pzas
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-400">
                            {new Date(ideal.updatedAt).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6 (NUEVA): LIQUIDACIONES / CORTES DE CAJA */}
      {activeTab === 'settlements' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                  Cierres de Ventas & Consignación
                </span>
                <span className="text-xs text-slate-400 font-medium">Finanzas de la Red</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Conciliación de Ventas en Tiendas & Cortes de Caja
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cálculo y dispersión de comisiones (12% - 15% por logística y espacio de anaquel) y pagos netos a transferir a cada marca.
              </p>
            </div>

            <button
              onClick={() => handleExportSettlementsCSV()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar Cortes (.csv)</span>
            </button>
          </div>

          {/* Settlements Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-slate-400 text-xs font-bold block">Ventas Brutas en Tiendas</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                ${settlements.reduce((acc, s) => acc + s.grossSales, 0).toLocaleString('es-MX')} MXN
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">En las 6 tiendas aliadas</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-slate-400 text-xs font-bold block">Comisión Logística Retenida</span>
              <div className="text-2xl font-black text-orange-600 font-mono mt-1">
                ${settlements.reduce((acc, s) => acc + s.logisticsCommissionAmount, 0).toLocaleString('es-MX', { minimumFractionDigits: 1 })} MXN
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Ingreso de la red Hecho en Ags</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-slate-400 text-xs font-bold block">Neto a Liquidar a Marcas</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                ${settlements.reduce((acc, s) => acc + s.netPayableToBrand, 0).toLocaleString('es-MX', { minimumFractionDigits: 1 })} MXN
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Dispersión vía transferencia SPEI</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-slate-400 text-xs font-bold block">Estatus de Pagos</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {settlements.filter((s) => s.status === 'settled').length} / {settlements.length}
              </div>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Cortes liquidados con acuse</p>
            </div>
          </div>

          {/* Status filter bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filtrar por Estatus:</span>
            {(['all', 'pending', 'processing', 'settled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSettlementStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer capitalize ${
                  settlementStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st === 'all'
                  ? 'Todos los Cortes'
                  : st === 'pending'
                  ? 'Pendientes'
                  : st === 'processing'
                  ? 'En Dispersión'
                  : 'Liquidados'}
              </button>
            ))}
          </div>

          {/* Settlements Table */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Folio de Corte</th>
                    <th className="py-3.5 px-4">Período Semanal</th>
                    <th className="py-3.5 px-4">Marca Local</th>
                    <th className="py-3.5 px-4">Punto de Venta Aliado</th>
                    <th className="py-3.5 px-4 text-center">Unidades</th>
                    <th className="py-3.5 px-4 text-right">Venta Bruta</th>
                    <th className="py-3.5 px-4 text-right">Comisión Red</th>
                    <th className="py-3.5 px-4 text-right">Neto a Transferir</th>
                    <th className="py-3.5 px-4 text-center">Estatus</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSettlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">
                        {s.folio}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{s.period}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{s.brandName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.storeName}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                        {s.unitsSold} pzas
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${s.grossSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-bold">
                        -${s.logisticsCommissionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 block">({Math.round(s.logisticsCommissionRate * 100)}%)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                        ${s.netPayableToBrand.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            s.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {s.status === 'settled'
                            ? '✓ Liquidado'
                            : s.status === 'processing'
                            ? 'En Dispersión'
                            : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status !== 'settled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSpeiSettlementTarget(s);
                                setSpeiRefInput('SPEI-BBVA-' + Math.floor(100000 + Math.random() * 900000));
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="Marcar como pagado y registrar folio SPEI"
                            >
                              Marcar Pagado
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedSettlementForReceipt(s)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Comprobante
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: TICKETS AUDIT */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {discrepancyTickets.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Atención requerida:</strong> Hay {discrepancyTickets.length} remisión con discrepancia de producto reportada por el chofer durante la entrega.
                </span>
              </div>
              <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                En revisión por Administración
              </span>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Folio Oficial</th>
                  <th className="py-3.5 px-4">Punto de Venta</th>
                  <th className="py-3.5 px-4">Conductor</th>
                  <th className="py-3.5 px-4">Receptor</th>
                  <th className="py-3.5 px-4 text-center">Piezas</th>
                  <th className="py-3.5 px-4 text-right">Monto Valuado</th>
                  <th className="py-3.5 px-4 text-center">Firma Digital</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">{t.folio}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{t.storeName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{t.driverName}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {t.recipientName} ({t.recipientRole})
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                      {t.totalPieces} pzas
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                      ${t.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          t.status === 'delivered'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-amber-800 bg-amber-50 border-amber-300'
                        }`}
                      >
                        {t.status === 'delivered' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Verificada
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Discrepancia
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setViewingTicket(t)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                      >
                        Ver Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: CROSS SELLING LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-3">
          {crossSellingLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-slate-200/90 rounded-[24px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-orange-600">{lead.brandName}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-xs font-bold text-slate-800">{lead.storeName}</span>
                  <span className="text-[10px] text-slate-900 bg-[#D4F63D] px-2 py-0.5 rounded-full font-black">
                    {lead.action === 'sample_delivered' ? 'Muestra Entregada' : 'Interés en Pedido'}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">{lead.productName}</h4>
                <p className="text-xs text-slate-500 italic">"{lead.notes}"</p>
              </div>

              <div className="text-right flex-shrink-0 text-xs">
                <span className="text-slate-500 block font-mono">
                  Registrado por: <strong className="text-slate-900">{lead.driverName}</strong>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(lead.createdAt).toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 9: ALMACÉN Y AUDITORÍA (ROL 2 - SUPERVISIÓN SUPER ADMIN) */}
      {activeTab === 'warehouse' && (
        <WarehouseView />
      )}

      {/* TAB: TRAZABILIDAD POR REPARTIDOR (ROL ADMIN HECHO EN AGS) */}
      {activeTab === 'driver_traceability' && (
        <DriverTraceabilityTab />
      )}

      {/* TAB 10: SEGURIDAD, USUARIOS & BITÁCORA DE AUDITORÍA (MÓDULO 6) */}
      {activeTab === 'security_audit' && (
        <div className="space-y-6">
          {/* Security Policy Banner */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full">
                  Seguridad & Control de Acceso
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Cifrado SHA-256 Unidireccional
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Gestión de Cuentas, Supervisión Auditada y Bitácora Inmutable
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ninguna contraseña se almacena ni lee en texto plano. Puedes emitir contraseñas temporales de un solo uso, bloquear accesos o entrar en modo supervisión dejando registro automático.
              </p>
            </div>
          </div>

          {/* Users & Access Control Table */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-600" />
                <span>Usuarios del Sistema ({users.length})</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Aislamiento estricto por rol y marca
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Usuario / Nombre</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Alcance / Marca</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Seguridad Hash</th>
                    <th className="py-3 px-4 text-right">Acciones Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const userBrand = u.brandId ? brands.find((b) => b.id === u.brandId) : null;
                    const isSelf = currentUser?.id === u.id;
                    const isBlocked = u.status === 'blocked';

                    return (
                      <tr key={u.id} className={isBlocked ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'}>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{u.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {userBrand ? userBrand.name : u.role === 'admin' ? 'Acceso Global' : u.driverZone || 'Bodega Central'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isBlocked ? 'Bloqueado' : 'Activo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              SHA-256 Protegido
                            </span>
                            {u.mustChangePassword && (
                              <span className="text-[9px] text-amber-700 font-bold mt-0.5">
                                Temp. pendiente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleResetTempPassword(u.id, u.username, u.name)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Temp.</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => toggleUserStatus(u.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-40 inline-flex items-center gap-1 ${
                                isBlocked
                                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                              }`}
                            >
                              {isBlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              <span>{isBlocked ? 'Activar' : 'Bloquear'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSelf || isBlocked}
                              onClick={() => impersonateUser(u.id)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <ArrowUpRight className="w-3 h-3 text-amber-400" />
                              <span>Entrar como</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Log Trail */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Bitácora de Auditoría de Acciones ({auditLogs.length})</span>
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar actor, objetivo o detalle..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="bg-[#F8FAFC] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Todas las acciones</option>
                  <option value="login_success">Inicios de sesión</option>
                  <option value="login_blocked">Intentos bloqueados</option>
                  <option value="password_reset">Reseteos de contraseña</option>
                  <option value="user_status_change">Bloqueos / Activaciones</option>
                  <option value="impersonation_start">Supervisión (Entrar como)</option>
                  <option value="manual_adjustment">Ajustes manuales Kardex</option>
                  <option value="van_reconciled">Liquidaciones de camioneta</option>
                  <option value="csv_bulk_import">Importaciones CSV</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Objetivo</th>
                    <th className="py-3 px-4">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs
                    .filter((log) => {
                      if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
                      if (auditSearch.trim()) {
                        const q = auditSearch.toLowerCase();
                        return (
                          log.actorName.toLowerCase().includes(q) ||
                          log.targetLabel.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-900">{log.actorName}</span>
                          <span className="text-[10px] text-slate-400 uppercase block">{log.actorRole}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{log.targetLabel}</td>
                        <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Temporary Password Modal (Módulo 6) */}
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Contraseña Temporal Generada</h4>
                <p className="text-xs text-slate-500">
                  Para <strong>{tempPasswordModal.userName}</strong> (@{tempPasswordModal.username})
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-amber-900 block">
                Se muestra UNA sola vez. Compártela por canal seguro y recuerda al usuario cambiarla:
              </span>
              <div className="flex items-center justify-between gap-2 bg-white border border-amber-300 rounded-xl px-3.5 py-2.5">
                <code className="font-mono text-base font-black text-slate-900 select-all">
                  {tempPasswordModal.tempPassword}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(tempPasswordModal.tempPassword);
                    setCopiedTempPass(true);
                    setTimeout(() => setCopiedTempPass(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedTempPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTempPass ? 'Copiada' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTempPasswordModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immutable Store Kardex Adjustment Modal (Módulo 1) */}
      {storeAdjustTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmStoreAdjustment}
            className="bg-white border border-slate-200 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                Movimiento Auditado · Kardex
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mt-1.5">
                Ajuste en Anaquel: {storeAdjustTarget.storeName}
              </h4>
              <p className="text-xs text-slate-500">
                Producto: <strong className="text-slate-800">{storeAdjustTarget.productName}</strong> · Stock actual:{' '}
                <strong className="font-mono">{storeAdjustTarget.currentStock} pzas</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustDirection('add')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  adjustDirection === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                + Sumar al anaquel
              </button>
              <button
                type="button"
                onClick={() => setAdjustDirection('remove')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  adjustDirection === 'remove'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                - Descontar de anaquel
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad de piezas</label>
              <input
                type="number"
                min={1}
                value={adjustQtyInput}
                onChange={(e) => setAdjustQtyInput(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo obligatorio del ajuste (mín. 5 caracteres)
              </label>
              <textarea
                rows={3}
                value={adjustReasonInput}
                onChange={(e) => setAdjustReasonInput(e.target.value)}
                placeholder="Ej. Conteo físico presencial por diferencia en exhibidor..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                required
              />
            </div>

            {adjustErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {adjustErrorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoreAdjustTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer"
              >
                Registrar Movimiento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline SPEI Settlement Confirmation Modal (replaces prompt) */}
      {speiSettlementTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!speiRefInput.trim()) return;
              updateSettlementStatus(speiSettlementTarget.id, 'settled', speiRefInput.trim());
              setSpeiSettlementTarget(null);
            }}
            className="bg-white border border-slate-200 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full">
                Confirmar Liquidación SPEI
              </span>
              <h4 className="text-base font-extrabold text-slate-900 mt-1.5">
                {speiSettlementTarget.brandName} · {speiSettlementTarget.folio}
              </h4>
              <p className="text-xs text-slate-500">
                Neto a dispersar:{' '}
                <strong className="font-mono text-emerald-700">
                  ${speiSettlementTarget.netPayableToBrand.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clave de rastreo SPEI / Folio BBVA o Banorte
              </label>
              <input
                type="text"
                value={speiRefInput}
                onChange={(e) => setSpeiRefInput(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSpeiSettlementTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
              >
                Confirmar Pago SPEI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Viewer Modal */}
      {viewingTicket && (
        <TicketReceiptModal
          ticket={viewingTicket}
          store={stores.find((s) => s.id === viewingTicket.storeId)}
          onClose={() => setViewingTicket(null)}
        />
      )}

      {/* Settlement Receipt Modal */}
      {selectedSettlementForReceipt && (
        <SettlementReceiptModal
          settlement={selectedSettlementForReceipt}
          onClose={() => setSelectedSettlementForReceipt(null)}
        />
      )}

      {/* Brand Products Catalog Modal */}
      {selectedBrandForProducts && (
        <BrandProductsModal
          brand={selectedBrandForProducts}
          onClose={() => setSelectedBrandForProducts(null)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          brandName={brands.find((b) => b.id === editingProduct.brandId)?.name}
          onClose={() => setEditingProduct(null)}
          onSaved={() => setEditingProduct(null)}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {deletingProduct && (
        <DeleteProductConfirmModal
          product={deletingProduct}
          brandName={brands.find((b) => b.id === deletingProduct.brandId)?.name}
          onClose={() => setDeletingProduct(null)}
          onDeleted={() => setDeletingProduct(null)}
        />
      )}

      {/* Smart Route Generator Modal */}
      {isSmartRouteGeneratorModalOpen && (
        <SmartRouteGeneratorModal
          onClose={() => setIsSmartRouteGeneratorModalOpen(false)}
        />
      )}

      {/* Bulk CSV Import Modal (Módulo 4) */}
      {csvModalMode && (
        <BulkCsvImportModal
          mode={csvModalMode}
          onClose={() => setCsvModalMode(null)}
        />
      )}
    </div>
  );
};
