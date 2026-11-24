import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, DeliveryTicket } from '../../types';
import { AgsMapView } from '../Common/AgsMapView';
import { DigitalTicketModal } from './DigitalTicketModal';
import { CrossSellingAssistant } from './CrossSellingAssistant';
import { TicketReceiptModal } from '../Common/TicketReceiptModal';
import { optimizeShortRoute, PRESET_ORIGINS } from '../../utils/routeOptimizer';
import {
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  FileText,
  CheckCircle2,
  Clock,
  Compass,
  Radio,
  Gauge,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  WifiOff,
  Wifi,
  RefreshCw,
  Boxes,
  Zap,
  BatteryCharging,
} from 'lucide-react';

export const DriverView: React.FC = () => {
  const {
    stores,
    routes,
    activeRoute,
    selectActiveRoute,
    currentUser,
    tickets,
    startRoute,
    pauseRoute,
    completeRoute,
    updateRouteTelemetry,
    updateRouteStops,
    openDispatchForDriver,
    acceptVanDispatch,
    getVanStockByDriver,
    isOfflineMode,
    simulatedOffline,
    setSimulatedOffline,
    offlineQueue,
    syncOfflineQueue,
    showToast,
  } = useApp();

  const [selectedStore, setSelectedStore] = useState<Store>(() => {
    if (activeRoute) {
      const pendingStoreId = activeRoute.scheduledStores.find(
        (id) => !activeRoute.completedStoreIds.includes(id)
      );
      const found = stores.find((s) => s.id === pendingStoreId);
      if (found) return found;
    }
    return stores[0];
  });

  const [ticketModalStore, setTicketModalStore] = useState<Store | null>(null);
  const [viewingTicket, setViewingTicket] = useState<DeliveryTicket | null>(null);
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [arrivalAlert, setArrivalAlert] = useState<string | null>(null);

  const simulationStepRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  const driverId = currentUser?.role === 'driver' ? currentUser.id : 'user-driver-1';
  const openDispatch = openDispatchForDriver(driverId);
  const vanStockMap = getVanStockByDriver(driverId);
  const totalVanPieces = useMemo(
    () => Object.values(vanStockMap).reduce((acc, q) => acc + Math.max(0, q), 0),
    [vanStockMap]
  );

  // Scheduled stores for this route
  const routeStores = activeRoute
    ? activeRoute.scheduledStores
        .map((sId) => stores.find((s) => s.id === sId))
        .filter(Boolean) as Store[]
    : stores.slice(0, 3);

  const completedCount = activeRoute?.completedStoreIds.length || 0;
  const totalStops = routeStores.length;

  // Current target pending store
  const nextPendingStore =
    routeStores.find((s) => !activeRoute?.completedStoreIds.includes(s.id)) || routeStores[0];

  const routeStatus = activeRoute?.status || 'scheduled';
  const isRunning = routeStatus === 'in_progress';
  const currentSpeedKmH = activeRoute?.telemetry?.speedKmH ?? (isRunning ? 34 : 0);
  const isStationary = !isRunning || currentSpeedKmH <= 3;
  // Adaptive GPS: 35s moving vs 150s stationary (saves battery when stopped)
  const adaptiveIntervalSec = isStationary ? 150 : 35;

  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const currentLat = activeRoute?.telemetry?.lat ?? 21.881;
  const currentLng = activeRoute?.telemetry?.lng ?? -102.299;
  const distanceToTargetMeters = nextPendingStore
    ? calculateDistanceMeters(
        currentLat,
        currentLng,
        nextPendingStore.coordinates.lat,
        nextPendingStore.coordinates.lng
      )
    : 0;

  const isInside100mGeofence = Boolean(nextPendingStore && distanceToTargetMeters <= 100);

  // Real device GPS tracking (with strict 100m geofence)
  useEffect(() => {
    if (!useDeviceGps || !activeRoute) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError('La geolocalización no está disponible en este navegador.');
      setUseDeviceGps(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        const { latitude, longitude, speed: rawSpeed, heading } = pos.coords;
        const speedKmH = rawSpeed ? Math.round(rawSpeed * 3.6) : 0;
        const stationaryNow = speedKmH <= 3;

        updateRouteTelemetry(activeRoute.id, {
          lat: latitude,
          lng: longitude,
          speedKmH,
          heading: heading || 45,
          currentStreet: `GPS Activo: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°W`,
          isSimulating: false,
          adaptiveIntervalSec: stationaryNow ? 150 : 35,
          batterySaverActive: stationaryNow,
        });

        // Strict 100m geofence auto-arrival check
        if (nextPendingStore) {
          const dist = calculateDistanceMeters(
            latitude,
            longitude,
            nextPendingStore.coordinates.lat,
            nextPendingStore.coordinates.lng
          );
          if (dist <= 100) {
            setArrivalAlert(
              `Geocerca 100m activada (${dist} m) en ${nextPendingStore.name}. Llegada registrada automáticamente.`
            );
          }
        }
      },
      (err) => {
        setGpsError(`Error GPS: ${err.message}. Activando simulación.`);
        setUseDeviceGps(false);
      },
      {
        enableHighAccuracy: !isStationary,
        timeout: 12000,
        maximumAge: isStationary ? 150000 : 35000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [useDeviceGps, activeRoute?.id, nextPendingStore, isStationary]);

  // Smooth Simulation loop when in_progress and not using real GPS
  useEffect(() => {
    if (!isRunning || useDeviceGps || !activeRoute || !nextPendingStore) return;

    const streets = [
      'Av. Eugenio Garza Sada rumbo Norte',
      'Av. Aguascalientes Nte. (Segundo Anillo)',
      'Av. Independencia — Corredor Comercial Norte',
      'Av. Aguascalientes Pte. — Poniente',
      'Av. Francisco I. Madero — Centro Histórico',
    ];

    const timer = setInterval(() => {
      simulationStepRef.current += 1;
      const step = simulationStepRef.current;
      const targetLat = nextPendingStore.coordinates.lat;
      const targetLng = nextPendingStore.coordinates.lng;

      const progressFactor = Math.min(1, (step % 15) / 14);
      const startLat = 21.91;
      const startLng = -102.305;

      const newLat = startLat + (targetLat - startLat) * progressFactor;
      const newLng = startLng + (targetLng - startLng) * progressFactor;
      const randomSpeed = progressFactor >= 1 ? 0 : Math.floor(24 + Math.random() * 14);
      const street = streets[step % streets.length];

      updateRouteTelemetry(activeRoute.id, {
        lat: Number(newLat.toFixed(5)),
        lng: Number(newLng.toFixed(5)),
        speedKmH: randomSpeed,
        heading: (step * 25) % 360,
        currentStreet: `${street} rumbo a ${nextPendingStore.name}`,
        isSimulating: true,
        adaptiveIntervalSec: randomSpeed <= 3 ? 150 : 35,
        batterySaverActive: randomSpeed <= 3,
      });

      const dist = calculateDistanceMeters(newLat, newLng, targetLat, targetLng);
      if (dist <= 100) {
        setArrivalAlert(
          `Geocerca 100m activada (${dist} m) en ${nextPendingStore.name}. Llegada confirmada automáticamente.`
        );
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isRunning, useDeviceGps, activeRoute?.id, nextPendingStore]);

  const handleStartRoute = () => {
    if (!activeRoute) return;
    startRoute(activeRoute.id);
  };

  const handlePauseRoute = () => {
    if (!activeRoute) return;
    pauseRoute(activeRoute.id);
  };

  const handleCompleteRoute = () => {
    if (!activeRoute) return;
    completeRoute(activeRoute.id);
    setArrivalAlert(null);
  };

  const handleOptimizeDailyOrder = () => {
    if (!activeRoute || routeStores.length < 2) return;
    const opt = optimizeShortRoute(routeStores, {
      zoneFilter: 'all',
      performanceFilter: 'all',
      origin: PRESET_ORIGINS[0],
    });
    updateRouteStops(
      activeRoute.id,
      opt.orderedStores.map((s) => s.id)
    );
    showToast(`Orden del día optimizado (${opt.totalDistanceKm} km estimados).`);
  };

  const handleTicketGenerated = (ticket: DeliveryTicket) => {
    setTicketModalStore(null);
    setViewingTicket(ticket);
    setArrivalAlert(null);
  };

  const getStoreTicket = (storeId: string) => {
    return tickets.find((t) => t.storeId === storeId);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Offline Mode & Sync Bar */}
      <div
        className={`rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
          isOfflineMode
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-white border-slate-200/90 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOfflineMode ? (
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <div>
            <span className="font-extrabold block">
              {isOfflineMode
                ? 'Modo Sin Señal Activo (Guardado Local Seguro)'
                : 'Conectado en Tiempo Real'}
            </span>
            <span className="text-[11px] text-slate-500">
              {offlineQueue.length > 0
                ? `${offlineQueue.length} entrega(s) en cola esperando sincronización.`
                : 'Todas las entregas sincronizadas al libro de movimientos.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSimulatedOffline(!simulatedOffline)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
              simulatedOffline
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {simulatedOffline ? 'Volver a Conectar' : 'Simular Sin Señal'}
          </button>

          {offlineQueue.length > 0 && !isOfflineMode && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Pendientes ({offlineQueue.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Step 1 of Driver Daily Cycle: Accept Proposed Load from Bodega */}
      {openDispatch?.status === 'proposed' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 rounded-[24px] p-4 sm:p-5 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                Confirmación Dual Bodega + Repartidor
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                Carga Propuesta Lista en Andén ({openDispatch.folio})
              </h3>
              <p className="text-xs text-slate-700">
                Bodega preparó <strong>{openDispatch.totalPieces} piezas</strong> para la ruta{' '}
                <strong>{openDispatch.routeCode}</strong>. Verifica el conteo físico y acepta para abrir tu camioneta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => acceptVanDispatch(openDispatch.id)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D4F63D]" />
              <span>Aceptar Carga Inicial y Abrir Jornada</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {openDispatch.items.map((it) => (
              <span
                key={it.productId}
                className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg font-bold text-slate-800"
              >
                {it.productName}: <strong className="font-mono text-orange-600">{it.loadedQty} pzas</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Route Control & Telemetry Banner */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-mono font-extrabold text-slate-900 bg-[#D4F63D] px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                  {activeRoute?.code || 'RUTA-AGS-01'}
                </span>
                <span className="text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Boxes className="w-3 h-3" /> Stock en Camioneta: {totalVanPieces} pzas
                </span>
                {isRunning ? (
                  <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Ruta en Progreso
                  </span>
                ) : routeStatus === 'paused' ? (
                  <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                    Ruta Pausada
                  </span>
                ) : routeStatus === 'completed' ? (
                  <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                    ✓ Ruta Completada
                  </span>
                ) : (
                  <span className="text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                    Programada
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 break-words">
                {activeRoute?.name || 'Ruta Eje de Traslado'}
              </h2>

              <p className="text-xs text-slate-500 font-medium break-words mt-0.5">
                Conductor: <strong className="text-slate-800">{currentUser?.name}</strong> · Zona: {activeRoute?.zone}
              </p>

              {routes.length > 1 && (
                <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full max-w-full min-w-0">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Ruta Asignada:</span>
                  <select
                    value={activeRoute?.id || ''}
                    onChange={(e) => selectActiveRoute(e.target.value)}
                    className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full max-w-full truncate min-w-0"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} - {r.name} ({r.scheduledStores.length} paradas)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOptimizeDailyOrder}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              title="Recalcular el orden más corto de paradas del día"
            >
              <Zap className="w-3.5 h-3.5 text-orange-600" />
              <span>Optimizar Orden de Hoy</span>
            </button>

            {!isRunning && routeStatus !== 'completed' && (
              <button
                onClick={handleStartRoute}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 hover:opacity-95 text-slate-950 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Ruta</span>
              </button>
            )}

            {isRunning && (
              <>
                <button
                  onClick={handlePauseRoute}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </button>
                <button
                  onClick={handleCompleteRoute}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Ruta
                </button>
              </>
            )}

            {routeStatus === 'completed' && (
              <button
                onClick={handleStartRoute}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry + Adaptive Battery Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAFBFD] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 text-xs w-full max-w-full min-w-0 overflow-hidden">
          <div className="min-w-0">
            <span className="text-slate-400 font-medium flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" /> Ubicación:
            </span>
            <span className="font-extrabold text-slate-900 mt-0.5 block truncate">
              {activeRoute?.telemetry?.currentStreet || 'Aguascalientes Centro'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
              {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° W
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 font-medium flex items-center gap-1 truncate">
              <Gauge className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Velocidad & GPS Adaptativo:
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900">{currentSpeedKmH}</span>
              <span className="text-[11px] text-slate-500 font-mono font-bold">km/h</span>
            </div>
            <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1 mt-0.5">
              <BatteryCharging className="w-3 h-3 text-emerald-600 shrink-0" />
              {isStationary
                ? `Detenido: ahorro batería (${adaptiveIntervalSec}s)`
                : `En ruta: GPS cada ${adaptiveIntervalSec}s`}
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 font-medium flex items-center gap-1 truncate">
              <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Próxima Parada & Geocerca 100m:
            </span>
            <span className="font-extrabold text-slate-900 mt-0.5 block truncate">
              {nextPendingStore?.name || 'Todas completadas'}
            </span>
            <span
              className={`text-[10px] font-black inline-block mt-0.5 px-2 py-0.5 rounded-full ${
                isInside100mGeofence
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isInside100mGeofence
                ? `Dentro de 100m (${distanceToTargetMeters} m) ✓`
                : `A ~${distanceToTargetMeters} m de geocerca`}
            </span>
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <span className="text-slate-400 font-medium mb-1 flex items-center gap-1 truncate">
              <Radio className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Posicionamiento:
            </span>
            <button
              type="button"
              onClick={() => {
                setGpsError(null);
                setUseDeviceGps(!useDeviceGps);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                useDeviceGps
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${useDeviceGps ? 'animate-spin' : 'text-blue-600'}`} />
              <span>{useDeviceGps ? 'GPS Real Activo' : 'Activar GPS Real'}</span>
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{gpsError}</span>
            </div>
            <button onClick={() => setGpsError(null)} className="font-bold cursor-pointer">
              Cerrar
            </button>
          </div>
        )}

        {arrivalAlert && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 text-emerald-950 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                📍
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  Llegada Automática (Geocerca 100 m)
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">{arrivalAlert}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (nextPendingStore) {
                  setSelectedStore(nextPendingStore);
                  setTicketModalStore(nextPendingStore);
                }
              }}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shrink-0"
            >
              Registrar Visita Ahora
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Map & Stops list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 w-full max-w-full min-w-0">
        <div className="lg:col-span-5 space-y-3 w-full max-w-full min-w-0">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Secuencia de Paradas ({completedCount}/{totalStops})
            </h3>
            <span className="text-[11px] text-orange-600 font-bold">
              {totalStops - completedCount} paradas restantes
            </span>
          </div>

          <div className="space-y-3 w-full max-w-full min-w-0">
            {routeStores.map((store, index) => {
              const isCompleted = activeRoute?.completedStoreIds.includes(store.id);
              const isSelected = selectedStore.id === store.id;
              const isNext = nextPendingStore?.id === store.id;
              const existingTicket = getStoreTicket(store.id);

              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer w-full max-w-full min-w-0 overflow-hidden ${
                    isSelected
                      ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-500/20'
                      : isNext
                        ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isNext
                              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs'
                              : isSelected
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">{store.name}</h4>
                          <span className="text-[10px] text-slate-600 font-bold px-1.5 py-0.2 rounded bg-slate-100 shrink-0">
                            {store.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{store.address}</p>

                        {store.weeklyStockLimits && store.weeklyStockLimits.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {store.weeklyStockLimits.map((lim, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2 py-0.5 rounded-lg font-mono"
                              >
                                <span className="font-sans font-extrabold text-emerald-900">🥗 Baruch:</span>
                                Mín {lim.weeklyMin} · Máx {lim.weeklyMax} pzas/sem
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Entregado
                        </span>
                      ) : isNext ? (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-orange-700 bg-orange-100 px-2 sm:px-2.5 py-0.5 rounded-full">
                          Próxima
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold flex items-center gap-1"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Navegar GPS</span>
                      </a>
                      <a
                        href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>

                    {isCompleted && existingTicket ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTicket(existingTicket);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-600" /> Ver Ticket
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStore(store);
                          setTicketModalStore(store);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white text-xs font-extrabold rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" /> Registrar Visita
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Live Map & Store Details */}
        <div className="lg:col-span-7 space-y-5 w-full max-w-full min-w-0">
          <AgsMapView
            stores={stores}
            activeRoute={activeRoute}
            selectedStoreId={selectedStore.id}
            onSelectStore={(st) => setSelectedStore(st)}
            showDriverLive={true}
          />

          <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider block">
                  Ficha Técnica de la Parada
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 truncate">
                  {selectedStore.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  {selectedStore.address}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.coordinates.lat},${selectedStore.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Maps</span>
                </a>

                {activeRoute?.completedStoreIds.includes(selectedStore.id) ? (
                  <button
                    onClick={() => {
                      const ticket = getStoreTicket(selectedStore.id);
                      if (ticket) setViewingTicket(ticket);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" /> Ver Remisión
                  </button>
                ) : (
                  <button
                    onClick={() => setTicketModalStore(selectedStore)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Registrar Entrega / Recolección
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAFBFD] p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Encargado(a):</span>
                <span className="text-slate-900 font-extrabold">{selectedStore.managerName}</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <a href={`tel:${selectedStore.phone}`} className="text-orange-600 hover:underline flex items-center gap-0.5 text-[11px] font-bold">
                    <Phone className="w-3 h-3" /> Llamar
                  </a>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Horario:</span>
                <span className="text-slate-800 font-bold">{selectedStore.openingHours}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Notas:</span>
                <p className="text-slate-600 text-[11px] italic">{selectedStore.deliveryNotes}</p>
              </div>
            </div>

            <CrossSellingAssistant store={selectedStore} />
          </div>
        </div>
      </div>

      {ticketModalStore && (
        <DigitalTicketModal
          store={ticketModalStore}
          routeId={activeRoute?.id || 'route-01'}
          dispatchId={openDispatch?.id}
          driverCoords={{ lat: currentLat, lng: currentLng }}
          geofenceDistanceMeters={calculateDistanceMeters(
            currentLat,
            currentLng,
            ticketModalStore.coordinates.lat,
            ticketModalStore.coordinates.lng
          )}
          onClose={() => setTicketModalStore(null)}
          onTicketGenerated={handleTicketGenerated}
        />
      )}

      {viewingTicket && (
        <TicketReceiptModal
          ticket={viewingTicket}
          store={stores.find((s) => s.id === viewingTicket.storeId)}
          onClose={() => setViewingTicket(null)}
        />
      )}
    </div>
  );
};
