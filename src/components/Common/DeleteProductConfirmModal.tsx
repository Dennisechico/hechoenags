import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { Trash2, AlertTriangle, X, Package } from 'lucide-react';

interface DeleteProductConfirmModalProps {
  product: Product;
  brandName?: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteProductConfirmModal: React.FC<DeleteProductConfirmModalProps> = ({
  product,
  brandName,
  onClose,
  onDeleted,
}) => {
  const { deleteProduct } = useApp();

  const handleConfirm = () => {
    deleteProduct(product.id);
    if (onDeleted) {
      onDeleted();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        <div className="bg-rose-50/60 px-5 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Eliminar Producto
              </h3>
              <p className="text-[11px] text-rose-700 font-semibold">
                Confirmación de seguridad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#FAFBFD] border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                SKU: {product.sku}
              </span>
              {brandName && (
                <span className="text-[10px] font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full">
                  {brandName}
                </span>
              )}
            </div>
            <h4 className="text-sm font-extrabold text-slate-900">{product.name}</h4>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
              <span>Bodega: <strong className="font-mono text-slate-900">{product.centralWarehouseStock} {product.unit}</strong></span>
              <span>Costo: <strong className="font-mono text-emerald-600">${product.costPrice} MXN</strong></span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              ¿Estás seguro de que deseas eliminar este producto? Se retirará del catálogo de la marca y de los anaqueles en consignación asignados.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sí, Eliminar Producto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
