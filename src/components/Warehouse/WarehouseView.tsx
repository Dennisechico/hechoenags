import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BarcodeScannerModal } from '../Common/BarcodeScannerModal';
import {
  Boxes,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  Search,
  Layers,
  Save,
  ClipboardCheck,
  Building2,
  MapPin,
  Calendar,
  Zap,
  QrCode,
  Sparkles,
  History,
  PlusCircle,
  Lock,
  Camera,
  ShieldAlert,
} from 'lucide-react';
import {
  DiscrepancyAuditRecord,
  MovementType,
  LocationRef,
} from '../../types';

export const WarehouseView: React.FC = () => {
  const {
    currentUser,
    products,
    brands,
    stores,
    routes,
    users,
    dispatches,
    openDispatchForDriver,
    dispatchVan,
    reconciliations,
    recordReturnReconciliation,
    discrepancies,
    updateDiscrepancyStatus,
    platformConfig,
    updatePlatformConfig,
    storeStock,
    idealStoreStock,
    movements,
    tickets,
    recordInventoryMovement,
    getSuggestedVanLoadForRoute,
    setIsSmartRouteGeneratorModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dispatches' | 'returns' | 'audit' | 'kardex' | 'config'>('dispatches');

  // ==========================================
  // TAB 1: CARGA INICIAL / APERTURA DE JORNADA
  // ==========================================
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    products.forEach((p) => {
      init[p.id] = Math.min(10, p.centralWarehouseStock);
    });
    return init;
  });
  const [dispatchNotes, setDispatchNotes] = useState(
    'Revisión en andén central. Empaques sellados y fecha de caducidad vigente.'
  );
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [showDispatchScanner, setShowDispatchScanner] = useState(false);

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const selectedDriverObj =
    users.find((u) => u.id === selectedRouteObj?.driverId) ||
    users.find((u) => u.role === 'driver');
  const openDriverDispatch = selectedDriverObj ? openDispatchForDriver(selectedDriverObj.id) : undefined;

  // ==========================================
  // TAB 2: CIERRE / LIQUIDACIÓN DE CAMIONETA
  // ==========================================
  const openReturnDispatches = useMemo(
    () =>
      dispatches.filter(
        (d) => d.status === 'open_in_transit' || d.status === 'pending_return' || d.status === 'proposed'
      ),
    [dispatches]
  );

  const [returnDispatchId, setReturnDispatchId] = useState<string>(
    openReturnDispatches[0]?.id || dispatches[0]?.id || ''
  );

  useEffect(() => {
    if (!dispatches.some((d) => d.id === returnDispatchId)) {
      setReturnDispatchId(openReturnDispatches[0]?.id || dispatches[0]?.id || '');
    }
  }, [dispatches, openReturnDispatches, returnDispatchId]);

  const selectedReturnDispatch =
    dispatches.find((d) => d.id === returnDispatchId) || openReturnDispatches[0] || dispatches[0];

  // Expected return breakdown for selectedReturnDispatch:
  // expectedReturn = loaded - delivered - merma + collected
  const expectedReturnBreakdown = useMemo(() => {
    if (!selectedReturnDispatch) return [];
    const dispId = selectedReturnDispatch.id;
    const dispTickets = tickets.filter((t) => t.dispatchId === dispId);

    // Map delivered, collected & merma by productId linked to this dispatch
    const deliveredByProd: Record<string, number> = {};
    const collectedByProd: Record<string, number> = {};
    const mermaByProd: Record<string, number> = {};

    movements.forEach((m) => {
      if (m.relatedDispatchId === dispId) {
        if (m.type === 'entrega') {
          deliveredByProd[m.productId] = (deliveredByProd[m.productId] || 0) + m.quantity;
        } else if (m.type === 'recoleccion') {
          collectedByProd[m.productId] = (collectedByProd[m.productId] || 0) + m.quantity;
        } else if (m.type === 'merma' && m.fromLocation.type === 'van') {
          mermaByProd[m.productId] = (mermaByProd[m.productId] || 0) + m.quantity;
        }
      }
    });

    // Fallback to ticket items if movements did not carry dispatchId (legacy demo records)
    if (Object.keys(deliveredByProd).length === 0 && dispTickets.length > 0) {
      dispTickets.forEach((t) => {
        t.items.forEach((it) => {
          deliveredByProd[it.productId] = (deliveredByProd[it.productId] || 0) + it.quantity;
        });
        (t.collectedItems || []).forEach((col) => {
          collectedByProd[col.productId] = (collectedByProd[col.productId] || 0) + col.quantity;
        });
      });
    }

    const touchedProdIds = Array.from(
      new Set([
        ...selectedReturnDispatch.items.map((i) => i.productId),
        ...Object.keys(collectedByProd),
      ])
    );

    return touchedProdIds.map((productId) => {
      const dispItem = selectedReturnDispatch.items.find((i) => i.productId === productId);
      const prod = products.find((p) => p.id === productId);
      const brand = brands.find((b) => b.id === (dispItem?.brandId || prod?.brandId));
      const loadedQty = dispItem?.loadedQty || 0;
      const deliveredQty = deliveredByProd[productId] || 0;
      const mermaQty = mermaByProd[productId] || 0;
      const collectedQty = collectedByProd[productId] || 0;
      const expectedReturnQty = Math.max(0, loadedQty - deliveredQty - mermaQty + collectedQty);
      return {
        productId,
        productName: dispItem?.productName || prod?.name || 'Producto',
        brandName: dispItem?.brandName || brand?.name || 'Marca Local',
        unitPrice: dispItem?.unitPrice || prod?.suggestedRetailPrice || 75,
        loadedQty,
        deliveredQty,
        mermaQty,
        collectedQty,
        expectedReturnQty,
      };
    });
  }, [selectedReturnDispatch, movements, tickets, products, brands]);

  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [cashCollectedInput, setCashCollectedInput] = useState<number>(3250);
  const [driverConfirmedReturn, setDriverConfirmedReturn] = useState<boolean>(false);
  const [returnNotes, setReturnNotes] = useState(
    'Conteo físico en andén central al regreso de la ruta.'
  );
  const [returnError, setReturnError] = useState<string | null>(null);
  const [showReturnScanner, setShowReturnScanner] = useState(false);

  // Sync default return quantities to expected return whenever selected dispatch changes
  useEffect(() => {
    const next: Record<string, number> = {};
    expectedReturnBreakdown.forEach((row) => {
      next[row.productId] = row.expectedReturnQty;
    });
    setReturnQuantities(next);
    setDriverConfirmedReturn(false);
    setReturnError(null);
  }, [returnDispatchId]);

  const liveReturnSummary = useMemo(() => {
    let totalExpected = 0;
    let totalPhysical = 0;
    let totalDiscrepancy = 0;
    let shortageValue = 0;

    const items = expectedReturnBreakdown.map((row) => {
      const physical = Math.max(0, returnQuantities[row.productId] ?? row.expectedReturnQty);
      const disc = Math.max(0, row.expectedReturnQty - physical);
      totalExpected += row.expectedReturnQty;
      totalPhysical += physical;
      totalDiscrepancy += disc;
      shortageValue += disc * row.unitPrice;
      return {
        ...row,
        returnedPhysicalQty: physical,
        discrepancyQty: disc,
      };
    });

    return { items, totalExpected, totalPhysical, totalDiscrepancy, shortageValue };
  }, [expectedReturnBreakdown, returnQuantities]);

  // ==========================================
  // TAB 3: AUDITORÍA
  // ==========================================
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // ==========================================
  // TAB 4: KARDEX / MOVIMIENTOS INMUTABLES
  // ==========================================
  const [kardexLocationFilter, setKardexLocationFilter] = useState<string>('all');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('all');
  const [kardexProductFilter, setKardexProductFilter] = useState<string>('all');
  const [kardexUserSearch, setKardexUserSearch] = useState<string>('');

  // Action panel inside Kardex: Entrada, Merma, Ajuste
  const [movActionType, setMovActionType] = useState<'entrada' | 'merma' | 'ajuste'>('entrada');
  const [movProductId, setMovProductId] = useState<string>(products[0]?.id || '');
  const [movQty, setMovQty] = useState<number>(10);
  const [movSourceType, setMovSourceType] = useState<'warehouse' | 'van' | 'store'>('warehouse');
  const [movSourceId, setMovSourceId] = useState<string>(stores[0]?.id || '');
  const [movAdjustDirection, setMovAdjustDirection] = useState<'add' | 'subtract'>('add');
  const [movReason, setMovReason] = useState<string>('');
  const [movPhotoDataUrl, setMovPhotoDataUrl] = useState<string>('');
  const [movFeedback, setMovFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // ==========================================
  // TAB 5: CONFIGURACIÓN INICIAL
  // ==========================================
  const [configManager, setConfigManager] = useState(platformConfig.warehouseManagerName);
  const [configAddress, setConfigAddress] = useState(platformConfig.warehouseAddress);
  const [configDate, setConfigDate] = useState(platformConfig.launchDate);
  const [configPhone, setConfigPhone] = useState(platformConfig.contactPhone || '449-910-2027');
  const [configNotes, setConfigNotes] = useState(platformConfig.notes || '');
  const [configSavedFeedback, setConfigSavedFeedback] = useState(false);

  // ==========================================
  // LIVE COMPUTED METRICS (NO HARDCODED VALUES)
  // ==========================================
  const totalStockInWarehouse = products.reduce((acc, p) => acc + p.centralWarehouseStock, 0);
  const totalDiscrepanciesCount = discrepancies.length;
  const unresolvedDiscrepancies = discrepancies.filter((d) => d.resolutionStatus === 'en_revision').length;

  const livePiecesInTransit = useMemo(() => {
    const activeDisps = dispatches.filter(
      (d) => d.status === 'open_in_transit' || d.status === 'proposed' || d.status === 'pending_return'
    );
    return activeDisps.reduce((acc, d) => acc + d.totalPieces, 0);
  }, [dispatches]);

  const { totalShelfPieces, totalShelfCapacity, shelfOccupancyPct } = useMemo(() => {
    const curr = storeStock.reduce((acc, s) => acc + s.currentStock, 0);
    const idealSum = idealStoreStock.reduce((acc, i) => acc + i.idealQty, 0);
    const targetSum =
      idealSum > 0
        ? idealSum
        : storeStock.reduce((acc, s) => acc + (s.targetMaxStock || 20), 0);
    const pct = targetSum > 0 ? Math.min(100, Math.round((curr / targetSum) * 100)) : 0;
    return {
      totalShelfPieces: curr,
      totalShelfCapacity: targetSum,
      shelfOccupancyPct: pct,
    };
  }, [storeStock, idealStoreStock]);

  // Handlers
  const handleQtyChange = (productId: string, val: number) => {
    setDispatchQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, val || 0),
    }));
  };

  const handleApplySuggestedLoad = () => {
    if (!selectedRouteId) return;
    const suggested = getSuggestedVanLoadForRoute(selectedRouteId);
    const next: Record<string, number> = {};
    suggested.forEach((s) => {
      next[s.productId] = s.suggestedQty;
    });
    setDispatchQuantities(next);
    setDispatchError(null);
  };

  const handleReturnQtyChange = (productId: string, val: number) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, val || 0),
    }));
  };

  // Submit Van Dispatch (Carga Propuesta -> Repartidor debe aceptar)
  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError(null);

    if (openDriverDispatch) {
      setDispatchError(
        `Regla operativa: ${selectedDriverObj?.name || 'El repartidor'} tiene la jornada ${openDriverDispatch.folio} abierta sin liquidar. Ciérrala antes de abrir una carga nueva.`
      );
      return;
    }

    const loadedItems = Object.entries(dispatchQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, loadedQty]) => {
        const prod = products.find((p) => p.id === productId);
        const brand = brands.find((b) => b.id === prod?.brandId);
        return {
          productId,
          productName: prod?.name || 'Producto',
          brandId: prod?.brandId || '',
          brandName: brand?.name || 'Marca Hecho en Ags',
          flavor: prod?.flavor,
          loadedQty,
          unitPrice: prod?.costPrice || 50,
        };
      });

    if (loadedItems.length === 0) {
      setDispatchError('Debes indicar o escanear al menos un producto con cantidad mayor a 0.');
      return;
    }

    const totalPieces = loadedItems.reduce((acc, i) => acc + i.loadedQty, 0);
    const totalValueMXN = loadedItems.reduce((acc, i) => acc + i.loadedQty * i.unitPrice, 0);

    const res = dispatchVan({
      routeId: selectedRouteObj?.id || 'route-01',
      routeCode: selectedRouteObj?.code || 'RUTA-AGS',
      driverId: selectedDriverObj?.id || 'user-driver-1',
      driverName: selectedDriverObj?.name || 'Repartidor de Ruta',
      warehouseManager: currentUser?.name || platformConfig.warehouseManagerName,
      date: new Date().toISOString().split('T')[0],
      items: loadedItems,
      totalPieces,
      totalValueMXN,
      notes: dispatchNotes.trim(),
    });

    if (!res.success) {
      setDispatchError(res.message);
    }
  };

  // Submit Return Reconciliation (Cierre / Liquidación)
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnError(null);

    if (!selectedReturnDispatch) {
      setReturnError('No hay una carga seleccionada para liquidar.');
      return;
    }

    if (
      selectedReturnDispatch.status === 'closed_reconciled' ||
      selectedReturnDispatch.status === 'closed_with_shortage'
    ) {
      setReturnError(`La jornada ${selectedReturnDispatch.folio} ya fue cerrada anteriormente.`);
      return;
    }

    if (!driverConfirmedReturn) {
      setReturnError('El repartidor debe confirmar el conteo físico de retorno antes de cerrar la camioneta.');
      return;
    }

    const returnedItems = liveReturnSummary.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      brandName: item.brandName,
      loadedQty: item.loadedQty,
      deliveredQty: item.deliveredQty,
      mermaQty: item.mermaQty,
      collectedQty: item.collectedQty,
      expectedReturnQty: item.expectedReturnQty,
      returnedPhysicalQty: item.returnedPhysicalQty,
      discrepancyQty: item.discrepancyQty,
      reintegratedToStock: true,
    }));

    recordReturnReconciliation({
      dispatchId: selectedReturnDispatch.id,
      routeId: selectedReturnDispatch.routeId,
      driverId: selectedReturnDispatch.driverId,
      driverName: selectedReturnDispatch.driverName,
      warehouseManager: currentUser?.name || platformConfig.warehouseManagerName,
      driverConfirmedReturn: true,
      cashCollectedMXN: Number(cashCollectedInput) || 0,
      cashReconciled: true,
      returnedItems,
      totalReturnedPieces: liveReturnSummary.totalPhysical,
      totalExpectedReturnPieces: liveReturnSummary.totalExpected,
      totalDiscrepancyPieces: liveReturnSummary.totalDiscrepancy,
      shortageValueMXN: liveReturnSummary.shortageValue,
      notes: returnNotes.trim(),
      status: 'completed',
    });
  };

  // Handle Photo upload for Merma
  const handleMermaPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMovPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Kardex Movement (Entrada / Merma / Ajuste)
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMovFeedback(null);

    const targetProduct = products.find((p) => p.id === movProductId) || products[0];
    if (!targetProduct) {
      setMovFeedback({ ok: false, text: 'No hay productos en el catálogo.' });
      return;
    }

    const brand = brands.find((b) => b.id === targetProduct.brandId);
    const warehouseLoc: LocationRef = {
      type: 'warehouse',
      id: 'warehouse-central',
      label: 'Bodega Central',
    };
    const driverObj = users.find((u) => u.role === 'driver');
    const vanLoc: LocationRef = {
      type: 'van',
      id: `van-${driverObj?.id || 'user-driver-1'}`,
      label: `Camioneta (${driverObj?.name || 'Repartidor'})`,
    };
    const storeObj = stores.find((s) => s.id === movSourceId) || stores[0];
    const storeLoc: LocationRef = {
      type: 'store',
      id: storeObj?.id || 'store-1',
      label: storeObj?.name || 'Punto de Venta',
    };
    const activeLoc: LocationRef =
      movSourceType === 'warehouse' ? warehouseLoc : movSourceType === 'van' ? vanLoc : storeLoc;

    let fromLocation: LocationRef;
    let toLocation: LocationRef;

    if (movActionType === 'entrada') {
      fromLocation = {
        type: 'external',
        id: `supplier-${targetProduct.brandId}`,
        label: `Proveedor (${brand?.name || 'Marca Local'})`,
      };
      toLocation = warehouseLoc;
    } else if (movActionType === 'merma') {
      fromLocation = activeLoc;
      toLocation = { type: 'loss', id: 'merma-baja', label: 'Baja / Merma' };
    } else {
      // ajuste
      if (movAdjustDirection === 'add') {
        fromLocation = { type: 'external', id: 'audit-adjust-in', label: 'Ajuste Positivo Auditoría' };
        toLocation = activeLoc;
      } else {
        fromLocation = activeLoc;
        toLocation = { type: 'loss', id: 'audit-adjust-out', label: 'Ajuste Negativo Auditoría' };
      }
    }

    const res = recordInventoryMovement({
      type: movActionType,
      fromLocation,
      toLocation,
      productId: targetProduct.id,
      quantity: movQty,
      reason: movReason.trim() || (movActionType === 'entrada' ? 'Recepción de lote en bodega' : ''),
      photoProofDataUrl: movActionType === 'merma' ? movPhotoDataUrl : undefined,
      gpsCoords: { lat: 21.8853, lng: -102.2916 },
    });

    setMovFeedback({ ok: res.success, text: res.message });
    if (res.success) {
      setMovReason('');
      setMovPhotoDataUrl('');
    }
  };

  // Filtered Discrepancies
  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (auditFilter !== 'all' && d.discrepancyType !== auditFilter) return false;
    if (auditStatusFilter !== 'all' && d.resolutionStatus !== auditStatusFilter) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        d.ticketFolio.toLowerCase().includes(q) ||
        d.storeName.toLowerCase().includes(q) ||
        d.brandName.toLowerCase().includes(q) ||
        d.productName.toLowerCase().includes(q) ||
        d.driverName.toLowerCase().includes(q) ||
        d.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Kardex Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (kardexTypeFilter !== 'all' && m.type !== kardexTypeFilter) return false;
      if (kardexProductFilter !== 'all' && m.productId !== kardexProductFilter) return false;
      if (kardexLocationFilter !== 'all') {
        const matchesLoc =
          m.fromLocation.type === kardexLocationFilter || m.toLocation.type === kardexLocationFilter;
        if (!matchesLoc) return false;
      }
      if (kardexUserSearch.trim()) {
        const q = kardexUserSearch.toLowerCase();
        const hit =
          m.performedByName.toLowerCase().includes(q) ||
          (m.confirmedByName || '').toLowerCase().includes(q) ||
          m.folio.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q) ||
          (m.reason || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [movements, kardexTypeFilter, kardexProductFilter, kardexLocationFilter, kardexUserSearch]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformConfig({
      warehouseManagerName: configManager.trim(),
      warehouseAddress: configAddress.trim(),
      launchDate: configDate.trim(),
      contactPhone: configPhone.trim(),
      notes: configNotes.trim(),
    });
    setConfigSavedFeedback(true);
    setTimeout(() => setConfigSavedFeedback(false), 3000);
  };

  const getDispatchBadge = (status: string) => {
    switch (status) {
      case 'proposed':
        return { cls: 'bg-amber-100 text-amber-900', label: 'Esperando Aceptación Repartidor' };
      case 'open_in_transit':
        return { cls: 'bg-blue-100 text-blue-800 animate-pulse', label: 'Camioneta Abierta en Ruta' };
      case 'pending_return':
        return { cls: 'bg-purple-100 text-purple-900', label: 'Pendiente Liquidación' };
      case 'closed_with_shortage':
        return { cls: 'bg-rose-100 text-rose-800', label: 'Cerrada con Faltante' };
      default:
        return { cls: 'bg-emerald-100 text-emerald-800', label: 'Cerrada Cuadrada ✓' };
    }
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'entrada':
        return 'bg-emerald-100 text-emerald-800';
      case 'carga':
        return 'bg-blue-100 text-blue-800';
      case 'entrega':
        return 'bg-indigo-100 text-indigo-800';
      case 'devolucion':
        return 'bg-teal-100 text-teal-800';
      case 'recoleccion':
        return 'bg-amber-100 text-amber-900';
      case 'merma':
        return 'bg-rose-100 text-rose-800';
      case 'ajuste':
        return 'bg-purple-100 text-purple-900';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Warehouse Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-orange-500/20 shrink-0">
              📦
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full shadow-2xs">
                  Rol 2: Almacén y Oficina
                </span>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {platformConfig.warehouseManagerName}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Centro de Acopio, Movimientos Inmutables & Liquidación
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>{platformConfig.warehouseAddress}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FAFBFD] border border-slate-200/90 p-3 rounded-2xl">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Libro de Movimientos
              </span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {movements.length} movimientos registrados
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Computed KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Piezas en Jornadas Abiertas</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {livePiecesInTransit.toLocaleString('es-MX')}
              </span>
              <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                {openReturnDispatches.length} abiertas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Mercancía cargada en camionetas sin liquidar
            </p>
          </div>
        </div>

        <div className="p-5 rounded-[24px] text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold opacity-90 mb-2">
            <span>Auditoría & Faltantes</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black">
              {unresolvedDiscrepancies} pendientes
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{totalDiscrepanciesCount}</span>
              <span className="text-xs font-bold text-amber-100 bg-white/20 px-2 py-0.5 rounded-full">
                incidencias
              </span>
            </div>
            <p className="text-[11px] text-white/90 mt-1 font-medium">
              Diferencias de entrega y faltantes de liquidación
            </p>
          </div>
        </div>

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
                {totalShelfPieces} / {totalShelfCapacity} pzas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Calculado por suma de movimientos en tiendas
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Stock en Bodega Central</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{totalStockInWarehouse}</span>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                {brands.length} marcas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Kardex inmutable (entradas − salidas)
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'dispatches'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-400" />
          <span>1. Apertura / Carga</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'dispatches' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {dispatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'returns'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-emerald-500" />
          <span>2. Cierre / Liquidación</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'returns' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {openReturnDispatches.length} abiertas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kardex')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'kardex'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <History className="w-4 h-4 text-blue-500" />
          <span>3. Kardex / Movimientos</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'kardex' ? 'bg-[#D4F63D] text-slate-900' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {movements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-rose-500" />
          <span>4. Auditoría</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
            {totalDiscrepanciesCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'config'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>5. Almacén</span>
        </button>
      </div>

      {/* TAB 1: APERTURA / CARGA DE CAMIONETA */}
      {activeTab === 'dispatches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Etapa 1: Proponer Carga de Jornada
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bodega escanea y propone según la ruta; el repartidor confirma para abrir la camioneta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSmartRouteGeneratorModalOpen(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-200 fill-current" />
                <span>Ruta Corta GPS</span>
              </button>
            </div>

            {/* Lock banner if driver already has an unclosed dispatch */}
            {openDriverDispatch && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Jornada Anterior Abierta ({openDriverDispatch.folio})</span>
                </div>
                <p className="text-[11px] text-rose-800">
                  Regla operativa: No se puede abrir una carga nueva para <strong>{openDriverDispatch.driverName}</strong> hasta cerrar la jornada actual (Estatus: <strong>{getDispatchBadge(openDriverDispatch.status).label}</strong>).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReturnDispatchId(openDriverDispatch.id);
                    setActiveTab('returns');
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-extrabold cursor-pointer"
                >
                  Ir a Liquidar {openDriverDispatch.folio} →
                </button>
              </div>
            )}

            {dispatchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{dispatchError}</span>
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleccionar Ruta Asignada
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name} ({r.scheduledStores.length} paradas)
                    </option>
                  ))}
                </select>
              </div>

              {/* Action buttons: Suggest Ideal Load & Barcode Scan */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplySuggestedLoad}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Proponer Carga Sugerida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDispatchScanner(true)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escanear Código</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Piezas por Producto / Sabor</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Confirmación dual al aceptar chofer
                  </span>
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2.5 bg-[#FAFBFD]">
                  {products.map((prod) => {
                    const brand = brands.find((b) => b.id === prod.brandId);
                    const qty = dispatchQuantities[prod.id] || 0;
                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="font-extrabold text-slate-900 truncate">
                            {prod.name} {prod.flavor ? `(${prod.flavor})` : ''}
                          </p>
                          <p className="text-[11px] text-orange-600 font-semibold">
                            {brand?.name} · Bodega: {prod.centralWarehouseStock} {prod.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max={prod.centralWarehouseStock}
                            value={qty}
                            onChange={(e) => handleQtyChange(prod.id, parseInt(e.target.value) || 0)}
                            className="w-16 bg-[#F8FAFC] border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-black font-mono text-slate-900"
                          />
                          <span className="text-[11px] text-slate-400 font-bold">pzas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones de Inspección Física
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={Boolean(openDriverDispatch)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Preparar Carga y Enviar a Confirmación del Repartidor</span>
              </button>
            </form>
          </div>

          {/* Right: Dispatch Lifecycle List */}
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Historial de Jornadas y Cargas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ciclo estricto: Propuesta → Aceptada (Abierta) → Cerrada / Liquidada.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-bold font-mono">{dispatches.length} jornadas</span>
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {dispatches.map((disp) => {
                const badge = getDispatchBadge(disp.status);
                return (
                  <div
                    key={disp.id}
                    className="border border-slate-200/90 rounded-2xl p-4 bg-[#FAFBFD] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            {disp.folio}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">{disp.routeCode}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Chofer: <strong>{disp.driverName}</strong> · Bodega: {disp.warehouseManager}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">Total cargado:</span>
                        <span className="font-black text-slate-900">{disp.totalPieces} piezas</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">Valor mercancía:</span>
                        <span className="font-mono font-black text-orange-600">
                          ${disp.totalValueMXN.toLocaleString('es-MX')} MXN
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Desglose: </span>
                      {disp.items.map((i) => `${i.productName} (${i.loadedQty})`).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CIERRE / LIQUIDACIÓN DE CAMIONETA */}
      {activeTab === 'returns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Etapa 3: Cierre / Liquidación de Camioneta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Esperado = Cargado − Entregado − Merma + Recogido
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnScanner(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Escanear Retorno</span>
              </button>
            </div>

            {returnError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jornada a Liquidar
                </label>
                <select
                  value={selectedReturnDispatch?.id || ''}
                  onChange={(e) => setReturnDispatchId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.folio} ({d.routeCode}) — {d.driverName} [{getDispatchBadge(d.status).label}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Efectivo Recolectado en Ruta ($ MXN)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    value={cashCollectedInput}
                    onChange={(e) => setCashCollectedInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* SKU Expected vs Physical Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Conteo Físico vs Esperado por SKU</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Esperado total: {liveReturnSummary.totalExpected} pzas
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2.5 bg-[#FAFBFD]">
                  {liveReturnSummary.items.map((item) => (
                    <div
                      key={item.productId}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        item.discrepancyQty > 0
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 truncate">{item.productName}</p>
                          <p className="text-[10px] font-mono text-slate-500">
                            Cargado {item.loadedQty} − Entregado {item.deliveredQty} − Merma {item.mermaQty} + Recogido {item.collectedQty} ={' '}
                            <strong className="text-slate-900">Esp. {item.expectedReturnQty}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            value={item.returnedPhysicalQty}
                            onChange={(e) =>
                              handleReturnQtyChange(item.productId, parseInt(e.target.value) || 0)
                            }
                            className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-black font-mono text-slate-900"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">físicas</span>
                        </div>
                      </div>
                      {item.discrepancyQty > 0 && (
                        <div className="text-[11px] font-black text-rose-700 flex items-center justify-between">
                          <span>⚠️ Faltante detectado: -{item.discrepancyQty} pzas</span>
                          <span className="font-mono">${(item.discrepancyQty * item.unitPrice).toLocaleString('es-MX')} MXN</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shortage alert banner if any mismatch */}
              {liveReturnSummary.totalDiscrepancy > 0 ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>
                      Faltante de {liveReturnSummary.totalDiscrepancy} pzas ($
                      {liveReturnSummary.shortageValue.toLocaleString('es-MX')} MXN) a cargo de{' '}
                      {selectedReturnDispatch?.driverName}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Al cerrar la jornada se generará el registro formal de faltante en Auditoría para revisión del Administrador.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cuadre exacto: físico coincide 100% con lo esperado en camioneta.</span>
                </div>
              )}

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={driverConfirmedReturn}
                  onChange={(e) => setDriverConfirmedReturn(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>
                  El repartidor ({selectedReturnDispatch?.driverName}) confirma el conteo físico de retorno
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de Liquidación
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cerrar Camioneta y Registrar Liquidación</span>
              </button>
            </form>
          </div>

          {/* Right: Reconciliation History */}
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Liquidaciones & Cierres Procesados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro histórico de devoluciones a bodega y faltantes por repartidor.
                </p>
              </div>
              <span className="text-xs text-emerald-600 font-bold">{reconciliations.length} cierres</span>
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {reconciliations.map((rec) => (
                <div
                  key={rec.id}
                  className="border border-slate-200/90 rounded-2xl p-4 bg-[#FAFBFD] space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {rec.folio}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {rec.driverName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Auditó: {rec.warehouseManager} · Esperado: {rec.totalExpectedReturnPieces} pzas
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        rec.totalDiscrepancyPieces > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {rec.totalDiscrepancyPieces > 0
                        ? `Faltante -${rec.totalDiscrepancyPieces} pzas`
                        : 'Cuadrado 100%'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Efectivo entregado:</span>
                      <span className="font-mono font-black text-emerald-600">
                        ${rec.cashCollectedMXN.toLocaleString('es-MX')} MXN
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Piezas físicas reingresadas:</span>
                      <span className="font-black text-slate-900">{rec.totalReturnedPieces} pzas</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KARDEX / MOVIMIENTOS INMUTABLES */}
      {activeTab === 'kardex' && (
        <div className="space-y-6">
          {/* Action Form: Entrada, Merma, Ajuste */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-orange-600" />
                  <span>Registrar Movimiento Inmutable en Kardex</span>
                </h3>
                <p className="text-xs text-slate-500">
                  El inventario no se edita manualmente; todo cambio queda trazado con quién, cuándo y motivo.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(['entrada', 'merma', 'ajuste'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setMovActionType(t);
                      setMovFeedback(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer transition ${
                      movActionType === t ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'entrada' ? 'Entrada Proveedor' : t === 'merma' ? 'Merma / Baja' : 'Ajuste Admin'}
                  </button>
                ))}
              </div>
            </div>

            {movActionType === 'ajuste' && currentUser?.role !== 'admin' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-bold">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Solo el Super Administrador puede registrar movimientos de Ajuste con motivo obligatorio.
                </span>
              </div>
            ) : (
              <form onSubmit={handleMovementSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">Producto</label>
                  <select
                    value={movProductId}
                    onChange={(e) => setMovProductId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.flavor ? `(${p.flavor})` : ''} — Bodega: {p.centralWarehouseStock}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Piezas</label>
                  <input
                    type="number"
                    min="1"
                    value={movQty}
                    onChange={(e) => setMovQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-slate-900"
                  />
                </div>

                {movActionType !== 'entrada' && (
                  <>
                    <div className="md:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Ubicación</label>
                      <select
                        value={movSourceType}
                        onChange={(e) => setMovSourceType(e.target.value as 'warehouse' | 'van' | 'store')}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900"
                      >
                        <option value="warehouse">Bodega Central</option>
                        <option value="van">Camioneta en Ruta</option>
                        <option value="store">Punto de Venta</option>
                      </select>
                    </div>

                    {movSourceType === 'store' && (
                      <div className="md:col-span-3">
                        <label className="block font-bold text-slate-700 mb-1">Tienda</label>
                        <select
                          value={movSourceId}
                          onChange={(e) => setMovSourceId(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900"
                        >
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {movActionType === 'ajuste' && (
                  <div className="md:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Sentido del Ajuste</label>
                    <select
                      value={movAdjustDirection}
                      onChange={(e) => setMovAdjustDirection(e.target.value as 'add' | 'subtract')}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900"
                    >
                      <option value="add">+ Sumar piezas (Auditoría)</option>
                      <option value="subtract">- Restar piezas (Auditoría)</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-6">
                  <label className="block font-bold text-slate-700 mb-1">
                    Motivo {movActionType !== 'entrada' ? <span className="text-rose-500">* (Obligatorio)</span> : '(Opcional)'}
                  </label>
                  <input
                    type="text"
                    required={movActionType !== 'entrada'}
                    value={movReason}
                    onChange={(e) => setMovReason(e.target.value)}
                    placeholder={
                      movActionType === 'entrada'
                        ? 'Lote recién entregado por la marca...'
                        : movActionType === 'merma'
                          ? 'Empaque roto en traslado o producto caducado...'
                          : 'Corrección de conteo físico certificado por admin...'
                    }
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                {movActionType === 'merma' && (
                  <div className="md:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">
                      Foto Evidencia <span className="text-rose-500">*</span>
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-slate-700">
                      <Camera className="w-4 h-4 text-rose-500" />
                      <span>{movPhotoDataUrl ? 'Foto adjunta ✓' : 'Subir foto de merma'}</span>
                      <input type="file" accept="image/*" onChange={handleMermaPhotoChange} className="hidden" />
                    </label>
                  </div>
                )}

                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-1">
                  {movFeedback && (
                    <span
                      className={`font-bold text-xs px-3 py-1.5 rounded-xl ${
                        movFeedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {movFeedback.text}
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold cursor-pointer transition"
                  >
                    Registrar {movActionType.toUpperCase()}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Libro Inmutable de Movimientos ({filteredMovements.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={kardexLocationFilter}
                  onChange={(e) => setKardexLocationFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
                >
                  <option value="all">Todas las ubicaciones</option>
                  <option value="warehouse">Bodega Central</option>
                  <option value="van">Camionetas</option>
                  <option value="store">Puntos de Venta</option>
                  <option value="loss">Mermas / Bajas</option>
                </select>
                <select
                  value={kardexTypeFilter}
                  onChange={(e) => setKardexTypeFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="entrada">Entrada</option>
                  <option value="carga">Carga</option>
                  <option value="entrega">Entrega</option>
                  <option value="devolucion">Devolución</option>
                  <option value="recoleccion">Recolección</option>
                  <option value="merma">Merma</option>
                  <option value="ajuste">Ajuste</option>
                </select>
                <select
                  value={kardexProductFilter}
                  onChange={(e) => setKardexProductFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 max-w-[180px]"
                >
                  <option value="all">Todos los productos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={kardexUserSearch}
                  onChange={(e) => setKardexUserSearch(e.target.value)}
                  placeholder="Usuario, folio o motivo..."
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Folio & Fecha</th>
                    <th className="py-3 px-3.5">Tipo</th>
                    <th className="py-3 px-3.5">De → A</th>
                    <th className="py-3 px-3.5">Producto & Marca</th>
                    <th className="py-3 px-3.5 text-center">Piezas</th>
                    <th className="py-3 px-3.5">Quién / GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredMovements.slice(0, 80).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5">
                        <span className="font-mono font-black text-slate-900 block">{m.folio}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.timestamp).toLocaleString('es-MX')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getMovementBadge(m.type)}`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-semibold text-slate-700 block">
                          {m.fromLocation.label} → {m.toLocation.label}
                        </span>
                        {m.reason && <span className="text-[10px] text-slate-400 italic">"{m.reason}"</span>}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-slate-900 block">
                          {m.productName} {m.flavor ? `(${m.flavor})` : ''}
                        </span>
                        <span className="text-[10px] text-orange-600 font-bold">{m.brandName}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-black text-slate-900">
                        {m.quantity}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-semibold text-slate-800 block">{m.performedByName}</span>
                        {m.confirmedByName && (
                          <span className="text-[10px] text-emerald-700 font-bold block">
                            Confirma: {m.confirmedByName}
                          </span>
                        )}
                        {m.gpsCoords && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {m.gpsCoords.lat.toFixed(4)}, {m.gpsCoords.lng.toFixed(4)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITORÍA DE REMISIONES Y FALTANTES */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-black mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Auditoría Activa de Almacén · {totalDiscrepanciesCount} Discrepancias
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Control de Faltantes de Liquidación & Discrepancias
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="all">Todos los motivos</option>
                <option value="faltante_liquidacion">Faltante en Liquidación</option>
                <option value="espacio_lleno">Espacio Lleno en Anaquel</option>
                <option value="merma_traslado">Merma en Traslado</option>
                <option value="caducidad_reemplazo">Rotación / Caducidad</option>
                <option value="conteo_diferencia">Diferencia de Conteo</option>
              </select>

              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
              >
                <option value="all">Todos los estatus</option>
                <option value="en_revision">En Revisión</option>
                <option value="auditada_resuelta">Auditada y Resuelta</option>
                <option value="reposicion_programada">Reposición Programada</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar folio, chofer o marca..."
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Folio & Fecha</th>
                    <th className="py-3 px-3.5">Punto / Chofer</th>
                    <th className="py-3 px-3.5">Marca & Producto</th>
                    <th className="py-3 px-3.5 text-center">Esperado vs Físico</th>
                    <th className="py-3 px-3.5 text-center">Diferencia</th>
                    <th className="py-3 px-3.5">Motivo</th>
                    <th className="py-3 px-3.5">Estatus</th>
                    <th className="py-3 px-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {filteredDiscrepancies.map((disc: DiscrepancyAuditRecord) => (
                    <tr key={disc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-black text-slate-900 block">{disc.ticketFolio}</span>
                        <span className="text-[10px] text-slate-400">{disc.date}</span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">
                        {disc.storeName}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Responsable: {disc.driverName}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-900 block">{disc.productName}</span>
                        <span className="text-[11px] text-orange-600 font-bold">{disc.brandName}</span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {disc.expectedQty} → {disc.deliveredQty}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          -{disc.discrepancyQty} pza{disc.discrepancyQty > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          {disc.discrepancyType === 'faltante_liquidacion'
                            ? 'Faltante en Liquidación'
                            : disc.discrepancyType === 'espacio_lleno'
                              ? 'Anaquel Lleno / Sobre-Stock'
                              : disc.discrepancyType === 'merma_traslado'
                                ? 'Merma en Traslado'
                                : disc.discrepancyType === 'caducidad_reemplazo'
                                  ? 'Rotación Preventiva'
                                  : 'Diferencia en Conteo'}
                        </span>
                        <span className="text-[10px] text-slate-400 italic line-clamp-1">"{disc.notes}"</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            disc.resolutionStatus === 'auditada_resuelta'
                              ? 'bg-emerald-100 text-emerald-800'
                              : disc.resolutionStatus === 'reposicion_programada'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {disc.resolutionStatus === 'auditada_resuelta'
                            ? 'Resuelta'
                            : disc.resolutionStatus === 'reposicion_programada'
                              ? 'Reposición'
                              : 'En Revisión'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {disc.resolutionStatus !== 'auditada_resuelta' ? (
                          <button
                            onClick={() => updateDiscrepancyStatus(disc.id, 'auditada_resuelta')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Resolver
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">✓ Auditada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONFIGURACIÓN INICIAL DEL ALMACÉN */}
      {activeTab === 'config' && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Configuración del Centro de Acopio
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Parámetros del almacén central para recepción y liquidación de rutas.
            </p>
          </div>

          {configSavedFeedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>¡Configuración guardada correctamente!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsable de Auditoría de Almacén *
              </label>
              <input
                type="text"
                required
                value={configManager}
                onChange={(e) => setConfigManager(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dirección del Almacén Central *
              </label>
              <input
                type="text"
                required
                value={configAddress}
                onChange={(e) => setConfigAddress(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Inicio Operación</label>
                <input
                  type="date"
                  required
                  value={configDate}
                  onChange={(e) => setConfigDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Mesa de Control</label>
                <input
                  type="text"
                  value={configPhone}
                  onChange={(e) => setConfigPhone(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Recepción</label>
              <textarea
                rows={3}
                value={configNotes}
                onChange={(e) => setConfigNotes(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode Scanner Modal for Dispatch */}
      {showDispatchScanner && (
        <BarcodeScannerModal
          title="Escanear Carga de Salida a Camioneta"
          products={products}
          onScanProduct={(prod) => {
            setDispatchQuantities((prev) => ({
              ...prev,
              [prod.id]: Math.min(prod.centralWarehouseStock, (prev[prod.id] || 0) + 1),
            }));
          }}
          onClose={() => setShowDispatchScanner(false)}
        />
      )}

      {/* Barcode Scanner Modal for Return Check-in */}
      {showReturnScanner && (
        <BarcodeScannerModal
          title="Escanear Piezas Devueltas a Bodega"
          products={products}
          onScanProduct={(prod) => {
            setReturnQuantities((prev) => ({
              ...prev,
              [prod.id]: (prev[prod.id] || 0) + 1,
            }));
          }}
          onClose={() => setShowReturnScanner(false)}
        />
      )}
    </div>
  );
};
