import React, { useState } from 'react';
import { Brand, Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { EditProductModal } from '../Common/EditProductModal';
import { DeleteProductConfirmModal } from '../Common/DeleteProductConfirmModal';
import {
  X,
  Package,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Boxes,
  Layers,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface BrandProductsModalProps {
  brand: Brand;
  onClose: () => void;
}

export const BrandProductsModal: React.FC<BrandProductsModalProps> = ({ brand, onClose }) => {
  const { products, addNewProduct } = useApp();

  const brandProducts = products.filter((p) => p.brandId === brand.id);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Quick Add Product Form inside modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newUnit, setNewUnit] = useState('pza');
  const [newCostPrice, setNewCostPrice] = useState<number | string>(60);
  const [newRetailPrice, setNewRetailPrice] = useState<number | string>(100);
  const [newStock, setNewStock] = useState<number | string>(30);
  const [newDescription, setNewDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }
    const brandPrefix = brand.name.slice(0, 3).toUpperCase();
    const skuCode = newSku.trim() || `${brandPrefix}-${Date.now().toString().slice(-4)}`;

    addNewProduct({
      brandId: brand.id,
      name: newName.trim(),
      sku: skuCode,
      description: newDescription.trim() || `Producto de ${brand.name} elaborado en Aguascalientes`,
      category: brand.category,
      unit: newUnit.trim() || 'pza',
      costPrice: Number(newCostPrice) || 50,
      suggestedRetailPrice: Number(newRetailPrice) || 85,
      centralWarehouseStock: Number(newStock) || 0,
      minStockAlert: 10,
    });

    // Reset form
    setNewName('');
    setNewSku('');
    setNewCostPrice(60);
    setNewRetailPrice(100);
    setNewStock(30);
    setNewDescription('');
    setShowAddForm(false);
    setErrorMsg(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white border border-slate-200/90 rounded-[28px] sm:rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="bg-[#FAFBFD] px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md flex-shrink-0"
                style={{ backgroundColor: brand.accentColor || '#f97316' }}
              >
                {brand.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                    Catálogo de Productos de {brand.name}
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border shrink-0">
                    {brandProducts.length} productos
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Gestión completa de SKUs, edición de precios y eliminación para esta marca
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

          {/* Action Bar */}
          <div className="px-5 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Categoría: <strong className="text-orange-600">{brand.category}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cerrar Formulario' : '+ Añadir Producto a la Marca'}</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Quick Add Product Collapsible Form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateProduct}
                className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/60 to-amber-50/40 border border-orange-200/90 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-orange-200/60">
                  <span className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <Plus className="w-3.5 h-3.5 text-orange-600" />
                    Nuevo Producto para {brand.name}
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Producto <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Miel de Azahar 500g"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código SKU (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. MIE-2026-01 (automático si vacío)"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad</label>
                    <input
                      type="text"
                      placeholder="pza, frasco, etc."
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Costo Mayoreo ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Precio Anaquel ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newRetailPrice}
                      onChange={(e) => setNewRetailPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Stock Inicial Bodega</label>
                    <input
                      type="number"
                      min="0"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white/60 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
                  >
                    Guardar Producto
                  </button>
                </div>
              </form>
            )}

            {/* Products List Table */}
            {brandProducts.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">
                    Esta marca no tiene productos registrados aún
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Haz clic en "+ Añadir Producto a la Marca" para registrar el primer artículo y asignarle existencias.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dar de Alta Primer Producto</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {brandProducts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200/80 text-slate-700 shrink-0 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-200 transition">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {p.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            {p.sku}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                          <span>Unidad: <strong className="text-slate-700">{p.unit}</strong></span>
                          <span>·</span>
                          <span>Costo Mayoreo: <strong className="text-emerald-700 font-mono font-bold">${p.costPrice} MXN</strong></span>
                          <span>·</span>
                          <span>PVP Anaquel: <strong className="text-slate-900 font-mono font-bold">${p.suggestedRetailPrice} MXN</strong></span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                            <Boxes className="w-3 h-3 text-slate-400" />
                            Bodega Central: <strong className="font-mono text-slate-900">{p.centralWarehouseStock} {p.unit}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(p)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Editar información de este producto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingProduct(p)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200/60"
                        title="Eliminar este producto de la marca"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#FAFBFD] px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              Total: <strong>{brandProducts.length}</strong> SKUs registrados para <strong>{brand.name}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals for Edit and Delete */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          brandName={brand.name}
          onClose={() => setEditingProduct(null)}
          onSaved={() => setEditingProduct(null)}
        />
      )}

      {deletingProduct && (
        <DeleteProductConfirmModal
          product={deletingProduct}
          brandName={brand.name}
          onClose={() => setDeletingProduct(null)}
          onDeleted={() => setDeletingProduct(null)}
        />
      )}
    </>
  );
};
