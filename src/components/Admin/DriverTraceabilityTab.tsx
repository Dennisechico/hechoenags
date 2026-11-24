import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Building2,
  Package,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Search,
  Filter,
  Download,
  Info,
  Clock,
  ShieldCheck,
  Eye,
  FileText,
  Boxes,
  Store,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Edit3,
  Check,
} from 'lucide-react';
import { DeliveryTicket, VanLoadingDispatch, VanReturnReconciliation, DiscrepancyAuditRecord } from '../../types';
import { TicketReceiptModal } from '../Common/TicketReceiptModal';

export const DriverTraceabilityTab: React.FC = () => {
  const {
    currentUser,
    users,
    brands,
    products,
    routes,
    stores,
    storeStock,
    tickets,
    dispatches,
    reconciliations,
    discrepancies,
    recordInventoryMovement,
    showToast,
  } = useApp();

  // Filters state
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [timeViewMode, setTimeViewMode] = useState<'day' | 'month' | 'all'>('day');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-16'); // Default to operational demo date
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // October 2026
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'all_summary' | 'warehouse_stock' | 'van_loading' | 'brand_deliveries' | 'shelf_returns'>('all_summary');

  // Selected ticket for viewing receipt modal
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<DeliveryTicket | null>(null);

  // Immutable adjustment modal state
  const [editingStockProduct, setEditingStockProduct] = useState<{ id: string; name: string; current: number } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Drivers list
  const driverUsers = useMemo(() => users.filter((u) => u.role === 'driver'), [users]);

  // Filtered driver
  const currentDriver = useMemo(() => {
    if (selectedDriverId === 'all') return null;
    return driverUsers.find((d) => d.id === selectedDriverId) || null;
  }, [selectedDriverId, driverUsers]);

  // Filtered products by brand & search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedBrandId !== 'all' && p.brandId !== selectedBrandId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = p.sku.toLowerCase().includes(query);
        const brand = brands.find((b) => b.id === p.brandId);
        const matchesBrand = brand?.name.toLowerCase().includes(query);
        return matchesName || matchesSku || matchesBrand;
      }
      return true;
    });
  }, [products, selectedBrandId, searchQuery, brands]);

  // 1. Stock en bodega central para la selección actual
  const totalCentralWarehouseStock = useMemo(() => {
    return filteredProducts.reduce((acc, p) => acc + (p.centralWarehouseStock || 0), 0);
  }, [filteredProducts]);

  const lowStockWarehouseCount = useMemo(() => {
    return filteredProducts.filter((p) => (p.centralWarehouseStock || 0) <= (p.minStockAlert || 50)).length;
  }, [filteredProducts]);

  // 2. Dispatches (Cargas de camioneta) filtradas por chofer, ruta y fecha
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((disp) => {
      if (selectedDriverId !== 'all' && disp.driverId !== selectedDriverId) return false;
      if (selectedRouteId !== 'all' && disp.routeId !== selectedRouteId) return false;
      if (timeViewMode === 'day') {
        if (disp.date !== selectedDate) return false;
      } else if (timeViewMode === 'month') {
        if (!disp.date.startsWith(selectedMonth)) return false;
      }
      return true;
    });
  }, [dispatches, selectedDriverId, selectedRouteId, timeViewMode, selectedDate, selectedMonth]);

  // Carga total de camioneta desglosada
  const { totalPiecesLoaded, loadedItemsFiltered } = useMemo(() => {
    let pieces = 0;
    const items: Array<{
      dispatchFolio: string;
      routeCode: string;
      date: string;
      driverName: string;
      productId: string;
      productName: string;
      brandId: string;
      brandName: string;
      loadedQty: number;
      unitPrice: number;
    }> = [];

    filteredDispatches.forEach((disp) => {
      disp.items.forEach((item) => {
        if (selectedBrandId !== 'all' && item.brandId !== selectedBrandId) return;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !item.productName.toLowerCase().includes(q) &&
            !item.brandName.toLowerCase().includes(q)
          ) {
            return;
          }
        }
        pieces += item.loadedQty;
        items.push({
          dispatchFolio: disp.folio,
          routeCode: disp.routeCode,
          date: disp.date,
          driverName: disp.driverName,
          productId: item.productId,
          productName: item.productName,
          brandId: item.brandId,
          brandName: item.brandName,
          loadedQty: item.loadedQty,
          unitPrice: item.unitPrice,
        });
      });
    });

    return { totalPiecesLoaded: pieces, loadedItemsFiltered: items };
  }, [filteredDispatches, selectedBrandId, searchQuery]);

  // 3. Entregas / Remisiones ("Cuánto producto dejó de cierta marca por día y por mes")
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedDriverId !== 'all' && t.driverId !== selectedDriverId) return false;
      if (selectedRouteId !== 'all' && t.routeId !== selectedRouteId) return false;

      // Filter by brand if selected
      if (selectedBrandId !== 'all') {
        const hasBrand = t.brandIds.includes(selectedBrandId) || t.items.some((i) => i.brandId === selectedBrandId);
        if (!hasBrand) return false;
      }

      // Filter by time period
      const ticketDate = t.timestamp ? t.timestamp.split('T')[0] : '';
      if (timeViewMode === 'day') {
        if (ticketDate !== selectedDate) return false;
      } else if (timeViewMode === 'month') {
        if (!ticketDate.startsWith(selectedMonth)) return false;
      }

      return true;
    });
  }, [tickets, selectedDriverId, selectedRouteId, selectedBrandId, timeViewMode, selectedDate, selectedMonth]);

  // Items entregados desglosados
  const deliveredBreakdown = useMemo(() => {
    let pieces = 0;
    let totalVal = 0;
    const itemsList: Array<{
      ticketFolio: string;
      date: string;
      time: string;
      storeName: string;
      driverName: string;
      recipientName: string;
      productId: string;
      productName: string;
      brandId: string;
      brandName: string;
      quantity: number;
      subtotal: number;
      ticketObj: DeliveryTicket;
    }> = [];

    // Grouping by brand & product for monthly summary
    const productAggregation: Record<string, {
      productId: string;
      productName: string;
      brandName: string;
      totalDelivered: number;
      totalMXN: number;
      storesCount: Set<string>;
    }> = {};

    filteredTickets.forEach((t) => {
      const datePart = t.timestamp ? t.timestamp.split('T')[0] : '';
      const timePart = t.timestamp ? t.timestamp.split('T')[1]?.substring(0, 5) || '' : '';

      t.items.forEach((item) => {
        if (selectedBrandId !== 'all' && item.brandId !== selectedBrandId) return;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !item.productName.toLowerCase().includes(q) &&
            !item.brandName.toLowerCase().includes(q) &&
            !t.storeName.toLowerCase().includes(q)
          ) {
            return;
          }
        }

        pieces += item.quantity;
        totalVal += item.subtotal;

        itemsList.push({
          ticketFolio: t.folio,
          date: datePart,
          time: timePart,
          storeName: t.storeName,
          driverName: t.driverName,
          recipientName: t.recipientName,
          productId: item.productId,
          productName: item.productName,
          brandId: item.brandId,
          brandName: item.brandName,
          quantity: item.quantity,
          subtotal: item.subtotal,
          ticketObj: t,
        });

        // Aggregation for monthly view
        if (!productAggregation[item.productId]) {
          productAggregation[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            brandName: item.brandName,
            totalDelivered: 0,
            totalMXN: 0,
            storesCount: new Set<string>(),
          };
        }
        productAggregation[item.productId].totalDelivered += item.quantity;
        productAggregation[item.productId].totalMXN += item.subtotal;
        productAggregation[item.productId].storesCount.add(t.storeId);
      });
    });

    return {
      totalPiecesDelivered: pieces,
      totalDeliveredValue: totalVal,
      deliveredItems: itemsList,
      monthlyProductAggregation: Object.values(productAggregation),
    };
  }, [filteredTickets, selectedBrandId, searchQuery]);

  // 4. Retornos por espacio lleno ("Cuánto devolvió si no hacía falta dejar en algún punto de venta específico porque aún había producto")
  const shelfReturnEvents = useMemo(() => {
    // Collect from discrepancies where discrepancyType === 'espacio_lleno' or 'conteo_diferencia'
    const matchingDiscrepancies = discrepancies.filter((d) => {
      // Must be full shelf / no excess needed
      const isShelfFullOrLimit = d.discrepancyType === 'espacio_lleno';
      if (!isShelfFullOrLimit) return false;

      if (selectedDriverId !== 'all') {
        const driver = driverUsers.find((dr) => dr.id === selectedDriverId);
        if (driver && !d.driverName.toLowerCase().includes(driver.name.toLowerCase().split(' ')[0])) {
          return false;
        }
      }

      if (selectedBrandId !== 'all') {
        const brand = brands.find((b) => b.id === selectedBrandId);
        if (brand && !d.brandName.toLowerCase().includes(brand.name.toLowerCase())) {
          return false;
        }
      }

      if (timeViewMode === 'day') {
        if (d.date !== selectedDate) return false;
      } else if (timeViewMode === 'month') {
        if (!d.date.startsWith(selectedMonth)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !d.storeName.toLowerCase().includes(q) &&
          !d.productName.toLowerCase().includes(q) &&
          !d.brandName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    // Also collect physical returns from van reconciliations
    const matchingReconciliations = reconciliations.filter((rec) => {
      if (selectedDriverId !== 'all') {
        const driver = driverUsers.find((dr) => dr.id === selectedDriverId);
        if (driver && !rec.driverName.toLowerCase().includes(driver.name.toLowerCase().split(' ')[0])) {
          return false;
        }
      }
      const recDate = rec.reconciledAt ? rec.reconciledAt.split('T')[0] : '';
      if (timeViewMode === 'day' && recDate !== selectedDate) return false;
      if (timeViewMode === 'month' && !recDate.startsWith(selectedMonth)) return false;
      return true;
    });

    let totalReturnedPieces = 0;
    matchingDiscrepancies.forEach((d) => {
      totalReturnedPieces += d.discrepancyQty;
    });

    // If matching reconciliations have returned items
    matchingReconciliations.forEach((r) => {
      r.returnedItems.forEach((ri) => {
        if (selectedBrandId !== 'all') {
          const brand = brands.find((b) => b.id === selectedBrandId);
          if (brand && !ri.brandName.toLowerCase().includes(brand.name.toLowerCase())) {
            return;
          }
        }
        totalReturnedPieces += ri.returnedPhysicalQty;
      });
    });

    return {
      totalReturnedPieces,
      discrepancyEvents: matchingDiscrepancies,
      reconciliationEvents: matchingReconciliations,
    };
  }, [discrepancies, reconciliations, selectedDriverId, driverUsers, selectedBrandId, brands, timeViewMode, selectedDate, selectedMonth, searchQuery]);

  // Handler for immutable inventory adjustment (Super Admin + mandatory reason)
  const handleSaveStock = () => {
    if (!editingStockProduct) return;
    setAdjustError(null);

    if (currentUser?.role !== 'admin') {
      setAdjustError('Solo el Super Administrador puede registrar movimientos de Ajuste.');
      return;
    }

    const diff = Math.round(newStockValue) - editingStockProduct.current;
    if (diff === 0) {
      setAdjustError('La cantidad física es igual al saldo actual. No hay ajuste que registrar.');
      return;
    }
    if (adjustReason.trim().length < 5) {
      setAdjustError('Debes indicar un motivo obligatorio de al menos 5 caracteres.');
      return;
    }

    const res = recordInventoryMovement({
      type: 'ajuste',
      fromLocation:
        diff > 0
          ? { type: 'external', id: 'audit-adjust', label: 'Corrección Positiva Conteo' }
          : { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
      toLocation:
        diff > 0
          ? { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' }
          : { type: 'loss', id: 'audit-adjust', label: 'Corrección Negativa Conteo' },
      productId: editingStockProduct.id,
      quantity: Math.abs(diff),
      reason: adjustReason.trim(),
    });

    if (!res.success) {
      setAdjustError(res.message);
      return;
    }

    setEditingStockProduct(null);
    setAdjustReason('');
    setAdjustError(null);
  };

  // Export full traceability CSV
  const handleExportCSV = () => {
    const headers = [
      'Folio',
      'Tipo Registro',
      'Fecha',
      'Repartidor',
      'Ruta / Punto de Entrega',
      'Marca',
      'Producto',
      'Cantidad',
      'Estatus / Motivo',
    ];

    const rows: string[][] = [];

    // Add Dispatches (Cargas)
    loadedItemsFiltered.forEach((item) => {
      rows.push([
        item.dispatchFolio,
        'CARGA INICIAL CAMIONETA',
        item.date,
        item.driverName,
        item.routeCode,
        item.brandName,
        item.productName,
        item.loadedQty.toString(),
        'Despachado en Almacén',
      ]);
    });

    // Add Deliveries (Dejado en Tienda)
    deliveredBreakdown.deliveredItems.forEach((item) => {
      rows.push([
        item.ticketFolio,
        'ENTREGA EFECTIVA',
        item.date,
        item.driverName,
        item.storeName,
        item.brandName,
        item.productName,
        item.quantity.toString(),
        `Recibido por ${item.recipientName}`,
      ]);
    });

    // Add Returns (Devuelto por Anaquel Lleno)
    shelfReturnEvents.discrepancyEvents.forEach((item) => {
      rows.push([
        item.ticketFolio,
        'RETORNO POR ANAQUEL LLENO',
        item.date,
        item.driverName,
        item.storeName,
        item.brandName,
        item.productName,
        item.discrepancyQty.toString(),
        'No hizo falta dejar: ' + item.notes,
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trazabilidad_Repartidor_${selectedDate}_Ags.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Reporte de trazabilidad descargado en CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-[28px] p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase bg-[#D4F63D] text-slate-900 px-2 py-0.5 rounded-full">
                  Control por Repartidor
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300 font-medium">
                  Bodega Central, Cargas de Camioneta, Entregas y Retornos
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-1">
                Trazabilidad Integral por Repartidor & Marcas
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Supervisa el stock en bodega, cuánto cargó cada unidad en ruta, cuánto dejó por marca (día/mes) y cuánto devolvió por prevención de sobre-stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar Reporte (.csv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters for Driver, Route, Brand, and Day/Month */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Filtros Operativos de Trazabilidad
            </span>
          </div>

          {/* Temporal Toggle: Day vs Month vs All */}
          <div className="flex items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl p-1 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setTimeViewMode('day')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                timeViewMode === 'day'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3 text-orange-400" />
              <span>Por Día</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeViewMode('month')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                timeViewMode === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Por Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeViewMode('all')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                timeViewMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Historial Completo</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Selector de Repartidor */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Repartidor / Conductor:
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">Todos los Repartidores</option>
              {driverUsers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.driverZone ? `(${d.driverZone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selector de Ruta */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Ruta Logística:
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">Todas las Rutas Zonificadas</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Selector de Marca Específica */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Marca Local Específica:
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">Todas las Marcas Aliadas ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.originLocation})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Selector de Día o Mes */}
          <div>
            {timeViewMode === 'day' ? (
              <>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Fecha Específica del Día:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </>
            ) : timeViewMode === 'month' ? (
              <>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Mes de Operación:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="2026-10">Octubre 2026</option>
                  <option value="2026-11">Noviembre 2026</option>
                  <option value="2026-09">Septiembre 2026</option>
                </select>
              </>
            ) : (
              <>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Búsqueda por SKU o Producto:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej. trufas, cerveza..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active Driver Pill Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Repartidor activo:</span>
            <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
              {currentDriver ? currentDriver.name : 'Todos los repartidores (Consolidado)'}
            </span>
            {currentDriver && (
              <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                Unidad: Camioneta RAM ProMaster (Placas AF-3942-B)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Filtrando por: <strong>{selectedBrandId === 'all' ? 'Todas las marcas' : brands.find((b) => b.id === selectedBrandId)?.name}</strong></span>
            <span>·</span>
            <span>Período: <strong>{timeViewMode === 'day' ? selectedDate : timeViewMode === 'month' ? selectedMonth : 'Todo el histórico'}</strong></span>
          </div>
        </div>
      </div>

      {/* 4 CORE METRIC CARDS REQUIRED BY USER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stock en Bodega Central */}
        <div
          onClick={() => setActiveSection('warehouse_stock')}
          className={`p-5 rounded-[24px] border transition cursor-pointer shadow-xs flex flex-col justify-between ${
            activeSection === 'warehouse_stock'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>1. Stock en Bodega Central</span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {totalCentralWarehouseStock}
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                piezas disponibles
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {selectedBrandId === 'all'
                ? `Total en almacén central (${filteredProducts.length} SKUs)`
                : `Stock disponible de ${brands.find((b) => b.id === selectedBrandId)?.name}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Alertas mínimas:</span>
            <span className={`font-bold ${lowStockWarehouseCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowStockWarehouseCount} SKUs bajo alerta
            </span>
          </div>
        </div>

        {/* Metric 2: Carga Inicial a Camioneta */}
        <div
          onClick={() => setActiveSection('van_loading')}
          className={`p-5 rounded-[24px] border transition cursor-pointer shadow-xs flex flex-col justify-between ${
            activeSection === 'van_loading'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>2. Carga en Camioneta</span>
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {totalPiecesLoaded}
              </span>
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                piezas cargadas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Se llevó el repartidor en la ruta seleccionada
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Despachos:</span>
            <span className="font-bold text-blue-700">
              {filteredDispatches.length} órdenes de salida
            </span>
          </div>
        </div>

        {/* Metric 3: Producto Dejado por Marca (Día / Mes) */}
        <div
          onClick={() => setActiveSection('brand_deliveries')}
          className={`p-5 rounded-[24px] border transition cursor-pointer shadow-xs flex flex-col justify-between ${
            activeSection === 'brand_deliveries'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>3. Producto Dejado en Tiendas</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {deliveredBreakdown.totalPiecesDelivered}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                piezas entregadas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Dejado de la marca en {timeViewMode === 'day' ? 'el día' : timeViewMode === 'month' ? 'el mes' : 'el período'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Remisiones firmadas:</span>
            <span className="font-bold text-emerald-700">
              {filteredTickets.length} puntos surtidos
            </span>
          </div>
        </div>

        {/* Metric 4: Retornos a Bodega por Anaquel Lleno (Sin Sobre-Stock) */}
        <div
          onClick={() => setActiveSection('shelf_returns')}
          className={`p-5 rounded-[24px] border transition cursor-pointer shadow-xs flex flex-col justify-between ${
            activeSection === 'shelf_returns'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>4. Devuelto por Anaquel Lleno</span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-950 tracking-tight">
                {shelfReturnEvents.totalReturnedPieces}
              </span>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                piezas devueltas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              No hizo falta dejar por stock previo en anaquel
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Regla sobre-stock:</span>
            <span className="font-bold text-purple-700">
              Reingresadas a bodega central
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSection('all_summary')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'all_summary'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>Vista Consolidada (4 Dimensiones)</span>
        </button>
        <button
          onClick={() => setActiveSection('warehouse_stock')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'warehouse_stock'
              ? 'bg-amber-500 text-slate-900 font-black shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>1. Stock en Bodega ({totalCentralWarehouseStock} pzas)</span>
        </button>
        <button
          onClick={() => setActiveSection('van_loading')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'van_loading'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>2. Cargas en Camioneta ({totalPiecesLoaded} pzas)</span>
        </button>
        <button
          onClick={() => setActiveSection('brand_deliveries')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'brand_deliveries'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>3. Entregas por Marca ({deliveredBreakdown.totalPiecesDelivered} pzas)</span>
        </button>
        <button
          onClick={() => setActiveSection('shelf_returns')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'shelf_returns'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>4. Retornos por Espacio Lleno ({shelfReturnEvents.totalReturnedPieces} pzas)</span>
        </button>
      </div>

      {/* DETAIL VIEW 1: Stock en Bodega Central */}
      {(activeSection === 'all_summary' || activeSection === 'warehouse_stock') && (
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>1. Stock Disponible en Bodega Central de Hecho en Aguascalientes</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Inventario central bajo resguardo en el centro de acopio antes de despachar a unidades de reparto.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Total en almacén:</span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-lg font-mono">
                {totalCentralWarehouseStock} piezas
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">SKU & Producto</th>
                  <th className="py-2.5 px-3">Marca Local</th>
                  <th className="py-2.5 px-3 text-center">Unidad</th>
                  <th className="py-2.5 px-3 text-right">Costo Consignación</th>
                  <th className="py-2.5 px-3 text-center">Stock en Bodega Central</th>
                  <th className="py-2.5 px-3 text-center">Alerta Mínima</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const brand = brands.find((b) => b.id === p.brandId);
                  const isLow = (p.centralWarehouseStock || 0) <= (p.minStockAlert || 50);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{brand?.name || 'Marca'}</span>
                        <div className="text-[10px] text-slate-400">{brand?.originLocation}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {p.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        ${p.costPrice} MXN
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                          {p.centralWarehouseStock}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {p.minStockAlert} pzas
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                            Stock Bajo (Alerta)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setEditingStockProduct({ id: p.id, name: p.name, current: p.centralWarehouseStock });
                            setNewStockValue(p.centralWarehouseStock);
                            setAdjustReason('');
                            setAdjustError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Edit3 className="w-3 h-3 text-slate-400" />
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
      )}

      {/* DETAIL VIEW 2: Carga en Camioneta ("Cuánto se llevó el repartidor en cierta ruta") */}
      {(activeSection === 'all_summary' || activeSection === 'van_loading') && (
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>2. Carga Inicial de Camioneta por Ruta y Repartidor</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Inventario de salida verificado en andén de acopio que subió a la camioneta de reparto antes del inicio de la ruta.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Piezas cargadas a camioneta:</span>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-black rounded-lg font-mono">
                {totalPiecesLoaded} piezas
              </span>
            </div>
          </div>

          {loadedItemsFiltered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se registran órdenes de carga de camioneta para los filtros seleccionados (Fecha: {timeViewMode === 'day' ? selectedDate : selectedMonth}).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Folio Despacho</th>
                    <th className="py-2.5 px-3">Ruta Asignada</th>
                    <th className="py-2.5 px-3">Repartidor</th>
                    <th className="py-2.5 px-3">Marca Local</th>
                    <th className="py-2.5 px-3">Producto Cargado</th>
                    <th className="py-2.5 px-3 text-center">Piezas que se Llevó</th>
                    <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                    <th className="py-2.5 px-3 text-right">Valuación en Tránsito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadedItemsFiltered.map((item, idx) => (
                    <tr key={`${item.dispatchFolio}-${item.productId}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {item.dispatchFolio}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
                          {item.routeCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.driverName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {item.brandName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-blue-900 bg-blue-50/70 rounded-xl">
                        {item.loadedQty} pzas
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ${item.unitPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${item.loadedQty * item.unitPrice} MXN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL VIEW 3: Producto Dejado por Marca (Día vs Mes) */}
      {(activeSection === 'all_summary' || activeSection === 'brand_deliveries') && (
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>3. Producto Dejado de la Marca en Puntos de Venta (Día y Mes)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Desglose puntual de unidades entregadas en consignación con firma digital del encargado del establecimiento.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Total entregado:</span>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black rounded-lg font-mono">
                {deliveredBreakdown.totalPiecesDelivered} piezas (${deliveredBreakdown.totalDeliveredValue.toLocaleString()} MXN)
              </span>
            </div>
          </div>

          {/* If month view is active, show the monthly product aggregation first */}
          {timeViewMode === 'month' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-600" />
                  <span>Consolidado Mensual de Entregas por Producto ({selectedMonth})</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {deliveredBreakdown.monthlyProductAggregation.length} productos con movimiento en el mes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveredBreakdown.monthlyProductAggregation.map((agg) => (
                  <div key={agg.productId} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-orange-600">{agg.brandName}</span>
                      <span className="text-[10px] font-mono text-slate-400">{agg.storesCount.size} tiendas</span>
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 mt-1 truncate">
                      {agg.productName}
                    </div>
                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-base font-black text-slate-900 font-mono">
                        {agg.totalDelivered} <span className="text-xs font-normal text-slate-500">pzas en el mes</span>
                      </span>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        ${agg.totalMXN.toLocaleString()} MXN
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed table of delivery events */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Remisión</th>
                  <th className="py-2.5 px-3">Punto de Venta Aliado</th>
                  <th className="py-2.5 px-3">Marca Local</th>
                  <th className="py-2.5 px-3">Producto Dejado</th>
                  <th className="py-2.5 px-3 text-center">Piezas Dejadas</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Receptor & Firma</th>
                  <th className="py-2.5 px-3 text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveredBreakdown.deliveredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No hay registros de entrega para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  deliveredBreakdown.deliveredItems.map((item, idx) => (
                    <tr key={`${item.ticketFolio}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {item.ticketFolio}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.storeName}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.brandName}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-emerald-900 bg-emerald-50/70 rounded-xl">
                        {item.quantity} pzas
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${item.subtotal} MXN
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {item.date} {item.time ? `· ${item.time} hrs` : ''}
                      </td>
                      <td className="py-3 px-3 text-slate-700 text-[11px]">
                        <span className="font-semibold block">{item.recipientName}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">✓ Firma capturada</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedTicketForModal(item.ticketObj)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL VIEW 4: Retornos a Bodega por Anaquel Lleno ("Cuánto devolvió si no hacía falta dejar en algún punto de venta específico porque aún había producto") */}
      {(activeSection === 'all_summary' || activeSection === 'shelf_returns') && (
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-700" />
                <span>4. Retornos a Bodega por Espacio Lleno (Regla de Surtido Óptimo sin Sobre-Stock)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Mercancía no entregada porque en el punto de venta aún había producto en exhibición. Devuelta físicamente a bodega central.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Total devuelto a bodega:</span>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-black rounded-lg font-mono">
                {shelfReturnEvents.totalReturnedPieces} piezas
              </span>
            </div>
          </div>

          {/* Operational Rule Explain Callout */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
            <div>
              <span className="font-extrabold block">Fórmula de Prevención de Sobre-Stock:</span>
              <p className="text-[11px] text-purple-800 font-mono mt-0.5">
                Piezas a Surtir = Capacidad Máxima Anaquel - Stock Actual Detectado
              </p>
              <p className="text-[11px] text-purple-700 mt-1 leading-relaxed">
                Cuando el repartidor llega al punto de venta y detecta que el anaquel ya tiene stock suficiente, no fuerza la entrega para evitar merma y caducidad. Las piezas restantes se registran como retorno físico y reingresan al inventario de bodega central auditadas por la Administración de Almacén.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Folio Auditoría</th>
                  <th className="py-2.5 px-3">Punto de Venta Específico</th>
                  <th className="py-2.5 px-3">Marca Local</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3 text-center">Previsto</th>
                  <th className="py-2.5 px-3 text-center">Entregado</th>
                  <th className="py-2.5 px-3 text-center font-bold text-purple-900">Devuelto a Bodega</th>
                  <th className="py-2.5 px-3">Motivo / Condición de Anaquel</th>
                  <th className="py-2.5 px-3 text-center">Reintegración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shelfReturnEvents.discrepancyEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No se registraron retornos por espacio lleno en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  shelfReturnEvents.discrepancyEvents.map((disc) => (
                    <tr key={disc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-purple-700">
                        {disc.ticketFolio}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {disc.storeName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {disc.brandName}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {disc.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {disc.expectedQty} pzas
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-800 font-bold">
                        {disc.deliveredQty} pzas
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-black text-sm text-purple-900 bg-purple-100 px-2.5 py-1 rounded-xl">
                          +{disc.discrepancyQty} pzas
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs">
                        <span className="font-semibold text-slate-800 block">Anaquel con stock previo</span>
                        <span className="text-slate-500 line-clamp-2">{disc.notes}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Reingresado
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Movimiento de Ajuste en Bodega Central (Inmutable) */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-200 max-w-md w-full p-5 shadow-2xl animate-in fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Registrar Movimiento de Ajuste (Kardex)</h3>
              </div>
              <button
                onClick={() => setEditingStockProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                {adjustError}
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 font-medium">Producto a conciliar:</p>
              <h4 className="text-sm font-extrabold text-slate-900">{editingStockProduct.name}</h4>
              <p className="text-xs text-amber-700 font-semibold mt-1">
                Saldo actual calculado por movimientos: {editingStockProduct.current} piezas
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Conteo físico final en bodega:
              </label>
              <input
                type="number"
                min={0}
                value={newStockValue}
                onChange={(e) => setNewStockValue(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                Diferencia a registrar: {newStockValue - editingStockProduct.current >= 0 ? '+' : ''}
                {newStockValue - editingStockProduct.current} pzas
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Motivo obligatorio del ajuste <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej. Conteo cíclico mensual confirmado por auditoría"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStockProduct(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStock}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Registrar Ajuste en Kardex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Receipt Modal when clicking on any ticket */}
      {selectedTicketForModal && (
        <TicketReceiptModal
          ticket={selectedTicketForModal}
          store={stores.find((s) => s.id === selectedTicketForModal.storeId)}
          onClose={() => setSelectedTicketForModal(null)}
        />
      )}
    </div>
  );
};
