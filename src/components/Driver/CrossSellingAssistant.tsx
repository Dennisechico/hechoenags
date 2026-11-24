import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, CrossSellingOpportunity, CrossSellingLead } from '../../types';
import { CROSS_SELLING_CATALOG } from '../../data/seedData';
import { Sparkles, Check, Gift, ShoppingBag, Send, CheckCircle2 } from 'lucide-react';

interface CrossSellingAssistantProps {
  store: Store;
}

export const CrossSellingAssistant: React.FC<CrossSellingAssistantProps> = ({ store }) => {
  const { products, brands, currentUser, recordCrossSellingLead } = useApp();
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Find relevant cross-selling suggestions for this store
  const relevantOpportunities = CROSS_SELLING_CATALOG.filter(
    (op) => op.targetCategory === store.category || true
  ).slice(0, 2);

  const handleAction = (
    op: CrossSellingOpportunity,
    action: 'sample_delivered' | 'manager_interested' | 'catalog_shared'
  ) => {
    const brand = brands.find((b) => b.id === op.complementaryBrandId);
    const product = products.find((p) => p.id === op.complementaryProductId);

    recordCrossSellingLead({
      storeId: store.id,
      storeName: store.name,
      brandId: op.complementaryBrandId,
      brandName: brand?.name || 'Marca Hecho en Ags',
      productId: op.complementaryProductId,
      productName: product?.name || 'Producto Sugerido',
      driverId: currentUser?.id || 'user-driver-1',
      driverName: currentUser?.name || 'Repartidor de Ruta',
      action,
      notes:
        action === 'sample_delivered'
          ? `Muestra física entregada a ${store.managerName} durante la ruta.`
          : `Encargado(a) ${store.managerName} mostró interés y solicitó cotización de mayoreo.`,
      status: 'pending_review',
    });

    setSuccessNote(`¡Registro guardado! La marca ${brand?.name} y la administración fueron notificados.`);
    setTimeout(() => setSuccessNote(null), 3500);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 border border-orange-200/80 rounded-[24px] p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Módulo de Venta Cruzada (Cross-Selling)
              </h4>
              <span className="text-[10px] bg-[#D4F63D] text-slate-900 font-extrabold px-2 py-0.2 rounded-full">
                Oportunidades
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Ofrece catálogo o muestras de marcas hidrocálidas complementarias en {store.name}
            </p>
          </div>
        </div>
      </div>

      {successNote && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successNote}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {relevantOpportunities.map((op) => {
          const brand = brands.find((b) => b.id === op.complementaryBrandId);
          const product = products.find((p) => p.id === op.complementaryProductId);

          return (
            <div
              key={op.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-orange-600">{brand?.name}</span>
                  <span className="text-[10px] text-slate-700 bg-slate-100 font-bold px-2 py-0.5 rounded-md font-mono">
                    ${product?.suggestedRetailPrice} PVP
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                  {product?.name}
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                  "{op.pitchPrompt}"
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleAction(op, 'sample_delivered')}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Gift className="w-3 h-3 text-orange-600" /> Dejar Muestra
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(op, 'manager_interested')}
                  className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="w-3 h-3" /> Encargado Interesado
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
