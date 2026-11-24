import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AguascalientesZone, DeliveryRoute, Store } from '../../types';
import { CreateStoreModal } from './CreateStoreModal';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';

interface CreateRouteModalProps {
  onClose: () => void;
  onSuccess?: (route: DeliveryRoute) => void;
}

const ZONES: AguascalientesZone[] = [
  'Centro Histórico & San Marcos',
  'Norte (Campestre / Colosio / Altaria)',
  'Sur (Las Américas / Mahatma Gandhi)',
  'Oriente & Tres Centurias',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ onClose, onSuccess }) => {
  const { stores, users, addNewRoute } = useApp();

  const drivers = users.filter((u) => u.role === 'driver');

  const initialZone: AguascalientesZone = 'Centro Histórico & San Marcos';
  const [code, setCode] = useState(`RUTA-AGS-0${Math.floor(Math.random() * 80 + 10)}`);
  const [zone, setZone] = useState<AguascalientesZone>(initialZone);
  const [name, setName] = useState(`Ruta ${initialZone.split(' ')[0]} - Reparto B2B`);
  const [driverId, setDriverId] = useState(drivers[0]?.id || 'user-driver-1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitDays, setVisitDays] = useState<string[]>(['Mar', 'Vie']);
  const [maxStops, setMaxStops] = useState<number>(16);
  const [vanCapacityPieces, setVanCapacityPieces] = useState<number>(450);
  
  // Preselect stores from this zone if available, else first 2
  const [selectedStores, setSelectedStores] = useState<string[]>(() => {
    const zoneStores = stores.filter((s) => s.zone === initialZone);
    if (zoneStores.length > 0) return zoneStores.map((s) => s.id);
    return stores.slice(0, 2).map((s) => s.id);
  });
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmbeddedStoreModal, setShowEmbeddedStoreModal] = useState(false);

  const handleZoneChange = (newZone: AguascalientesZone) => {
    setZone(newZone);
    setName(`Ruta ${newZone.split(' ')[0]} - Reparto B2B`);
    const zoneStores = stores.filter((s) => s.zone === newZone);
    if (zoneStores.length > 0) {
      setSelectedStores(zoneStores.map((s) => s.id));
    }
  };

  const selectAllZoneStores = () => {
    const zoneStores = stores.filter((s) => s.zone === zone);
    setSelectedStores(zoneStores.map((s) => s.id));
  };

  const selectAllStores = () => {
    setSelectedStores(stores.map((s) => s.id));
  };

  const clearSelectedStores = () => {
    setSelectedStores([]);
  };

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...selectedStores];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSelectedStores(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa un nombre descriptivo para la ruta.');
      return;
    }
    if (selectedStores.length === 0) {
      setErrorMsg('Debes seleccionar al menos una tienda o punto de entrega para la ruta.');
      return;
    }

    if (selectedStores.length > maxStops) {
      setErrorMsg(`Esta ruta supera el límite configurado de ${maxStops} paradas máximas.`);
      return;
    }

    const createdRoute = addNewRoute({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      zone,
      driverId,
      date,
      visitDays,
      maxStops,
      vanCapacityPieces,
      scheduledStores: selectedStores,
      completedStoreIds: [],
      status: 'scheduled',
    });

    if (onSuccess) onSuccess(createdRoute);
    onClose();
  };

  const toggleVisitDay = (day: string) => {
    setVisitDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">Planificar Nueva Ruta</h2>
                <span className="text-[10px] bg-[#D4F63D] text-slate-900 font-black px-2 py-0.5 rounded-full shrink-0">
                  Despacho
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Asigna puntos de entrega y un conductor responsable
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código de Ruta <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ej. RUTA-CENTRO-02"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:bg-white focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Zona de Cobertura <span className="text-orange-500">*</span>
              </label>
              <select
                value={zone}
                onChange={(e) => handleZoneChange(e.target.value as AguascalientesZone)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-medium"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Descriptivo de la Ruta <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Ruta Matutina San Marcos & Madero"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Conductor Asignado
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-medium"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.driverZone || 'Unidad Móvil'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha Programada
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Límite Máximo de Paradas
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={maxStops}
                onChange={(e) => setMaxStops(Math.max(1, Number(e.target.value) || 16))}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Capacidad de Camioneta (Piezas)
              </label>
              <input
                type="number"
                min={50}
                value={vanCapacityPieces}
                onChange={(e) => setVanCapacityPieces(Math.max(50, Number(e.target.value) || 450))}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Días de Visita Asignados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = visitDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleVisitDay(day)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-[#F8FAFC] text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stop selector & sequence */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-orange-500" />
                  Puntos de Entrega (Tiendas) en Secuencia: ({selectedStores.length} seleccionadas)
                </label>
                <span className="text-[11px] text-slate-400">Toca las tiendas en el orden en que deben visitarse</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllZoneStores}
                  className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold transition cursor-pointer border border-orange-200"
                >
                  Tiendas de esta zona
                </button>
                <button
                  type="button"
                  onClick={selectAllStores}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Todas ({stores.length})
                </button>
                {selectedStores.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelectedStores}
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowEmbeddedStoreModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#D4F63D] hover:bg-[#c3e32e] text-slate-900 font-black transition cursor-pointer shadow-2xs"
                  title="Dar de alta una nueva tienda sin salir de este formulario"
                >
                  + Nueva Tienda
                </button>
              </div>
            </div>

            {/* Available stores toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2.5 bg-[#F8FAFC] rounded-2xl border border-slate-200">
              {stores.map((store) => {
                const isSelected = selectedStores.includes(store.id);
                const orderIndex = selectedStores.indexOf(store.id);
                const isCurrentZone = store.zone === zone;

                return (
                  <div
                    key={store.id}
                    onClick={() => toggleStore(store.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-white border-orange-500 shadow-2xs'
                        : isCurrentZone
                        ? 'bg-white/90 border-slate-200 hover:border-orange-300'
                        : 'bg-white/50 border-slate-200/70 hover:border-slate-300 opacity-80'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{store.name}</span>
                        {isCurrentZone && (
                          <span className="text-[9px] bg-orange-100 text-orange-700 font-bold px-1 rounded">
                            Zona
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">{store.address}</span>
                    </div>

                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-lg bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                          {orderIndex + 1}
                        </span>
                      ) : (
                        <div className="w-5 h-5 rounded-lg border-2 border-slate-300"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Sequence Preview */}
            {selectedStores.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                  Orden de Entrega Programado:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedStores.map((sId, idx) => {
                    const st = stores.find((s) => s.id === sId);
                    return (
                      <div
                        key={sId}
                        className="bg-white border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="text-orange-600 font-black">#{idx + 1}</span>
                        <span>{st?.name}</span>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveUp(idx);
                            }}
                            className="text-slate-400 hover:text-slate-900 text-[10px] cursor-pointer ml-1"
                            title="Mover antes"
                          >
                            ↑
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-4 h-4" /> Guardar y Programar Ruta
            </button>
          </div>
        </form>

        {/* Embedded Create Store Modal */}
        {showEmbeddedStoreModal && (
          <CreateStoreModal
            onClose={() => setShowEmbeddedStoreModal(false)}
            onSuccess={(newStore: Store) => {
              setShowEmbeddedStoreModal(false);
              setSelectedStores((prev) => [...prev, newStore.id]);
            }}
          />
        )}
      </div>
    </div>
  );
};
