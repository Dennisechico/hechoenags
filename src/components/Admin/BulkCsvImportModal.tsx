import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AguascalientesZone, BrandCategory, Product, Store } from '../../types';
import { X, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface BulkCsvImportModalProps {
  mode: 'products' | 'stores';
  defaultBrandId?: string;
  onClose: () => void;
}

const PRODUCT_TEMPLATE = `marca,nombre,sabor,sku,codigo_barras,unidad,costo,precio_publico,stock_inicial
Mi Marca Local,Salsa Macha Artesanal,Arándano y Chipotle,SAL-AR-01,7501000000011,frasco 250g,55,95,40
Mi Marca Local,Granola Orgánica,Cacao y Miel,GRA-CA-02,7501000000028,bolsa 400g,48,85,30`;

const STORE_TEMPLATE = `nombre,categoria,direccion,zona,lat,lng,encargado,telefono,horario
Tienda Centro Demo,Concept Store,Av. Madero #210 Centro Aguascalientes,Centro Histórico & San Marcos,21.8821,-102.2948,Encargado Centro,4491234567,09:00 - 20:00 hrs
Café Norte Demo,Cafetería Especializada,Av. Colosio #500 Aguascalientes,Norte (Campestre / Colosio / Altaria),21.9188,-102.3125,Encargado Norte,4497654321,08:30 - 21:00 hrs`;

function parseCsvLines(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Handle comma or tab/semicolon separated CSV/Excel pastes
      const sep = line.includes('\t') ? '\t' : line.includes(';') && !line.includes(',') ? ';' : ',';
      return line.split(sep).map((cell) => cell.replace(/^"|"$/g, '').trim());
    });
}

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  mode,
  defaultBrandId,
  onClose,
}) => {
  const { brands, addMultipleProducts, bulkImportStores } = useApp();
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrandId || brands[0]?.id || '');
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleDownloadTemplate = () => {
    const content = mode === 'products' ? PRODUCT_TEMPLATE : STORE_TEMPLATE;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'products' ? 'plantilla_productos_ags.csv' : 'plantilla_tiendas_ags.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawText(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setErrorMsg(null);
    const rows = parseCsvLines(rawText);
    if (rows.length === 0) {
      setErrorMsg('Pega los datos o carga un archivo CSV/Excel primero.');
      return;
    }

    // Skip header row if detected
    const first = rows[0].join(' ').toLowerCase();
    const dataRows =
      first.includes('nombre') || first.includes('sku') || first.includes('direccion')
        ? rows.slice(1)
        : rows;

    if (dataRows.length === 0) {
      setErrorMsg('El archivo solo contiene encabezados, sin filas de datos.');
      return;
    }

    if (mode === 'products') {
      const targetBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
      if (!targetBrand) {
        setErrorMsg('Primero debes registrar al menos una Marca para importar productos.');
        return;
      }

      const toCreate: Omit<Product, 'id'>[] = dataRows.map((cols, idx) => {
        // Support both 8-col (without marca) and 9-col (with marca)
        const hasBrandCol = cols.length >= 9;
        const offset = hasBrandCol ? 1 : 0;
        const name = cols[offset] || `Producto Importado ${idx + 1}`;
        const flavor = cols[offset + 1] || 'Original';
        const sku =
          cols[offset + 2] ||
          `${targetBrand.name.slice(0, 3).toUpperCase()}-CSV-${Date.now().toString().slice(-3)}-${idx + 1}`;
        const barcode =
          cols[offset + 3] ||
          `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13);
        const unit = cols[offset + 4] || 'pza';
        const costPrice = Math.max(0, Number(cols[offset + 5]) || 50);
        const suggestedRetailPrice = Math.max(costPrice, Number(cols[offset + 6]) || 90);
        const stock = Math.max(0, Math.round(Number(cols[offset + 7]) || 0));

        return {
          brandId: targetBrand.id,
          name,
          flavor,
          sku,
          barcode,
          description: `${name} (${flavor}) - Importado por CSV`,
          category: (targetBrand.category || 'Alimentos & Dulces Típicos') as BrandCategory,
          unit,
          costPrice,
          suggestedRetailPrice,
          centralWarehouseStock: stock,
          minStockAlert: 10,
        };
      });

      const created = addMultipleProducts(toCreate);
      setImportedCount(created.length);
    } else {
      const toCreate: Omit<Store, 'id'>[] = dataRows.map((cols, idx) => {
        const name = cols[0] || `Sucursal Importada ${idx + 1}`;
        const catRaw = cols[1] || 'Concept Store';
        const category: Store['category'] =
          catRaw === 'Boutique Local' ||
          catRaw === 'Cafetería Especializada' ||
          catRaw === 'Mercado Gourmet' ||
          catRaw === 'Librería & Bazar'
            ? catRaw
            : 'Concept Store';
        const address = cols[2] || 'Aguascalientes, Ags.';
        const zoneRaw = (cols[3] || '').toLowerCase();
        const zone: AguascalientesZone = zoneRaw.includes('norte')
          ? 'Norte (Campestre / Colosio / Altaria)'
          : zoneRaw.includes('sur')
            ? 'Sur (Las Américas / Mahatma Gandhi)'
            : zoneRaw.includes('oriente')
              ? 'Oriente & Tres Centurias'
              : 'Centro Histórico & San Marcos';
        const lat = Number(cols[4]) || 21.8853;
        const lng = Number(cols[5]) || -102.2916;
        const managerName = cols[6] || 'Encargado en Sucursal';
        const phone = cols[7] || '';
        const openingHours = cols[8] || '09:00 - 20:00 hrs';

        return {
          name,
          category,
          address,
          zone,
          coordinates: { lat, lng },
          managerName,
          phone,
          whatsapp: phone.replace(/\D/g, '') ? `52${phone.replace(/\D/g, '')}` : '',
          openingHours,
          deliveryNotes: 'Importado mediante carga masiva CSV',
          activeBrands: [],
          performance: {
            score: 90,
            ratingTier: 'alto',
            monthlyVolumePieces: 180,
            avgTicketMXN: 1750,
            deliverySuccessPct: 98,
            turnoverDays: 5,
          },
        };
      });

      const created = bulkImportStores(toCreate);
      setImportedCount(created.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="bg-[#FAFBFD] px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Carga Masiva CSV / Excel — {mode === 'products' ? 'Productos' : 'Puntos de Venta'}
              </h3>
              <p className="text-xs text-slate-500">
                Importa múltiples registros pegando desde Excel o subiendo un archivo .csv
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {mode === 'products' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Marca destino para los productos importados
              </label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {brands.length === 0 ? (
                  <option value="">No hay marcas registradas aún</option>
                ) : (
                  brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Subir archivo .CSV / .TXT</span>
              <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawText(mode === 'products' ? PRODUCT_TEMPLATE : STORE_TEMPLATE)}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
              >
                Cargar Ejemplo
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla CSV</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contenido CSV o celdas copiadas desde Excel (separado por comas o tabulador)
            </label>
            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={mode === 'products' ? PRODUCT_TEMPLATE : STORE_TEMPLATE}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-mono text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {importedCount !== null && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Se importaron {importedCount} registros correctamente!</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-[#FAFBFD] border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer transition shadow-sm"
          >
            Importar Registros
          </button>
        </div>
      </div>
    </div>
  );
};
