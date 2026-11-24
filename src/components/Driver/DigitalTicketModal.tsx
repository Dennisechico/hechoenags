import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Store,
  DeliveryItem,
  DeliveryTicket,
  CollectedReturnItem,
} from '../../types';
import { SignatureCanvas } from '../Common/SignatureCanvas';
import { BarcodeScannerModal } from '../Common/BarcodeScannerModal';
import {
  X,
  FileText,
  MapPin,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  QrCode,
  Camera,
  RotateCcw,
} from 'lucide-react';

interface DigitalTicketModalProps {
  store: Store;
  routeId: string;
  dispatchId?: string;
  driverCoords?: { lat: number; lng: number };
  geofenceDistanceMeters?: number;
  onClose: () => void;
  onTicketGenerated: (ticket: DeliveryTicket) => void;
}

export const DigitalTicketModal: React.FC<DigitalTicketModalProps> = ({
  store,
  routeId,
  dispatchId,
  driverCoords,
  geofenceDistanceMeters,
  onClose,
  onTicketGenerated,
}) => {
  const {
    products,
    brands,
    currentUser,
    storeStock,
    idealStoreStock,
    recordDeliveryTicket,
  } = useApp();

  const primaryLimit = store.weeklyStockLimits?.[0];

  const getProductStockLimit = (brandId: string) => {
    if (!store.weeklyStockLimits || store.weeklyStockLimits.length === 0) return undefined;
    const brand = brands.find((b) => b.id === brandId);
    if (!brand) return store.weeklyStockLimits[0];
    return store.weeklyStockLimits.find(
      (l) =>
        l.brandId === brandId ||
        l.brandName.toLowerCase() === brand.name.toLowerCase() ||
        (l.brandName.toLowerCase().includes('baruch') && brand.name.toLowerCase().includes('baruch'))
    );
  };

  const getMaxCapForProduct = (productId: string, brandId: string) => {
    const ideal = idealStoreStock.find((i) => i.storeId === store.id && i.productId === productId);
    if (ideal) return ideal.idealQty;
    const match = storeStock.find((s) => s.storeId === store.id && s.productId === productId);
    const limit = getProductStockLimit(brandId);
    if (limit) return limit.weeklyMax;
    if (match?.targetMaxStock) return match.targetMaxStock;
    return 20;
  };

  // Shelf count on arrival per product
  const [shelfCounts, setShelfCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    products.forEach((p) => {
      const match = storeStock.find((s) => s.storeId === store.id && s.productId === p.id);
      init[p.id] = match ? match.currentStock : 0;
    });
    return init;
  });

  // Delivered quantities
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      const ideal = idealStoreStock.find((i) => i.storeId === store.id && i.productId === p.id);
      if (store.activeBrands.includes(p.brandId) || ideal) {
        const match = storeStock.find((s) => s.storeId === store.id && s.productId === p.id);
        const maxCap = getMaxCapForProduct(p.id, p.brandId);
        const currentStock = match ? match.currentStock : 0;
        initial[p.id] = Math.max(0, maxCap - currentStock);
      } else {
        initial[p.id] = 0;
      }
    });
    return initial;
  });

  // Recolección (caducado o dañado recogido del anaquel hacia camioneta)
  const [collectedQuantities, setCollectedQuantities] = useState<Record<string, number>>({});
  const [collectedReasons, setCollectedReasons] = useState<Record<string, 'caducado' | 'danado'>>({});

  const [photoProofDataUrl, setPhotoProofDataUrl] = useState<string>('');
  const [recipientName, setRecipientName] = useState(store.managerName || '');
  const [recipientRole, setRecipientRole] = useState('Encargado(a) de Recepción');
  const [signatureData, setSignatureData] = useState<string>('');
  const [notes, setNotes] = useState('Mercancía recibida a entera satisfacción en anaquel local.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleShelfCountChange = (productId: string, count: number) => {
    const safeCount = Math.max(0, count || 0);
    setShelfCounts((prev) => ({ ...prev, [productId]: safeCount }));
    const prod = products.find((p) => p.id === productId);
    const maxCap = prod ? getMaxCapForProduct(productId, prod.brandId) : 20;
    const optimal = Math.max(0, maxCap - safeCount);
    setSelectedQuantities((prev) => ({ ...prev, [productId]: optimal }));
  };

  const applyOptimalAll = () => {
    const nextQty: Record<string, number> = {};
    products.forEach((p) => {
      const hasIdeal = idealStoreStock.some((i) => i.storeId === store.id && i.productId === p.id);
      if (store.activeBrands.includes(p.brandId) || getProductStockLimit(p.brandId) || hasIdeal) {
        const maxCap = getMaxCapForProduct(p.id, p.brandId);
        const currentCount = shelfCounts[p.id] ?? 0;
        nextQty[p.id] = Math.max(0, maxCap - currentCount);
      } else {
        nextQty[p.id] = 0;
      }
    });
    setSelectedQuantities(nextQty);
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const handleQtyInput = (productId: string, value: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, value || 0),
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoProofDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const deliveryItems: DeliveryItem[] = Object.entries(selectedQuantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      const brand = brands.find((b) => b.id === product?.brandId);
      return {
        productId,
        productName: product?.name || 'Producto',
        brandId: product?.brandId || '',
        brandName: brand?.name || 'Marca Hecho en Ags',
        flavor: product?.flavor,
        quantity,
        unitPrice: product?.costPrice || 0,
        subtotal: quantity * (product?.costPrice || 0),
      };
    })
    .filter((item) => item.productName !== 'Producto');

  const collectedItems: CollectedReturnItem[] = Object.entries(collectedQuantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      const brand = brands.find((b) => b.id === product?.brandId);
      return {
        productId,
        productName: product?.name || 'Producto',
        brandId: product?.brandId || '',
        brandName: brand?.name || 'Marca Hecho en Ags',
        quantity,
        reason: collectedReasons[productId] || 'caducado',
        photoDataUrl: photoProofDataUrl || undefined,
      };
    });

  const totalPieces = deliveryItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCollectedPieces = collectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalValue = deliveryItems.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (deliveryItems.length === 0 && collectedItems.length === 0) {
      setErrorMsg('Debes registrar al menos una entrega o recolección mayor a 0 piezas.');
      return;
    }

    if (!recipientName.trim()) {
      setErrorMsg('Ingresa el nombre del encargado o persona que recibe.');
      return;
    }

    // Either digital signature OR photo proof is required
    if (!signatureData && !photoProofDataUrl) {
      setErrorMsg('Captura la firma digital del encargado O sube una foto de comprobante para emitir la remisión.');
      return;
    }

    const brandIds = Array.from(
      new Set([
        ...deliveryItems.map((item) => item.brandId),
        ...collectedItems.map((item) => item.brandId),
      ])
    ).filter(Boolean);

    const createdTicket = recordDeliveryTicket({
      routeId,
      dispatchId,
      storeId: store.id,
      storeName: store.name,
      driverId: currentUser?.id || 'user-driver-1',
      driverName: currentUser?.name || 'Conductor Autorizado',
      brandIds,
      items: deliveryItems,
      shelfCounts,
      collectedItems: collectedItems.length > 0 ? collectedItems : undefined,
      totalPieces,
      totalCollectedPieces,
      totalValue,
      recipientName: recipientName.trim(),
      recipientRole: recipientRole.trim(),
      recipientSignature: signatureData,
      photoProofDataUrl: photoProofDataUrl || undefined,
      gpsCoords: driverCoords || store.coordinates,
      geofenceVerified: geofenceDistanceMeters !== undefined ? geofenceDistanceMeters <= 100 : true,
      geofenceDistanceMeters,
      notes: notes.trim(),
      status: 'delivered',
    });

    onTicketGenerated(createdTicket);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Remisión Digital & Conteo en Anaquel
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <strong className="text-slate-800 truncate">{store.name}</strong>
                {geofenceDistanceMeters !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      geofenceDistanceMeters <= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {geofenceDistanceMeters <= 100 ? 'Geocerca 100m ✓' : `A ${geofenceDistanceMeters} m`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {primaryLimit && (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Meta Semanal Asignada en Sucursal
                </span>
                <span className="text-xs font-extrabold text-emerald-950">🥗 {primaryLimit.brandName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                <span className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-black">
                  Mín: {primaryLimit.weeklyMin} pzas
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black shadow-2xs">
                  Máx: {primaryLimit.weeklyMax} pzas
                </span>
              </div>
            </div>
          )}

          {/* Optimal rule + Scanner button */}
          <div className="space-y-3">
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>Conteo de Anaquel, Surtido Óptimo & Recolección</span>
                </div>
                <p className="text-[11px] text-amber-800 font-medium font-mono mt-0.5">
                  Sugerido = Nivel Ideal − Conteo Actual en Anaquel
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escanear SKU/QR</span>
                </button>
                <button
                  type="button"
                  onClick={applyOptimalAll}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                >
                  Aplicar Óptimo
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-orange-500" /> 1. Conteo, Entrega y Recolección
              </label>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-2xl p-2.5 bg-[#FAFBFD]">
              {products.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Aún no hay productos dados de alta en el catálogo.
                </div>
              ) : (
                products.map((product) => {
                  const brand = brands.find((b) => b.id === product.brandId);
                  const currentQty = selectedQuantities[product.id] || 0;
                  const colQty = collectedQuantities[product.id] || 0;
                  const colReason = collectedReasons[product.id] || 'caducado';
                  const maxCap = getMaxCapForProduct(product.id, product.brandId);
                  const detectedCount = shelfCounts[product.id] ?? 0;

                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-2xl border transition space-y-2.5 ${
                        currentQty > 0 || colQty > 0
                          ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-extrabold text-slate-900 truncate block">
                            {product.name} {product.flavor ? `· ${product.flavor}` : ''}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-medium">
                            <span className="text-orange-600 font-bold">{brand?.name}</span>
                            <span>·</span>
                            <span className="font-mono">SKU: {product.sku}</span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] font-mono shrink-0">
                          <span className="text-slate-400 block text-[10px]">Ideal anaquel:</span>
                          <strong className="text-slate-700">{maxCap} pzas</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 bg-white/80 p-2 rounded-xl">
                        {/* Conteo en anaquel */}
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="text-[11px] text-slate-600 font-bold">Conteo llegada:</span>
                          <input
                            type="number"
                            min="0"
                            value={detectedCount}
                            onChange={(e) => handleShelfCountChange(product.id, parseInt(e.target.value) || 0)}
                            className="w-16 bg-[#F8FAFC] border border-slate-300 rounded-lg py-1 px-1.5 text-center text-xs font-mono font-bold text-slate-800"
                          />
                        </div>

                        {/* Entregar */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                          <span className="text-[11px] font-bold text-orange-700">A Dejar:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(product.id, -1)}
                              disabled={currentQty === 0}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={currentQty}
                              onChange={(e) => handleQtyInput(product.id, parseInt(e.target.value) || 0)}
                              className="w-12 text-center bg-white border border-slate-300 rounded-lg py-1 text-xs font-black font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(product.id, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Recolección caducado / dañado */}
                        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                          <span className="text-rose-700 font-bold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Recolección (Tienda → Camioneta):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={colReason}
                              onChange={(e) =>
                                setCollectedReasons((prev) => ({
                                  ...prev,
                                  [product.id]: e.target.value as 'caducado' | 'danado',
                                }))
                              }
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold"
                            >
                              <option value="caducado">Caducado</option>
                              <option value="danado">Dañado</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={colQty}
                              onChange={(e) =>
                                setCollectedQuantities((prev) => ({
                                  ...prev,
                                  [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                                }))
                              }
                              className="w-14 bg-white border border-rose-200 rounded-lg py-1 px-1.5 text-center font-mono font-bold text-rose-700"
                            />
                            <span className="text-slate-400">pzas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-[#FAFBFD] border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Entregadas / Recogidas:</span>
                <span className="text-slate-900 font-black text-sm">
                  +{totalPieces} entregadas · −{totalCollectedPieces} recogidas
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Valor consignado:</span>
                <span className="text-orange-600 font-black text-sm">
                  ${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </span>
              </div>
            </div>
          </div>

          {/* Receptor Info */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">
              2. Datos del Encargado que Recibe
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Puesto o Cargo</label>
                <input
                  type="text"
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Signature OR Photo Proof */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider block">
              3. Comprobación del Encargado (Firma Digital o Foto)
            </label>
            <SignatureCanvas
              onSave={(dataUrl) => setSignatureData(dataUrl)}
              onClear={() => setSignatureData('')}
            />

            <div className="bg-[#FAFBFD] border border-slate-200/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Foto de Comprobante / Anaquel
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Válido como evidencia aunque no haya firma en pantalla
                  </span>
                </div>
              </div>
              <label className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer">
                <span>{photoProofDataUrl ? 'Cambiar Foto ✓' : 'Tomar / Subir Foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {photoProofDataUrl && (
              <div className="flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <img src={photoProofDataUrl} alt="Evidencia" className="w-16 h-12 object-cover rounded-lg" />
                <span className="text-xs font-bold text-emerald-800 flex-1">Evidencia fotográfica adjunta ✓</span>
                <button
                  type="button"
                  onClick={() => setPhotoProofDataUrl('')}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar y Emitir Remisión
            </button>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          title="Escanear Producto Entregado en Tienda"
          products={products}
          onScanProduct={(prod) => {
            setSelectedQuantities((prev) => ({
              ...prev,
              [prod.id]: (prev[prod.id] || 0) + 1,
            }));
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
