import React from 'react';
import { SettlementCut } from '../../types';
import { X, CheckCircle2, DollarSign, Download, Building2, Store, Calendar, ShieldCheck, Printer } from 'lucide-react';

interface SettlementReceiptModalProps {
  settlement: SettlementCut;
  onClose: () => void;
  onPrint?: () => void;
}

export const SettlementReceiptModal: React.FC<SettlementReceiptModalProps> = ({
  settlement,
  onClose,
  onPrint,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div
        className="bg-white border border-slate-200/90 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden my-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full w-fit mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Comprobante Oficial de Conciliación
          </div>
          <h3 className="text-xl font-black">Corte de Caja & Liquidación</h3>
          <p className="text-xs text-orange-100 font-mono mt-0.5">{settlement.folio}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-white text-xs">
          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-[#FAFBFD] border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
                Monto Neto a Transferir a la Marca
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                ${settlement.netPayableToBrand.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                settlement.status === 'settled'
                  ? 'bg-emerald-100 text-emerald-800'
                  : settlement.status === 'processing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {settlement.status === 'settled'
                ? '✓ Liquidado'
                : settlement.status === 'processing'
                ? 'En Dispersión'
                : 'Pendiente'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-600" /> Marca Beneficiaria:
              </span>
              <span className="font-extrabold text-slate-900">{settlement.brandName}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" /> Punto de Venta Aliado:
              </span>
              <span className="font-bold text-slate-800">{settlement.storeName}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Período Semanal:
              </span>
              <span className="font-mono text-slate-700">{settlement.period}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Unidades Vendidas en Consignación:</span>
              <span className="font-extrabold text-slate-900 font-mono">{settlement.unitsSold} piezas</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">
              Desglose Financiero
            </div>

            <div className="flex justify-between text-slate-700">
              <span>Venta Bruta en Anaquel:</span>
              <span className="font-mono font-bold text-slate-900">
                ${settlement.grossSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>

            <div className="flex justify-between text-rose-600">
              <span>
                Comisión Logística & Espacio ({Math.round(settlement.logisticsCommissionRate * 100)}%):
              </span>
              <span className="font-mono font-bold">
                -${settlement.logisticsCommissionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-black text-sm">
              <span>Total Neto a Pagar:</span>
              <span className="font-mono text-emerald-600">
                ${settlement.netPayableToBrand.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
          </div>

          {/* Transfer Info */}
          {settlement.transferReference && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Referencia Bancaria SPEI:</span>
                <span className="font-mono">{settlement.transferReference}</span>
              </div>
              {settlement.settlementDate && (
                <div className="text-emerald-700 font-medium">
                  Fecha de dispersión: {new Date(settlement.settlementDate).toLocaleString('es-MX')}
                </div>
              )}
            </div>
          )}

          {settlement.notes && (
            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              "{settlement.notes}"
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Recibo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
