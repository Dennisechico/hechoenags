import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AguascalientesZone, DeliveryRoute } from '../../types';
import {
  PRESET_ORIGINS,
  optimizeShortRoute,
  formatWhatsAppRouteMessage,
  clusterStoresIntoZones,
  isPointInPolygon,
} from '../../utils/routeOptimizer';
import {
  Truck,
  MapPin,
  ExternalLink,
  Navigation,
  Compass,
  Copy,
  Check,
  X,
  Sliders,
  Phone,
  MessageCircle,
  Zap,
  AlertTriangle,
  Route as RouteIcon,
  Layers,
  Pentagon,
  Calendar,
  Trash2,
} from 'lucide-react';

interface SmartRouteGeneratorModalProps {
  onClose: () => void;
  onRouteCreated?: (route: DeliveryRoute) => void;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Map projection bounds matching AgsMapView
const MIN_LAT = 21.86;
const MAX_LAT = 21.95;
const MIN_LNG = -102.348;
const MAX_LNG = -102.255;

function projectToSvg(lat: number, lng: number) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 460 + 20;
  const y = 360 - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 320 - 20;
  return { x: Math.max(20, Math.min(480, x)), y: Math.max(20, Math.min(340, y)) };
}

function unprojectFromSvg(x: number, y: number) {
  const lng = ((x - 20) / 460) * (MAX_LNG - MIN_LNG) + MIN_LNG;
  const lat = ((360 - 20 - y) / 320) * (MAX_LAT - MIN_LAT) + MIN_LAT;
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
}

