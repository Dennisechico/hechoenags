import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../types';
import { X, Camera, QrCode, ScanLine, CheckCircle2, AlertCircle, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  title?: string;
  products: Product[];
  onScanProduct: (product: Product) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  title = 'Escáner de Código de Barras / QR',
  products,
  onScanProduct,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedMsg, setLastScannedMsg] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const matchProductByCode = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return;
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.id.toLowerCase() === clean
    );
    if (found) {
      onScanProduct(found);
      setLastScannedMsg(`+1 ${found.name}${found.flavor ? ` (${found.flavor})` : ''}`);
      setScanError(null);
      setManualCode('');
    } else {
      setScanError(`Código "${code}" no coincide con ningún SKU o código de barras registrado.`);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Cámara no disponible en este navegador; usa el lector manual o selección rápida.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }

        // Native BarcodeDetector if supported by Chromium/Android
        const win = window as unknown as {
          BarcodeDetector?: new (opts?: { formats: string[] }) => {
            detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        };
        if (win.BarcodeDetector && videoRef.current) {
          const detector = new win.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a'],
          });
          let lastCode = '';
          let lastTime = 0;

          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) {
                const raw = codes[0].rawValue;
                const now = Date.now();
                if (raw && (raw !== lastCode || now - lastTime > 1200)) {
                  lastCode = raw;
                  lastTime = now;
                  matchProductByCode(raw);
                }
              }
            } catch {
              // ignore frame detection errors
            }
            rafId = requestAnimationFrame(() => void tick());
          };
          rafId = requestAnimationFrame(() => void tick());
        }
      } catch {
        setCameraError('Sin permiso de cámara o entorno iframe restringido; usa pistola/teclado o toque rápido.');
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    matchProductByCode(manualCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black">{title}</h3>
              <p className="text-[11px] text-slate-400">Escanea código EAN/QR por producto y sabor (+1 pza por lectura)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Camera viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-44 flex items-center justify-center">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-20'}`}
            />
            {cameraActive ? (
              <div className="absolute inset-4 border-2 border-dashed border-amber-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-7 h-7 text-slate-500 mb-1.5" />
                <p className="text-xs font-semibold text-slate-300 max-w-xs">
                  {cameraError || 'Iniciando cámara del dispositivo...'}
                </p>
              </div>
            )}
          </div>

          {lastScannedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Escaneado: {lastScannedMsg}</span>
            </div>
          )}

          {scanError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Barcode input (also works with Bluetooth/USB scanner gun) */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              Lector Bluetooth / Código de Barras o SKU manual
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej. 7501234567890 o SKU"
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer transition"
              >
                Registrar
              </button>
            </div>
          </form>

          {/* Quick tap QR/Barcode simulator list for registered products */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Lectura Rápida de Códigos Registrados ({products.length})
            </span>
            {products.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Aún no hay productos registrados en catálogo.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => matchProductByCode(p.barcode || p.sku)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition text-left cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {p.name} {p.flavor ? `· ${p.flavor}` : ''}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        EAN/QR: {p.barcode || p.sku} · SKU: {p.sku}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black shrink-0">
                      +1 Escanear
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:bg-slate-800 transition"
          >
            Terminar Escaneo
          </button>
        </div>
      </div>
    </div>
  );
};
