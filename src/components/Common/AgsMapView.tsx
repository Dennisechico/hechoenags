import React, { useState, useRef } from 'react';
import { Store, DeliveryRoute } from '../../types';
import {
  MapPin,
  Truck,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Crosshair,
  Layers,
  Sparkles,
  Compass,
  CheckCircle2,
  X,
  Play,
  Pause,
} from 'lucide-react';

interface AgsMapViewProps {
  stores: Store[];
  activeRoute?: DeliveryRoute | null;
  selectedStoreId?: string;
  onSelectStore?: (store: Store) => void;
  showDriverLive?: boolean;
}

export const AgsMapView: React.FC<AgsMapViewProps> = ({
  stores,
  activeRoute,
  selectedStoreId,
  onSelectStore,
  showDriverLive = true,
}) => {
  // Map normalized coordinates to SVG viewport (default 500x380)
  // Aguascalientes bounds calibrated for the Eje de Traslado and all 11 Las Planchitas branches:
  const minLat = 21.860;
  const maxLat = 21.950;
  const minLng = -102.348;
  const maxLng = -102.255;

  // Zoom & Pan State for interactive inspection
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');
  
  // Real device GPS testing state
  const [testerLocation, setTesterLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  // Selected store inspection modal/card
  const [activeStoreModal, setActiveStoreModal] = useState<Store | null>(() => {
    if (selectedStoreId) {
      return stores.find((s) => s.id === selectedStoreId) || null;
    }
    return null;
  });

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 460 + 20;
    // Invert latitude for SVG y-axis
    const y = 360 - ((lat - minLat) / (maxLat - minLat)) * 320 - 20;
    return { x: Math.max(25, Math.min(475, x)), y: Math.max(25, Math.min(355, y)) };
  };

  // Driver real-time position from telemetry or default
  const driverLat = activeRoute?.telemetry?.lat ?? 21.9215;
  const driverLng = activeRoute?.telemetry?.lng ?? -102.3085;
  const driverPos = project(driverLat, driverLng);
  const speed = activeRoute?.telemetry?.speedKmH ?? 0;
  const currentStreet = activeRoute?.telemetry?.currentStreet ?? 'Trend House (Punto de inicio Zona Norte)';

  // Compute dynamic viewBox for SVG based on zoom & pan
  const baseWidth = 500;
  const baseHeight = 380;
  const viewBoxWidth = baseWidth / zoom;
  const viewBoxHeight = baseHeight / zoom;
  // Keep centered with pan
  const viewBoxX = (baseWidth - viewBoxWidth) / 2 - pan.x;
  const viewBoxY = (baseHeight - viewBoxHeight) / 2 - pan.y;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.2, Number((prev + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, Number((prev - 0.35).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Real-time GPS location via device browser API
  const handleGetTesterLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocalización no soportada en este navegador.');
      return;
    }
    setIsGettingGps(true);
    setGpsStatusMsg('Obteniendo coordenadas GPS en tiempo real...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        setTesterLocation({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsStatusMsg(`GPS obtenido: ${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`);
      },
      (err) => {
        setIsGettingGps(false);
        // Fallback to simulated Aguascalientes Plaza de Armas coordinate for testing
        const fallback = { lat: 21.8818, lng: -102.2965, accuracy: 15 };
        setTesterLocation(fallback);
        setGpsStatusMsg(`GPS real no disponible (${err.message}). Usando Plaza de Armas Ags.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Google Maps external URL generator
  const getGoogleMapsDirectionsUrl = () => {
    if (!activeRoute || activeRoute.scheduledStores.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${driverLat},${driverLng}`;
    }
    const storeObjects = activeRoute.scheduledStores
      .map((sid) => stores.find((s) => s.id === sid))
      .filter(Boolean) as Store[];

    if (storeObjects.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${driverLat},${driverLng}`;
    }

    const destination = storeObjects[storeObjects.length - 1];
    const waypoints = storeObjects
      .slice(0, -1)
      .map((s) => `${s.coordinates.lat},${s.coordinates.lng}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${destination.coordinates.lat},${destination.coordinates.lng}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    return url;
  };

  const getStoreGoogleMapsUrl = (store: Store) => {
    return `https://www.google.com/maps/search/?api=1&query=${store.coordinates.lat},${store.coordinates.lng}`;
  };

  return (
    <div className="relative w-full h-full min-h-[340px] sm:min-h-[380px] bg-[#F1F5F9] rounded-[24px] sm:rounded-[28px] border border-slate-200/90 overflow-hidden shadow-inner flex flex-col select-none">
      {/* Top Header Bar Overlay with live stats & Google Maps link */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-sm pointer-events-auto min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-black text-slate-900 block leading-tight truncate">
              Mapa Logístico Ags
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate block">
              {stores.length} tiendas · Zoom {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Action buttons: Google Maps + GPS test */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={handleGetTesterLocation}
            disabled={isGettingGps}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-[11px] sm:text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
            title="Detectar ubicación GPS actual para pruebas"
          >
            <Crosshair className={`w-3.5 h-3.5 text-blue-600 ${isGettingGps ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Probar GPS</span>
            <span className="inline sm:hidden">GPS</span>
          </button>

          <a
            href={getGoogleMapsDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-[11px] sm:text-xs font-extrabold transition shadow-md shadow-blue-500/20 flex items-center gap-1 cursor-pointer shrink-0"
            title="Abrir la ruta de reparto directamente en Google Maps con navegación por GPS"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir en Google Maps</span>
            <span className="inline sm:hidden">Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </div>

      {/* Eje de Traslado & Active Route Corridor Info Bar */}
      {activeRoute?.transitCorridor && (
        <div className="absolute top-12 sm:top-14 left-2.5 right-14 sm:right-16 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-200/90 shadow-xs flex items-center gap-2 text-[10px] sm:text-xs">
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase shrink-0">
            Eje de Traslado
          </span>
          <span className="text-slate-700 font-bold truncate">
            {activeRoute.transitCorridor}
          </span>
        </div>
      )}

      {/* Floating Zoom & Map Controls (Right side) */}
      <div className="absolute top-14 sm:top-16 right-2.5 sm:right-3 z-20 flex flex-col items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-slate-200/90 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 flex items-center justify-center transition cursor-pointer font-black text-base"
          title="Acercar mapa (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <span className="text-[10px] font-mono font-bold text-slate-500 py-0.5">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 flex items-center justify-center transition cursor-pointer font-black text-base"
          title="Alejar mapa (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-slate-200 my-0.5"></div>

        <button
          type="button"
          onClick={handleResetZoom}
          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          title="Restablecer vista centrada"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setMapStyle((cur) => (cur === 'streets' ? 'satellite' : 'streets'))}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
            mapStyle === 'satellite' ? 'bg-slate-900 text-amber-400' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
          }`}
          title="Cambiar capa de mapa (Calles / Satélite)"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Real-time Telemetry HUD (Bottom Right) */}
      {showDriverLive && (
        <div className="absolute bottom-3 right-3 z-20 hidden md:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-sm text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-orange-100 text-orange-600">
              <Truck className="w-4 h-4" />
            </span>
            <div>
              <span className="font-extrabold text-slate-900 block leading-tight">
                Camioneta Reparto Ags 1
              </span>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[160px] block">
                {currentStreet}
              </span>
            </div>
          </div>
          <div className="pl-3 border-l border-slate-200 text-right">
            <span className="font-mono font-black text-orange-600 text-xs block">
              {speed > 0 ? `${speed} km/h` : 'En Parada'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">● GPS En Línea</span>
          </div>
        </div>
      )}

      {/* GPS Status message notice */}
      {gpsStatusMsg && (
        <div className="absolute top-16 left-3 z-20 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-xs flex items-center gap-2 animate-in fade-in">
          <Crosshair className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>{gpsStatusMsg}</span>
          <button
            type="button"
            onClick={() => setGpsStatusMsg(null)}
            className="text-blue-400 hover:text-blue-800 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zone Legend */}
      <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 text-[11px] text-slate-700 shadow-2xs font-bold">
        <span className="flex items-center gap-1.5 text-amber-800">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span> ★ Trend House (Inicio Norte)
        </span>
        <span className="flex items-center gap-1.5 text-orange-700">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs"></span> Red Ags ({stores.length} Puntos)
        </span>
        <span className="flex items-center gap-1.5 text-emerald-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span> Entregas en Consignación
        </span>
      </div>

      {/* SVG Map Canvas with Zoom & Pan Support */}
      <svg
        className={`w-full h-full cursor-${isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default'}`}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Subtle light grid pattern */}
          <pattern id="lightGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke={mapStyle === 'satellite' ? '#1E293B' : '#E2E8F0'}
              strokeWidth="0.8"
            />
          </pattern>
          <linearGradient id="routeGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.9" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* Map Background Layer */}
        <rect
          x="-200"
          y="-200"
          width="900"
          height="800"
          fill={mapStyle === 'satellite' ? '#0F172A' : '#F8FAFC'}
        />
        <rect
          x="-200"
          y="-200"
          width="900"
          height="800"
          fill="url(#lightGrid)"
        />

        {/* ============================================================== */}
        {/* CORREDOR OFICIAL - EJE DE TRASLADO AGUASCALIENTES              */}
        {/* ============================================================== */}

        {/* 1. Av. Siglo XXI Norte (Tercer Anillo Norte) */}
        <path
          d="M 30 52 Q 240 28 470 52"
          fill="none"
          stroke={mapStyle === 'satellite' ? '#475569' : '#CBD5E1'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="210"
          y="36"
          fill={mapStyle === 'satellite' ? '#94A3B8' : '#64748B'}
          fontSize="8.5"
          fontWeight="800"
          textAnchor="middle"
        >
          Av. Siglo XXI Norte (Tercer Anillo)
        </text>

        {/* 2. Av. Independencia (Corredor Comercial Norte pasando Trojes) */}
        <path
          d="M 368 25 L 368 220"
          fill="none"
          stroke={mapStyle === 'satellite' ? '#64748B' : '#94A3B8'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="374"
          y="48"
          fill={mapStyle === 'satellite' ? '#CBD5E1' : '#334155'}
          fontSize="8.5"
          fontWeight="800"
        >
          Av. Independencia (Trojes)
        </text>

        {/* 3. Av. Eugenio Garza Sada (Tec de Monterrey / Pocitos) */}
        <path
          d="M 60 75 L 245 170"
          fill="none"
          stroke={mapStyle === 'satellite' ? '#64748B' : '#94A3B8'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="75"
          y="70"
          fill={mapStyle === 'satellite' ? '#CBD5E1' : '#334155'}
          fontSize="8.5"
          fontWeight="800"
        >
          Av. Eugenio Garza Sada (Pocitos)
        </text>

        {/* 4. Av. Aguascalientes Nte. / Pte. (Segundo Anillo Norte / Poniente) */}
        <path
          d="M 140 315 Q 150 185 270 160 Q 400 155 440 215"
          fill="none"
          stroke={mapStyle === 'satellite' ? '#334155' : '#94A3B8'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="235"
          y="152"
          fill={mapStyle === 'satellite' ? '#CBD5E1' : '#334155'}
          fontSize="8.5"
          fontWeight="800"
        >
          Av. Aguascalientes Nte. (Bosques)
        </text>
        <text
          x="95"
          y="250"
          fill={mapStyle === 'satellite' ? '#94A3B8' : '#64748B'}
          fontSize="8"
          fontWeight="700"
        >
          Av. Aguascalientes Pte. (Río San Pedro)
        </text>

        {/* 5. Av. Francisco I. Madero (Centro Histórico) */}
        <path
          d="M 230 277 L 450 277"
          fill="none"
          stroke={mapStyle === 'satellite' ? '#64748B' : '#94A3B8'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="280"
          y="271"
          fill={mapStyle === 'satellite' ? '#CBD5E1' : '#334155'}
          fontSize="8.5"
          fontWeight="800"
        >
          Av. Francisco I. Madero (Centro)
        </text>

        {/* Landmark: Plaza de Armas / Centro */}
        <g transform="translate(320, 277)">
          <rect
            x="-7"
            y="-7"
            width="14"
            height="14"
            fill={mapStyle === 'satellite' ? '#7F1D1D' : '#FEE2E2'}
            stroke="#EF4444"
            strokeWidth="1"
            rx="3"
          />
          <text
            x="10"
            y="3"
            fill={mapStyle === 'satellite' ? '#FCA5A5' : '#991B1B'}
            fontSize="8"
            fontWeight="bold"
          >
            Plaza de Armas
          </text>
        </g>

        {/* Zone Polygon overlay if defined on activeRoute */}
        {activeRoute?.zonePolygon && activeRoute.zonePolygon.length >= 3 && (
          <polygon
            points={activeRoute.zonePolygon
              .map((pt) => {
                const p = project(pt.lat, pt.lng);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill="rgba(245, 158, 11, 0.14)"
            stroke="#D97706"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
        )}

        {/* Route connector lines if route is active */}
        {activeRoute && (
          <g>
            {activeRoute.scheduledStores.map((storeId, i) => {
              if (i === 0) return null;
              const prevStore = stores.find((s) => s.id === activeRoute.scheduledStores[i - 1]);
              const currStore = stores.find((s) => s.id === storeId);
              if (!prevStore || !currStore) return null;

              const p1 = project(prevStore.coordinates.lat, prevStore.coordinates.lng);
              const p2 = project(currStore.coordinates.lat, currStore.coordinates.lng);

              const isCompleted = activeRoute.completedStoreIds.includes(currStore.id);

              return (
                <line
                  key={`route-leg-${i}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isCompleted ? '#10B981' : 'url(#routeGradLight)'}
                  strokeWidth="3.5"
                  strokeDasharray={isCompleted ? 'none' : '6 4'}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              );
            })}
          </g>
        )}

        {/* Store Pins */}
        {stores.map((store) => {
          const { x, y } = project(store.coordinates.lat, store.coordinates.lng);
          const isSelected = selectedStoreId === store.id || activeStoreModal?.id === store.id;
          const isScheduledInActiveRoute = activeRoute?.scheduledStores.includes(store.id);
          const stopNumber = activeRoute?.scheduledStores.indexOf(store.id);
          const isCompleted = activeRoute?.completedStoreIds.includes(store.id);
          const isStartPoint = store.id === 'store-trend-house' || store.name.toLowerCase().includes('trend house');

          return (
            <g
              key={store.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer transition-transform hover:scale-125"
              onClick={() => {
                setActiveStoreModal(store);
                if (onSelectStore) onSelectStore(store);
              }}
              filter="url(#shadow)"
            >
              {/* Pulsing ring if selected or start point */}
              {isSelected ? (
                <circle r="18" fill="#FF8A00" fillOpacity="0.25" className="animate-ping" />
              ) : isStartPoint ? (
                <circle r="16" fill="#F59E0B" fillOpacity="0.2" className="animate-pulse" />
              ) : null}

              {/* Pin Base */}
              <circle
                r={isSelected ? 12 : isStartPoint ? 11 : 9}
                fill={
                  isCompleted
                    ? '#10B981'
                    : isStartPoint
                    ? '#F59E0B'
                    : isScheduledInActiveRoute
                    ? '#F97316'
                    : '#64748B'
                }
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />

              {/* Pin Icon / Symbol or Stop Number */}
              {isCompleted ? (
                <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                  ✓
                </text>
              ) : isStartPoint ? (
                <text x="0" y="3.5" textAnchor="middle" fill="#1E293B" fontSize="9" fontWeight="black">
                  ★
                </text>
              ) : isScheduledInActiveRoute && stopNumber !== undefined && stopNumber >= 0 ? (
                <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="black">
                  {stopNumber + 1}
                </text>
              ) : (
                <circle r="3.5" fill="#FFFFFF" />
              )}

              {/* Store Label Badge */}
              <g transform="translate(0, -14)">
                <rect
                  x="-38"
                  y="-12"
                  width="76"
                  height="14"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={isStartPoint ? '#F59E0B' : isSelected ? '#F97316' : '#E2E8F0'}
                  strokeWidth={isStartPoint || isSelected ? '1.5' : '1'}
                />
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  fill={isStartPoint ? '#B45309' : isSelected ? '#C2410C' : '#0F172A'}
                  fontSize="7.5"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {isStartPoint ? '★ Trend House' : store.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* Real Tester GPS Marker if activated */}
        {testerLocation && (
          <g
            transform={`translate(${project(testerLocation.lat, testerLocation.lng).x}, ${
              project(testerLocation.lat, testerLocation.lng).y
            })`}
            filter="url(#shadow)"
          >
            <circle r="22" fill="#3B82F6" fillOpacity="0.25" className="animate-ping" />
            <circle r="10" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle r="4" fill="#FFFFFF" />
            <g transform="translate(0, -16)">
              <rect x="-42" y="-12" width="84" height="14" rx="4" fill="#1E3A8A" />
              <text x="0" y="-2" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
                Tu GPS ({testerLocation.lat.toFixed(3)}°)
              </text>
            </g>
          </g>
        )}

        {/* Live Driver marker */}
        {showDriverLive && (
          <g
            transform={`translate(${driverPos.x}, ${driverPos.y})`}
            className="cursor-pointer transition-transform duration-500"
            filter="url(#shadow)"
          >
            <circle r="18" fill="#F97316" fillOpacity="0.3" className="animate-pulse" />
            <circle r="11" fill="#EA580C" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="bold">
              🚚
            </text>
            <g transform="translate(0, 18)">
              <rect x="-48" y="-1" width="96" height="15" rx="5" fill="#0F172A" />
              <text x="0" y="10" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="bold">
                {speed > 0 ? `Unidad 01 · ${speed} km/h` : 'Unidad 01 · En Parada'}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Interactive Store Detail Card Modal overlay when a store pin is clicked */}
      {activeStoreModal && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md z-30 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#D4F63D] text-slate-900">
                  {activeStoreModal.category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeStoreModal.zone.split(' ')[0]}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">{activeStoreModal.name}</h4>
              <p className="text-xs text-slate-500">{activeStoreModal.address}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveStoreModal(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Encargado(a):</span>
              <span className="font-semibold text-slate-800">{activeStoreModal.managerName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Horario Entrega:</span>
              <span className="text-slate-600">{activeStoreModal.openingHours}</span>
            </div>
          </div>

          {activeStoreModal.weeklyStockLimits && activeStoreModal.weeklyStockLimits.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
              {activeStoreModal.weeklyStockLimits.map((limit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-extrabold text-emerald-900 truncate">
                    {limit.brandName}
                  </span>
                  <span className="font-mono font-black text-emerald-700 shrink-0">
                    Mín {limit.weeklyMin} · Máx {limit.weeklyMax} pzas/sem
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-mono">
              GPS: {activeStoreModal.coordinates.lat}, {activeStoreModal.coordinates.lng}
            </span>
            <a
              href={getStoreGoogleMapsUrl(activeStoreModal)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-blue-200"
            >
              <Navigation className="w-3 h-3" />
              <span>Ver en Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