export const SmartRouteGeneratorModal: React.FC<SmartRouteGeneratorModalProps> = ({
  onClose,
  onRouteCreated,
}) => {
  const { stores, addNewRoute, users, showToast, selectActiveRoute } = useApp();

  const [mode, setMode] = useState<'zone' | 'cluster' | 'polygon'>('zone');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'top90' | 'elite95'>('top90');
  const [selectedOriginId, setSelectedOriginId] = useState<string>('origin-trend-house');
  const [maxStops, setMaxStops] = useState<number>(6);
  const [vanCapacityPieces, setVanCapacityPieces] = useState<number>(450);
  const [visitDays, setVisitDays] = useState<string[]>(['Mar', 'Vie']);
  const [returnToOrigin, setReturnToOrigin] = useState<boolean>(true);
  const [clusterCount, setClusterCount] = useState<number>(3);
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [driverId, setDriverId] = useState<string>(() => {
    const driver = users.find((u) => u.role === 'driver');
    return driver ? driver.id : 'user-driver-1';
  });
  const [copiedText, setCopiedText] = useState(false);

  const currentOrigin = useMemo(
    () => PRESET_ORIGINS.find((o) => o.id === selectedOriginId) || PRESET_ORIGINS[0],
    [selectedOriginId]
  );

  const toggleDay = (d: string) => {
    setVisitDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  // Mode 1: Zone / Performance optimization
  // Mode 3: Polygon selection
  const polygonStores = useMemo(() => {
    if (polygonPoints.length < 3) return [];
    return stores.filter((s) => isPointInPolygon(s.coordinates, polygonPoints));
  }, [stores, polygonPoints]);

  const optimizedResult = useMemo(() => {
    const pool = mode === 'polygon' && polygonPoints.length >= 3 ? polygonStores : stores;
    return optimizeShortRoute(pool, {
      zoneFilter: mode === 'polygon' ? 'all' : selectedZone,
      performanceFilter: mode === 'polygon' ? 'all' : performanceFilter,
      maxStops: maxStops > 0 ? maxStops : undefined,
      origin: currentOrigin,
      returnToOrigin,
    });
  }, [
    mode,
    polygonPoints,
    polygonStores,
    stores,
    selectedZone,
    performanceFilter,
    maxStops,
    currentOrigin,
    returnToOrigin,
  ]);

  // Mode 2: K-Means geographic clustering from scratch
  const clusteredZones = useMemo(
    () => clusterStoresIntoZones(stores, clusterCount, currentOrigin),
    [stores, clusterCount, currentOrigin]
  );

  const handleSvgPolygonClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 500;
    const y = ((e.clientY - rect.top) / rect.height) * 360;
    const coord = unprojectFromSvg(x, y);
    setPolygonPoints((prev) => [...prev, coord]);
  };

  const handleCopyItinerary = () => {
    const text = formatWhatsAppRouteMessage(optimizedResult);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showToast('¡Itinerario copiado al portapapeles!');
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = formatWhatsAppRouteMessage(optimizedResult);
    const driver = users.find((u) => u.id === driverId);
    const phone = driver?.phone ? driver.phone.replace(/[^0-9]/g, '') : '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSaveClusterRoutes = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    let lastCreated: DeliveryRoute | null = null;
    clusteredZones.forEach((cluster, idx) => {
      const dayTag = WEEK_DAYS[idx % WEEK_DAYS.length];
      lastCreated = addNewRoute({
        code: `RUTA-CLUS-${idx + 1}-${Math.floor(10 + Math.random() * 89)}`,
        name: cluster.label,
        zone: cluster.stores[0]?.zone || 'Norte (Campestre / Colosio / Altaria)',
        driverId,
        date: dateStr,
        visitDays: [dayTag],
        maxStops: maxStops || 14,
        vanCapacityPieces,
        scheduledStores: cluster.stores.map((s) => s.id),
        completedStoreIds: [],
        status: 'scheduled',
        transitCorridor: `Clúster automático ${idx + 1} (${cluster.estimatedKm} km · ~${cluster.estimatedMinutes} min)`,
        startPointName: currentOrigin.name,
      });
    });
    if (lastCreated) {
      selectActiveRoute((lastCreated as DeliveryRoute).id);
      if (onRouteCreated) onRouteCreated(lastCreated);
    }
    showToast(`¡${clusteredZones.length} rutas creadas automáticamente por cercanía geográfica!`);
    onClose();
  };

  const handleSaveAndAssign = () => {
    if (mode === 'cluster') {
      handleSaveClusterRoutes();
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const codeNum = Math.floor(10 + Math.random() * 89);
    const code = mode === 'polygon' ? `RUTA-POL-${codeNum}` : `RUTA-OPT-${codeNum}`;

    const zoneLabel: AguascalientesZone =
      selectedZone === 'Norte'
        ? 'Norte (Campestre / Colosio / Altaria)'
        : selectedZone === 'Centro'
          ? 'Centro Histórico & San Marcos'
          : 'Norte (Campestre / Colosio / Altaria)';

    const routeName =
      mode === 'polygon'
        ? `Zona Polígono (${optimizedResult.orderedStores.length} Paradas)`
        : selectedZone === 'all'
          ? `Ruta Corta B2B (${optimizedResult.orderedStores.length} Puntos Top)`
          : `Ruta Corta Zona ${selectedZone} (${optimizedResult.orderedStores.length} Paradas)`;

    const transitCorridorSummary =
      optimizedResult.orderedStores
        .map((s) => s.address.split(',')[0])
        .slice(0, 3)
        .join(', ') + ' y conexiones';

    const newRoute = addNewRoute({
      code,
      name: routeName,
      zone: zoneLabel,
      driverId,
      date: dateStr,
      visitDays: visitDays.length > 0 ? visitDays : ['Mar', 'Vie'],
      maxStops: maxStops || 14,
      vanCapacityPieces,
      zonePolygon: mode === 'polygon' && polygonPoints.length >= 3 ? polygonPoints : undefined,
      scheduledStores: optimizedResult.orderedStores.map((s) => s.id),
      completedStoreIds: [],
      status: 'scheduled',
      transitCorridor: transitCorridorSummary,
      startPointName: `${optimizedResult.origin.name} (${optimizedResult.origin.address})`,
      telemetry: {
        lat: optimizedResult.origin.lat,
        lng: optimizedResult.origin.lng,
        speedKmH: 0,
        heading: 0,
        currentStreet: `Salida desde ${optimizedResult.origin.name}`,
        lastUpdated: new Date().toISOString(),
        isSimulating: false,
      },
    });

    selectActiveRoute(newRoute.id);
    showToast(`¡Ruta ${newRoute.code} optimizada y asignada al chofer con éxito!`);
    if (onRouteCreated) onRouteCreated(newRoute);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 sm:px-6 py-4 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-orange-500/20 shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Rutas Automáticas, Clustering & Zonas en Mapa
                </h2>
                <span className="text-[10px] bg-[#D4F63D] text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  TSP + 2-Opt
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium truncate mt-0.5">
                Genera rutas desde cero por cercanía geográfica, polígono en mapa o alto rendimiento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Bar */}
        <div className="bg-slate-100/90 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-2 shrink-0">
          {[
            { id: 'zone', label: 'Por Zona & Rendimiento', icon: Sliders },
            { id: 'cluster', label: 'Agrupación Automática (Clustering)', icon: Layers },
            { id: 'polygon', label: 'Dibujar Polígono en Mapa', icon: Pentagon },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as 'zone' | 'cluster' | 'polygon')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  mode === m.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-amber-500" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Left Column */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-[#FAFBFD]">
            {mode === 'zone' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    1. Zona en Aguascalientes
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'Todas las Zonas', desc: 'Circuito Ags' },
                      { id: 'Norte', label: 'Zona Norte', desc: 'Bosques/Trojes/Pocitos' },
                      { id: 'Centro', label: 'Centro Histórico', desc: 'Madero/San Marcos' },
                      { id: 'Poniente', label: 'Poniente', desc: 'Río San Pedro' },
                    ].map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelectedZone(z.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          selectedZone === z.id
                            ? 'bg-white border-orange-500 shadow-xs ring-2 ring-orange-500/20'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <span
                          className={`block text-xs font-extrabold ${
                            selectedZone === z.id ? 'text-orange-600' : 'text-slate-800'
                          }`}
                        >
                          {z.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          {z.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    2. Filtro de Rendimiento Comercial
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'top90', label: '⭐ Alto Rendimiento (Score ≥ 90%)' },
                      { id: 'elite95', label: '💎 Solo Puntos Élite (Score ≥ 95%)' },
                      { id: 'all', label: '🎯 Todos los Puntos Activos' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPerformanceFilter(p.id as 'all' | 'top90' | 'elite95')}
                        className={`w-full p-2.5 rounded-xl border text-left text-xs font-extrabold transition cursor-pointer ${
                          performanceFilter === p.id
                            ? 'bg-white border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                            : 'bg-white/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'cluster' && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <h4 className="text-xs font-black text-slate-900">
                    Clustering Automático por Cercanía Geográfica
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Agrupa automáticamente tus {stores.length} puntos de venta en zonas compactas optimizadas con secuencia TSP.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de rutas / zonas a generar: <strong className="text-orange-600">{clusterCount}</strong>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={Math.min(5, Math.max(2, stores.length))}
                    value={clusterCount}
                    onChange={(e) => setClusterCount(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            )}

            {mode === 'polygon' && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pentagon className="w-4 h-4 text-orange-600" />
                    <h4 className="text-xs font-black text-slate-900">Dibujar Polígono de Zona</h4>
                  </div>
                  {polygonPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPolygonPoints([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Haz clic en el mapa para marcar los vértices de la zona (mínimo 3 puntos). Vértices marcados: <strong>{polygonPoints.length}</strong> · Tiendas dentro: <strong className="text-emerald-700">{polygonStores.length}</strong>
                </p>

                <svg
                  viewBox="0 0 500 360"
                  onClick={handleSvgPolygonClick}
                  className="w-full h-48 bg-slate-100 rounded-xl border border-slate-300 cursor-crosshair"
                >
                  <rect width="500" height="360" fill="#F8FAFC" />
                  {polygonPoints.length >= 2 && (
                    <polygon
                      points={polygonPoints
                        .map((p) => {
                          const s = projectToSvg(p.lat, p.lng);
                          return `${s.x},${s.y}`;
                        })
                        .join(' ')}
                      fill="rgba(249,115,22,0.18)"
                      stroke="#EA580C"
                      strokeWidth="2.5"
                    />
                  )}
                  {stores.map((st) => {
                    const p = projectToSvg(st.coordinates.lat, st.coordinates.lng);
                    const inside =
                      polygonPoints.length >= 3 && isPointInPolygon(st.coordinates, polygonPoints);
                    return (
                      <g key={st.id} transform={`translate(${p.x},${p.y})`}>
                        <circle
                          r={inside ? 6 : 4}
                          fill={inside ? '#10B981' : '#94A3B8'}
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                  {polygonPoints.map((pt, i) => {
                    const s = projectToSvg(pt.lat, pt.lng);
                    return <circle key={i} cx={s.x} cy={s.y} r="4.5" fill="#EA580C" stroke="#FFF" strokeWidth="1.5" />;
                  })}
                </svg>
              </div>
            )}

            {/* Common Parameters: Origin, Visit Days, Limits */}
            <div className="space-y-2.5 pt-1 border-t border-slate-200/70">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Punto de Salida / Origen
                </label>
                <select
                  value={selectedOriginId}
                  onChange={(e) => setSelectedOriginId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {PRESET_ORIGINS.map((orig) => (
                    <option key={orig.id} value={orig.id}>
                      {orig.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  Días de Visita Asignados
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const active = visitDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Máx. Paradas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxStops}
                    onChange={(e) => setMaxStops(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Cap. Camioneta
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={25}
                    value={vanCapacityPieces}
                    onChange={(e) => setVanCapacityPieces(Number(e.target.value) || 450)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Chofer
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold"
                  >
                    {users
                      .filter((u) => u.role === 'driver')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={returnToOrigin}
                  onChange={(e) => setReturnToOrigin(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600"
                />
                <span>Ruta circular (retorno al punto de inicio)</span>
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-4 bg-white flex flex-col justify-between">
            {mode === 'cluster' ? (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Vista Previa de {clusteredZones.length} Rutas Generadas por Cercanía
                </h4>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {clusteredZones.map((c, idx) => (
                    <div
                      key={c.clusterIndex}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900">
                          {c.label} · Día sugerido: {WEEK_DAYS[idx % WEEK_DAYS.length]}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                          {c.estimatedKm} km · ~{c.estimatedMinutes} min
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.stores.map((st, sIdx) => (
                          <span
                            key={st.id}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
                          >
                            #{sIdx + 1} {st.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPIs Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-orange-50/80 border border-orange-200/80 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-orange-700 block">
                      Distancia Corta
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-slate-900">
                        {optimizedResult.totalDistanceKm}
                      </span>
                      <span className="text-xs font-bold text-orange-600">km</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                      -{optimizedResult.efficiencyPercent}% vs aleatoria
                    </span>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200/80 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-blue-700 block">
                      Tiempo Total
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-slate-900">
                        ~{optimizedResult.estimatedTotalMinutes}
                      </span>
                      <span className="text-xs font-bold text-blue-600">min</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {optimizedResult.estimatedDriveMinutes}m manejo
                    </span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">
                      Rendimiento
                    </span>
                    <span className="text-xl font-black text-slate-900 block mt-0.5">
                      {optimizedResult.averagePerformanceScore}%
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-700">★ Top</span>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-amber-700 block">
                      Paradas
                    </span>
                    <span className="text-xl font-black text-slate-900 block mt-0.5">
                      {optimizedResult.orderedStores.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Cap. {vanCapacityPieces} pzas
                    </span>
                  </div>
                </div>

                {optimizedResult.fallbackNotice && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{optimizedResult.fallbackNotice}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold block truncate">
                        Ruta Optimizada en Google Maps
                      </span>
                      <span className="text-[11px] text-blue-100 block truncate">
                        {optimizedResult.orderedStores.length} paradas · Días: {visitDays.join(', ') || 'Por definir'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={optimizedResult.googleMapsMultiStopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Abrir Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {optimizedResult.orderedStores.map((store, index) => {
                    const leg = optimizedResult.legs[index];
                    return (
                      <div
                        key={store.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-[#FAFBFD] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-extrabold text-slate-900 truncate">
                              {store.name}
                            </h5>
                            <p className="text-[10px] text-slate-500 truncate">
                              {store.address} · ~{leg.legDistanceKm} km ({leg.legDriveMinutes} min)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={leg.googleMapsPinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="Ver Pin Maps"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={leg.googleMapsDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                            title="Navegar"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              {mode !== 'cluster' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyItinerary}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Chofer</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-bold text-slate-500">
                  Se crearán {clusteredZones.length} rutas listas en el tablero.
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndAssign}
                  disabled={mode === 'polygon' && optimizedResult.orderedStores.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>
                    {mode === 'cluster'
                      ? `Crear ${clusteredZones.length} Rutas Automáticas`
                      : 'Guardar y Asignar Ruta'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
