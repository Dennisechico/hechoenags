import React, { useState } from 'react';
import { Product, BrandCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Package, CheckCircle2, DollarSign, Boxes, AlertTriangle, Layers, Tag } from 'lucide-react';

interface EditProductModalProps {
  product: Product;
  brandName?: string;
  onClose: () => void;
  onSaved?: (updated: Product) => void;
}

const CATEGORIES: BrandCategory[] = [
  'Alimentos & Dulces Típicos',
  'Café de Especialidad',
  'Cervecería & Vinos Artesanales',
  'Cosmética Natural & Bienestar',
  'Textil & Confección de Tradición',
  'Artesanías & Cerámica',
  'Joyería & Marroquinería',
];

const COMMON_UNITS = [
  'pza',
  'frasco 250g',
  'frasco 500g',
  'botella 355ml',
  'botella 750ml',
  'paquete 250g',
  'paquete 500g',
  'caja 12 pzas',
  'bolsa 1kg',
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  brandName,
  onClose,
  onSaved,
}) => {
  const { updateProduct } = useApp();

  const [name, setName] = useState(product.name);
  const [flavor, setFlavor] = useState(product.flavor || '');
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [description, setDescription] = useState(product.description || '');
  const [category, setCategory] = useState<BrandCategory>(product.category);
  const [unit, setUnit] = useState(product.unit || 'pza');
  const [costPrice, setCostPrice] = useState<number | string>(product.costPrice);
  const [suggestedRetailPrice, setSuggestedRetailPrice] = useState<number | string>(
    product.suggestedRetailPrice
  );
  const [minStockAlert, setMinStockAlert] = useState<number | string>(product.minStockAlert || 10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }
    const cost = Number(costPrice);
    const retail = Number(suggestedRetailPrice);
    const minAlert = Number(minStockAlert);

    if (isNaN(cost) || cost < 0) {
      setErrorMsg('El costo unitario debe ser un número válido mayor o igual a 0.');
      return;
    }
    if (isNaN(retail) || retail < 0) {
      setErrorMsg('El precio sugerido al público debe ser un número válido.');
      return;
    }

    const updates: Partial<Product> = {
      name: name.trim(),
      flavor: flavor.trim() || undefined,
      sku: sku.trim() || product.sku,
      barcode: barcode.trim() || product.barcode,
      description: description.trim(),
      category,
      unit: unit.trim() || 'pza',
      costPrice: cost,
      suggestedRetailPrice: retail,
      minStockAlert: Math.max(1, minAlert || 5),
    };

    updateProduct(product.id, updates);
    if (onSaved) {
      onSaved({ ...product, ...updates });
    }
    onClose();
  };

  const calculatedMargin =
    Number(costPrice) > 0 && Number(suggestedRetailPrice) > Number(costPrice)
      ? Math.round(((Number(suggestedRetailPrice) - Number(costPrice)) / Number(suggestedRetailPrice)) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[28px] sm:rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBFD] px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  Editar Producto
                </h3>
                {brandName && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                    {brandName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">
                SKU Actual: {product.sku}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name & Flavor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Producto <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Salsa Artesanal"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sabor / Variante
              </label>
              <input
                type="text"
                value={flavor}
                onChange={(e) => setFlavor(e.target.value)}
                placeholder="ej. Fresa, Mango, Original"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* SKU, Barcode & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código SKU
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                placeholder="ej. MIE-2026-01"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Barras / QR
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.trim())}
                placeholder="EAN-13 / QR"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoría Hecho en Ags
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BrandCategory)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unidad de Venta
              </label>
              <input
                type="text"
                list="common-units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ej. frasco 250g"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
              <datalist id="common-units">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción Breve
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción para tickets y catálogo"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Prices & Margins */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 via-[#FAFBFD] to-orange-50/40 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                Precios & Margen Operativo
              </span>
              {calculatedMargin > 0 && (
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Margen: {calculatedMargin}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Costo Mayoreo / Consignación (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Lo que se liquidará a la marca por pieza vendida.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Precio Sugerido al Público / Anaquel (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={suggestedRetailPrice}
                    onChange={(e) => setSuggestedRetailPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Precio final de venta en punto de venta.
                </span>
              </div>
            </div>
          </div>

          {/* Inventories (Read-Only Computed Ledger) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stock Actual en Bodega (Solo lectura · Kardex)
              </label>
              <div className="relative">
                <Boxes className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  readOnly
                  disabled
                  value={product.centralWarehouseStock}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-600 font-mono font-bold cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">
                Calculado por movimientos. Para modificar registra una Entrada, Merma o Ajuste en Almacén.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alerta de Stock Mínimo (pzas)
              </label>
              <input
                type="number"
                min="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Notifica cuando la bodega baje de esta cantidad.
              </span>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
