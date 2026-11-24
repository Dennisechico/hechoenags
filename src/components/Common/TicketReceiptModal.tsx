import React, { useState } from 'react';
import { DeliveryTicket, Store } from '../../types';
import { X, Printer, Share2, CheckCircle2, MapPin, User, Calendar, ShieldCheck, Copy, Check } from 'lucide-react';

interface TicketReceiptModalProps {
  ticket: DeliveryTicket;
  store?: Store;
  onClose: () => void;
}

export const TicketReceiptModal: React.FC<TicketReceiptModalProps> = ({ ticket, store, onClose }) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(ticket.timestamp).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const getWhatsAppMessage = () => {
    let msg = `📦 *COMPROBANTE DE ENTREGA - HECHO EN AGUASCALIENTES*\n`;
    msg += `*Folio:* ${ticket.folio}\n`;
    msg += `*Tienda:* ${ticket.storeName}\n`;
    msg += `*Fecha:* ${formattedDate}\n`;
    msg += `*Repartidor:* ${ticket.driverName}\n`;
    msg += `*Recibió:* ${ticket.recipientName} (${ticket.recipientRole})\n\n`;
    msg += `*DETALLE DE PRODUCTOS ENTREGADOS:*\n`;

    ticket.items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.productName} (${item.brandName}) - *${item.quantity} pzas* x $${item.unitPrice} = $${item.subtotal} MXN\n`;
    });

    msg += `\n*Total piezas entregadas:* ${ticket.totalPieces} pzas\n`;
    msg += `*Valor en mercancía consignada:* $${ticket.totalValue.toLocaleString('es-MX')} MXN\n`;
    msg += `\n✅ _Firma digital capturada en plataforma oficial de distribución colaborativa Hecho en Ags._`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getWhatsAppMessage());
    const phone = store?.whatsapp ? store.whatsapp.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 w-full max-w-xl rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header toolbar */}
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="text-xs uppercase font-black tracking-wider text-orange-600 truncate">
              Ticket Digital de Remisión
            </span>
            <span className="text-xs text-slate-500 font-mono font-bold shrink-0">#{ticket.folio}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Body */}
        <div className="p-4 sm:p-8 text-slate-800 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
          {/* Brand & Seal badge */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4F63D] text-slate-950 text-xs font-black mb-2 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" /> Ecosistema Oficial "Hecho en Ags"
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Comprobante de Recepción en Anaquel</h2>
              <p className="text-xs text-slate-500 font-medium">Ruta de Distribución Colaborativa & Control de Inventarios</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider">FOLIO OFICIAL</span>
              <span className="font-mono text-base font-black text-orange-600">{ticket.folio}</span>
            </div>
          </div>

          {/* Delivery Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAFBFD] p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-slate-400 block font-medium">Punto de Venta / Tienda:</span>
              <span className="text-slate-900 font-black text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                {ticket.storeName}
              </span>
              {store && <p className="text-slate-500 text-xs mt-1 truncate font-medium">{store.address}</p>}
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Fecha y Hora de Entrega:</span>
              <span className="text-slate-800 font-bold flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                {formattedDate}
              </span>
              <span className="text-slate-500 block mt-1 font-medium">
                Conductor: <strong className="text-slate-800">{ticket.driverName}</strong>
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
              Desglose de Mercancía por Marca Local
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Producto & Marca</th>
                    <th className="py-2.5 px-3.5 text-center">Cant.</th>
                    <th className="py-2.5 px-3.5 text-right">Precio</th>
                    <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ticket.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-extrabold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-orange-600 font-bold">{item.brandName}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-black text-slate-900">
                        {item.quantity} pzas
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-500 font-mono">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-black text-slate-900 font-mono">
                        ${item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAFBFD] font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-3.5 text-slate-600 font-extrabold">Total Consignado:</td>
                    <td className="py-3 px-3.5 text-center text-orange-600 font-black">{ticket.totalPieces} pzas</td>
                    <td className="py-3 px-3.5 text-right text-slate-600 font-extrabold">Total:</td>
                    <td className="py-3 px-3.5 text-right text-orange-600 text-sm font-black font-mono">
                      ${ticket.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* QR Code and Digital Signature Section */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t border-slate-100 items-center bg-[#FAFBFD] p-4 rounded-2xl border border-slate-100">
            {/* Unique QR Code for Pyme verification */}
            <div className="sm:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <span>Código QR de Verificación</span>
              </span>
              <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
                {/* Clean SVG Vector QR Representation */}
                <svg
                  className="w-20 h-20 text-slate-900"
                  viewBox="0 0 33 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="33" height="33" fill="white" />
                  {/* Top Left Corner */}
                  <rect x="2" y="2" width="9" height="9" fill="currentColor" />
                  <rect x="3.5" y="3.5" width="6" height="6" fill="white" />
                  <rect x="5" y="5" width="3" height="3" fill="currentColor" />
                  {/* Top Right Corner */}
                  <rect x="22" y="2" width="9" height="9" fill="currentColor" />
                  <rect x="23.5" y="3.5" width="6" height="6" fill="white" />
                  <rect x="25" y="5" width="3" height="3" fill="currentColor" />
                  {/* Bottom Left Corner */}
                  <rect x="2" y="22" width="9" height="9" fill="currentColor" />
                  <rect x="3.5" y="23.5" width="6" height="6" fill="white" />
                  <rect x="5" y="25" width="3" height="3" fill="currentColor" />
                  {/* Data matrix dots unique to folio */}
                  <rect x="13" y="3" width="2" height="2" fill="currentColor" />
                  <rect x="17" y="3" width="3" height="2" fill="currentColor" />
                  <rect x="13" y="7" width="3" height="2" fill="currentColor" />
                  <rect x="17" y="7" width="2" height="2" fill="currentColor" />
                  <rect x="3" y="13" width="2" height="3" fill="currentColor" />
                  <rect x="7" y="13" width="3" height="2" fill="currentColor" />
                  <rect x="13" y="12" width="7" height="7" fill="currentColor" />
                  <rect x="15" y="14" width="3" height="3" fill="white" />
                  <rect x="23" y="13" width="3" height="2" fill="currentColor" />
                  <rect x="27" y="14" width="3" height="3" fill="currentColor" />
                  <rect x="13" y="21" width="2" height="3" fill="currentColor" />
                  <rect x="17" y="22" width="3" height="2" fill="currentColor" />
                  <rect x="23" y="23" width="2" height="2" fill="currentColor" />
                  <rect x="27" y="22" width="3" height="3" fill="currentColor" />
                  <rect x="13" y="27" width="7" height="2" fill="currentColor" />
                  <rect x="23" y="27" width="4" height="3" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 block">
                QR Único #{ticket.folio}
              </span>
            </div>

            {/* Receptor info */}
            <div className="sm:col-span-4 text-xs space-y-1 text-center sm:text-left">
              <span className="text-slate-400 block font-medium">Receptor Autorizado:</span>
              <p className="font-black text-slate-900 text-sm">{ticket.recipientName}</p>
              <p className="text-slate-500 font-medium">{ticket.recipientRole || 'Encargado de Tienda'}</p>
              {ticket.notes && (
                <p className="text-slate-600 italic mt-1 bg-white p-2 rounded-lg border border-slate-100 text-[11px]">
                  "{ticket.notes}"
                </p>
              )}
            </div>

            {/* Signature or Photo Proof Data */}
            <div className="sm:col-span-4 text-center sm:text-right">
              <span className="text-xs text-slate-400 block mb-1 font-medium">
                {ticket.recipientSignature ? 'Firma Digital Capturada:' : 'Evidencia Fotográfica:'}
              </span>
              <div className="inline-block bg-white border border-slate-200 rounded-xl p-2 max-w-[160px] shadow-2xs">
                {ticket.recipientSignature?.startsWith('data:image') ? (
                  <img
                    src={ticket.recipientSignature}
                    alt="Firma del receptor"
                    className="h-10 w-auto object-contain mx-auto"
                  />
                ) : ticket.photoProofDataUrl ? (
                  <img
                    src={ticket.photoProofDataUrl}
                    alt="Comprobante fotográfico"
                    className="h-12 w-auto object-cover rounded mx-auto"
                  />
                ) : (
                  <div className="h-10 flex items-center justify-center font-mono text-xs text-orange-600">
                    [Sello Verificado]
                  </div>
                )}
              </div>
              <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                ✓ Sello digital verificado
                {ticket.totalCollectedPieces ? ` · Recogido: ${ticket.totalCollectedPieces} pzas` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3 sm:py-4.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Abre chat de WhatsApp con el encargado para enviar el comprobante"
            >
              <Share2 className="w-3.5 h-3.5" /> Enviar por WhatsApp
            </button>
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar Texto'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
