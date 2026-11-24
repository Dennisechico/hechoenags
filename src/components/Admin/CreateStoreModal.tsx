import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AguascalientesZone, Store } from '../../types';
import { GoogleAddressPinPicker } from '../Common/GoogleAddressPinPicker';
import { calculateRouteInsertionOptions } from '../../utils/routeOptimizer';
import {
  X,
  Store as StoreIcon,
  CheckCircle2,
  Truck,
  Sparkles,
  Navigation,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface CreateStoreModalProps {
  onClose: () => void;
  onSuccess?: (store: Store) => void;
  initialRouteId?: string;
}

const ZONES: { name: AguascalientesZone; defaultCoords: { lat: number; lng: number } }[] = [
  { name: 'Centro Histórico & San Marcos', defaultCoords: { lat: 21.8810, lng: -102.2980 } },
  { name: 'Norte (Campestre / Colosio / Altaria)', defaultCoords: { lat: 21.9210, lng: -102.3090 } },
  { name: 'Sur (Las Américas / Mahatma Gandhi)', defaultCoords: { lat: 21.8650, lng: -102.2990 } },
  { name: 'Oriente & Tres Centurias', defaultCoords: { lat: 21.8880, lng: -102.2790 } },
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  onClose,
  onSuccess,
  initialRouteId,
}) => {
  const {
    addNewStore,
    brands,
    routes,
    stores,
    idealStoreStock,
    addStoreToRoute,
    selectActiveRoute,
    setActiveAdminTab,
  } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Store['category']>('Cafetería Especializada');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState<AguascalientesZone>('Centro Histórico & San Marcos');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 21.881,
    lng: -102.298,
  });
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [openingHours, setOpeningHours] = useState('09:00 - 20:00 hrs');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [assignedRouteId, setAssignedRouteId] = useState<string>(initialRouteId || 'none');
  const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleZoneChange = (newZone: AguascalientesZone) => {
    setZone(newZone);
    const zObj = ZONES.find((z) => z.name === newZone);
    if (zObj && !address.trim()) {
      setCoordinates(zObj.defaultCoords);
    }
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  // Live Insertion Cost suggestions across existing routes
  const insertionOptions = useMemo(
    () =>
      calculateRouteInsertionOptions(
        coordinates.lat,
        coordinates.lng,
        openingHours,
        routes,
        stores,
        idealStoreStock
      ),
    [coordinates.lat, coordinates.lng, openingHours, routes, stores, idealStoreStock]
  );

  const loadPreset = (preset: 'centro' | 'norte' | 'sur') => {
    if (preset === 'centro') {
      setName('Boutique & Café La Saturnina');
      setCategory('Cafetería Especializada');
      setZone('Centro Histórico & San Marcos');
      setAddress('Andador Arturo J. Pani #118, Barrio de San Marcos, CP 20070');
      setCoordinates({ lat: 21.8803, lng: -102.3018 });
      setManagerName('Encargado(a) de Mostrador');
      setPhone('449-918-2026');
      setWhatsapp('524491234567');
      setOpeningHours('09:00 - 20:00 hrs');
      setDeliveryNotes('Recepción en barra principal, acceso por andador peatonal.');
      setSelectedBrands(brands.slice(0, 3).map((b) => b.id));
    } else if (preset === 'norte') {
      setName('Concept Store Campestre Bosques');
      setCategory('Concept Store');
      setZone('Norte (Campestre / Colosio / Altaria)');
      setAddress('Av. Luis Donaldo Colosio #450, Bosques del Prado, CP 20120');
      setCoordinates({ lat: 21.9221, lng: -102.3045 });
      setManagerName('Encargado(a) Campestre');
      setPhone('449-914-8899');
      setWhatsapp('524499876543');
      setOpeningHours('10:00 - 19:30 hrs');
      setDeliveryNotes('Estacionamiento en bahía de carga lateral con rampa.');
      setSelectedBrands(brands.slice(1, 4).map((b) => b.id));
    } else {
      setName('Mercado Gourmet Las Américas');
      setCategory('Mercado Gourmet');
      setZone('Sur (Las Américas / Mahatma Gandhi)');
      setAddress('Av. Las Américas #302, Fracc. Las Américas, CP 20230');
      setCoordinates({ lat: 21.8648, lng: -102.2974 });
      setManagerName('Encargado(a) Las Américas');
      setPhone('449-978-5544');
      setWhatsapp('524495556677');
      setOpeningHours('08:30 - 18:00 hrs');
      setDeliveryNotes('Timbrar en almacén de recepción posterior.');
      setSelectedBrands(brands.slice(0, 4).map((b) => b.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa el nombre de la tienda o establecimiento.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Por favor ingresa o selecciona la dirección física en el mapa.');
      return;
    }
    if (!managerName.trim()) {
      setErrorMsg('Por favor indica el nombre del encargado o contacto en el punto de entrega.');
      return;
    }

    const createdStore = addNewStore({
      name: name.trim(),
      category,
      address: address.trim(),
      zone,
      coordinates,
      managerName: managerName.trim(),
      phone: phone.trim() || '449-000-0000',
      whatsapp: whatsapp.trim() || '524490000000',
      openingHours: openingHours.trim(),
      deliveryNotes: deliveryNotes.trim(),
      activeBrands: selectedBrands.length > 0 ? selectedBrands : brands.slice(0, 2).map((b) => b.id),
    });

    if (assignedRouteId && assignedRouteId !== 'none') {
      addStoreToRoute(assignedRouteId, createdStore.id, insertAtIndex);
      selectActiveRoute(assignedRouteId);
      setActiveAdminTab('routes');
    } else {
      setActiveAdminTab('stores');
    }

    if (onSuccess) onSuccess(createdStore);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in max-h-[92vh] flex flex-col">
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-orange-100 text-orange-600 shadow-xs shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  Añadir Punto de Entrega + Costo de Inserción
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Autocompletado Google Places, pin exacto y asignación automática a la mejor ruta
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

        <div className="bg-slate-50/90 px-4 sm:px-6 py-2 sm:py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Carga rápida para pruebas:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadPreset('centro')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 text-slate-700 text-[11px] font-bold hover:text-orange-600 transition cursor-pointer"
            >
              San Marcos
            </button>
            <button
              type="button"
              onClick={() => loadPreset('norte')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 text-[11px] font-bold hover:text-blue-600 transition cursor-pointer"
            >
              Colosio (Norte)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('sur')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 text-[11px] font-bold hover:text-emerald-600 transition cursor-pointer"
            >
              Las Américas (Sur)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Comercial de la Tienda / Negocio <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej. Concept Store Triana o Bazar Gourmet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giro / Tipo de Establecimiento
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Store['category'])}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
              >
                <option value="Concept Store">Concept Store</option>
                <option value="Boutique Local">Boutique Local</option>
                <option value="Cafetería Especializada">Cafetería Especializada</option>
                <option value="Mercado Gourmet">Mercado Gourmet</option>
                <option value="Librería & Bazar">Librería & Bazar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Zona de Aguascalientes
              </label>
              <select
                value={zone}
                onChange={(e) => handleZoneChange(e.target.value as AguascalientesZone)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
              >
                {ZONES.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Google Places Autocomplete & Map Pin Confirmation */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Dirección con Autocompletado & Confirmación en Mapa (GPS) <span className="text-orange-500">*</span>
              </label>
              <GoogleAddressPinPicker
                address={address}
                coordinates={coordinates}
                onLocationChange={(loc) => {
                  setAddress(loc.address);
                  setCoordinates({ lat: loc.lat, lng: loc.lng });
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Encargado(a) o Receptor <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej. Encargado en sucursal"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horario de Recepción
              </label>
              <input
                type="text"
                placeholder="ej. 09:00 - 20:00 hrs"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono de Tienda
              </label>
              <input
                type="tel"
                placeholder="449-000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp (Remisión Digital)
              </label>
              <input
                type="tel"
                placeholder="524491234567"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Instrucciones de Descarga
              </label>
              <input
                type="text"
                placeholder="ej. Estacionar en bahía lateral y timbrar en recepción"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            {/* Insertion Cost Suggestions across existing routes */}
            <div className="sm:col-span-2 p-3.5 bg-gradient-to-br from-orange-50/80 to-amber-50/70 border border-orange-200/90 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-black text-orange-950">
                    Sugerencias por Costo de Inserción en Rutas Existentes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAssignedRouteId('none');
                    setInsertAtIndex(undefined);
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer ${
                    assignedRouteId === 'none'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Sin ruta por ahora
                </button>
              </div>

              <p className="text-[11px] text-orange-900 leading-snug">
                Calculado automáticamente según el mejor lugar de la secuencia, límite de paradas, horario y capacidad de camioneta:
              </p>

              <div className="space-y-2">
                {insertionOptions.map((opt, idx) => {
                  const isSelected = assignedRouteId === opt.route.id;
                  const visitDaysLabel =
                    opt.route.visitDays && opt.route.visitDays.length > 0
                      ? ` (${opt.route.visitDays.join(', ')})`
                      : '';
                  const isRecommended = idx === 0 && opt.fitsMaxStops && opt.fitsCapacity;

                  return (
                    <button
                      key={opt.route.id}
                      type="button"
                      onClick={() => {
                        setAssignedRouteId(opt.route.id);
                        setInsertAtIndex(opt.bestInsertIndex);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                          : 'bg-white/85 border-orange-200/70 hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {opt.route.name}{visitDaysLabel}
                          </span>
                          {isRecommended && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Menor costo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono font-bold text-slate-700">
                          <span className="text-orange-700">+{opt.extraDistanceKm} km</span>
                          <span>·</span>
                          <span className="text-blue-700">+{opt.extraMinutes} min</span>
                          <span>·</span>
                          <span>{opt.newStopsCount}/{opt.maxStopsLimit} paradas</span>
                          <span>·</span>
                          <span className="text-slate-500">Posición #{opt.bestInsertIndex + 1}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!opt.fitsMaxStops || !opt.fitsCapacity ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {opt.compatibilityNote}
                          </span>
                        ) : !opt.fitsSchedule ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            Revisar horario
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                            <Truck className="w-3 h-3" />
                            {isSelected ? 'Asignada ✓' : 'Elegir ruta'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {brands.length > 0 && (
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Marcas locales en consignación ({selectedBrands.length} seleccionadas)
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                  {brands.map((brand) => {
                    const isChecked = selectedBrands.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => toggleBrand(brand.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isChecked
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{brand.name}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              <StoreIcon className="w-4 h-4" />
              <span>Guardar Punto de Entrega</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
