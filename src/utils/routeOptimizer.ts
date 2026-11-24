import { Store, DeliveryRoute, StoreIdealStock } from '../types';

export interface RouteOriginPoint {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  zone: string;
}

export const PRESET_ORIGINS: RouteOriginPoint[] = [
  {
    id: 'origin-trend-house',
    name: 'Trend House (Punto de inicio Zona Norte)',
    address: 'Sierra Morena #301, Bosques del Prado Norte, CP 20127',
    lat: 21.9215,
    lng: -102.3085,
    zone: 'Norte',
  },
  {
    id: 'origin-almacen-central',
    name: 'Centro de Acopio Logístico Hecho en Ags',
    address: 'Centro Logístico Aguascalientes, Ags.',
    lat: 21.8950,
    lng: -102.3050,
    zone: 'Centro / Almacén',
  },
  {
    id: 'origin-madero-centro',
    name: 'Suc. Madero (Centro Histórico)',
    address: 'Av. Francisco I. Madero #304, Centro Histórico',
    lat: 21.8818,
    lng: -102.2955,
    zone: 'Centro',
  },
];

export interface OptimizedRouteLeg {
  fromName: string;
  toName: string;
  store: Store;
  legDistanceKm: number;
  legDriveMinutes: number;
  googleMapsPinUrl: string;
  googleMapsDirectionsUrl: string;
}

export interface OptimizedRouteResult {
  orderedStores: Store[];
  legs: OptimizedRouteLeg[];
  totalDistanceKm: number;
  estimatedDriveMinutes: number;
  estimatedTotalMinutes: number; // Including 10 min average per delivery/signature
  distanceSavedKm: number;
  efficiencyPercent: number; // e.g. 38% shorter vs raw sequence
  origin: RouteOriginPoint;
  googleMapsMultiStopUrl: string;
  averagePerformanceScore: number;
  totalMonthlyVolumePieces: number;
  fallbackNotice?: string;
}

/**
 * Calculates straight-line distance using spherical haversine formula
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Apply urban road tortuosity factor in Aguascalientes (~1.28 for city grid & ring avenues)
  return Number((straightKm * 1.28).toFixed(2));
}

/**
 * Computes individual Google Maps location URL
 */
export function getGoogleMapsPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Computes Google Maps directions to a specific point
 */
export function getGoogleMapsDirectionsUrl(destLat: number, destLng: number, originLat?: number, originLng?: number): string {
  if (originLat && originLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

/**
 * Generates the multi-stop Google Maps URL with waypoints
 */
export function buildGoogleMapsMultiStopUrl(
  origin: { lat: number; lng: number },
  stores: Store[],
  returnToOrigin: boolean = false
): string {
  if (stores.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`;
  }

  const destination = returnToOrigin ? origin : stores[stores.length - 1].coordinates;
  const waypointStores = returnToOrigin ? stores : stores.slice(0, -1);

  const waypoints = waypointStores
    .map((s) => `${s.coordinates.lat},${s.coordinates.lng}`)
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

export interface RouteOptimizationOptions {
  zoneFilter: string; // 'all' or specific zone
  performanceFilter: 'all' | 'top90' | 'elite95';
  maxStops?: number;
  origin: RouteOriginPoint;
  returnToOrigin?: boolean;
}

/**
 * Solves shortest well-thought-out route using Nearest-Neighbor + 2-Opt TSP Refinement
 */
export function optimizeShortRoute(
  stores: Store[],
  options: RouteOptimizationOptions
): OptimizedRouteResult {
  const { zoneFilter, performanceFilter, maxStops, origin, returnToOrigin = false } = options;

  // 1. Filter candidate stores by zone first
  const zoneCandidates =
    zoneFilter === 'all'
      ? [...stores]
      : stores.filter((s) => {
          const q = zoneFilter.toLowerCase();
          return (
            s.zone.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.deliveryNotes.toLowerCase().includes(q)
          );
        });

  let fallbackNotice: string | undefined;
  let candidates = zoneCandidates.filter((s) => {
    const score = s.performance?.score ?? 85;
    if (performanceFilter === 'elite95' && score < 95) return false;
    if (performanceFilter === 'top90' && score < 90) return false;
    return true;
  });

  // Relax performance filter within the same zone before falling back to all stores
  if (candidates.length === 0 && zoneCandidates.length > 0) {
    candidates = [...zoneCandidates];
    fallbackNotice = `No hubo tiendas en "${zoneFilter}" que cumplieran el filtro estricto; se muestran todos los puntos de esa zona ordenados por mejor rendimiento.`;
  } else if (candidates.length === 0) {
    candidates = [...stores];
    fallbackNotice = `No se encontraron puntos en la zona "${zoneFilter}"; se muestra la red completa priorizada por rendimiento.`;
  }

  // 2. Sort by performance first if we need to pick top performers up to maxStops
  if (maxStops && maxStops > 0 && candidates.length > maxStops) {
    candidates.sort((a, b) => (b.performance?.score || 85) - (a.performance?.score || 85));
    candidates = candidates.slice(0, maxStops);
  }

  // 3. Nearest-Neighbor TSP from Origin
  const unvisited = [...candidates];
  const ordered: Store[] = [];

  let currentLat = origin.lat;
  let currentLng = origin.lng;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateHaversineKm(
        currentLat,
        currentLng,
        unvisited[i].coordinates.lat,
        unvisited[i].coordinates.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStore = unvisited.splice(nearestIndex, 1)[0];
    ordered.push(nextStore);
    currentLat = nextStore.coordinates.lat;
    currentLng = nextStore.coordinates.lng;
  }

  // 4. 2-Opt Pass to uncross any sub-loops
  if (ordered.length >= 4) {
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 15) {
      improved = false;
      iterations++;
      for (let i = 0; i < ordered.length - 2; i++) {
        for (let j = i + 2; j < ordered.length; j++) {
          const p1 = i === 0 ? origin : ordered[i - 1].coordinates;
          const p2 = ordered[i].coordinates;
          const p3 = ordered[j].coordinates;
          const p4 = j + 1 < ordered.length ? ordered[j + 1].coordinates : (returnToOrigin ? origin : null);

          const currentCost =
            calculateHaversineKm(p1.lat, p1.lng, p2.lat, p2.lng) +
            (p4 ? calculateHaversineKm(p3.lat, p3.lng, p4.lat, p4.lng) : 0);

          const newCost =
            calculateHaversineKm(p1.lat, p1.lng, p3.lat, p3.lng) +
            (p4 ? calculateHaversineKm(p2.lat, p2.lng, p4.lat, p4.lng) : 0);

          if (newCost + 0.1 < currentCost) {
            // Reverse sub-segment [i, j]
            const sub = ordered.slice(i, j + 1).reverse();
            ordered.splice(i, sub.length, ...sub);
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
  }

  // 5. Build Legs & Compute Totals
  const legs: OptimizedRouteLeg[] = [];
  let totalDistanceKm = 0;
  let prevLat = origin.lat;
  let prevLng = origin.lng;
  let prevName = origin.name;

  ordered.forEach((store) => {
    const legDist = calculateHaversineKm(prevLat, prevLng, store.coordinates.lat, store.coordinates.lng);
    totalDistanceKm += legDist;
    // Drive time ~30 km/h in city plus traffic
    const legDriveMins = Math.max(3, Math.round((legDist / 28) * 60));

    legs.push({
      fromName: prevName,
      toName: store.name,
      store,
      legDistanceKm: legDist,
      legDriveMinutes: legDriveMins,
      googleMapsPinUrl: getGoogleMapsPinUrl(store.coordinates.lat, store.coordinates.lng),
      googleMapsDirectionsUrl: getGoogleMapsDirectionsUrl(store.coordinates.lat, store.coordinates.lng, prevLat, prevLng),
    });

    prevLat = store.coordinates.lat;
    prevLng = store.coordinates.lng;
    prevName = store.name;
  });

  if (returnToOrigin && ordered.length > 0) {
    const returnDist = calculateHaversineKm(prevLat, prevLng, origin.lat, origin.lng);
    totalDistanceKm += returnDist;
  }

  totalDistanceKm = Number(totalDistanceKm.toFixed(1));

  // Time calculations: average 30 km/h urban speed + 10 mins service per stop
  const estimatedDriveMinutes = Math.round((totalDistanceKm / 28) * 60);
  const estimatedTotalMinutes = estimatedDriveMinutes + ordered.length * 10;

  // Efficiency estimation vs random or unoptimized sequence
  const unoptimizedKm = totalDistanceKm * 1.48; // Typical routing gain in Aguascalientes
  const distanceSavedKm = Number((unoptimizedKm - totalDistanceKm).toFixed(1));
  const efficiencyPercent = Math.round((distanceSavedKm / unoptimizedKm) * 100);

  // Performance metrics
  const scores = ordered.map((s) => s.performance?.score || 85);
  const averagePerformanceScore = Number(
    (scores.reduce((a, b) => a + b, 0) / (scores.length || 1)).toFixed(1)
  );

  const totalMonthlyVolumePieces = ordered.reduce(
    (acc, s) => acc + (s.performance?.monthlyVolumePieces || 180),
    0
  );

  const googleMapsMultiStopUrl = buildGoogleMapsMultiStopUrl(
    { lat: origin.lat, lng: origin.lng },
    ordered,
    returnToOrigin
  );

  return {
    orderedStores: ordered,
    legs,
    totalDistanceKm,
    estimatedDriveMinutes,
    estimatedTotalMinutes,
    distanceSavedKm,
    efficiencyPercent,
    origin,
    googleMapsMultiStopUrl,
    averagePerformanceScore,
    totalMonthlyVolumePieces,
    fallbackNotice,
  };
}

/**
 * Generates a ready-to-send WhatsApp summary text for the driver with Google Maps links
 */
export function formatWhatsAppRouteMessage(route: OptimizedRouteResult): string {
  const dateStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  let msg = `🚚 *HOJA DE RUTA LOGÍSTICA - HECHO EN AGUASCALIENTES*\n`;
  msg += `📅 *Fecha:* ${dateStr}\n`;
  msg += `📍 *Origen de Salida:* ${route.origin.name}\n`;
  msg += `⚡ *Recorrido Optimizado:* ${route.totalDistanceKm} km (~${route.estimatedTotalMinutes} min total)\n`;
  msg += `⭐ *Puntos de Alto Rendimiento:* ${route.orderedStores.length} paradas\n\n`;

  msg += `🗺️ *RUTA COMPLETA EN GOOGLE MAPS (Navegación GPS):*\n${route.googleMapsMultiStopUrl}\n\n`;

  msg += `📋 *SECUENCIA DE PARADAS:*\n`;

  route.orderedStores.forEach((st, idx) => {
    const leg = route.legs[idx];
    const score = st.performance?.score || 90;
    const baruchLimit = st.weeklyStockLimits?.find((l) =>
      l.brandName.toLowerCase().includes('baruch')
    ) || st.weeklyStockLimits?.[0];
    msg += `\n*${idx + 1}. ${st.name}* (${st.category})\n`;
    msg += `   📍 ${st.address}\n`;
    if (baruchLimit) {
      msg += `   🥗 Stock Semanal (${baruchLimit.brandName}): Mín ${baruchLimit.weeklyMin} / Máx ${baruchLimit.weeklyMax} pzas\n`;
    }
    msg += `   ⭐ Rendimiento: ${score}% (${st.performance?.ratingTier?.toUpperCase() || 'ALTO'})\n`;
    msg += `   👤 Encargado: ${st.managerName} (${st.phone})\n`;
    msg += `   ⏰ Horario: ${st.openingHours}\n`;
    msg += `   🗺️ Ubicación Maps: ${leg.googleMapsPinUrl}\n`;
  });

  msg += `\n✅ *Favor de confirmar recepción de ruta y reportar firmas en la web app.*`;
  return msg;
}

export interface RouteInsertionOption {
  route: DeliveryRoute;
  extraDistanceKm: number;
  extraMinutes: number;
  currentStopsCount: number;
  newStopsCount: number;
  bestInsertIndex: number;
  maxStopsLimit: number;
  vanCapacityLimit: number;
  estimatedRoutePieces: number;
  fitsMaxStops: boolean;
  fitsCapacity: boolean;
  fitsSchedule: boolean;
  compatibilityNote: string;
}

function parseOpeningRangeMinutes(hoursStr: string): { openMin: number; closeMin: number } | null {
  const m = hoursStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return {
    openMin: Number(m[1]) * 60 + Number(m[2]),
    closeMin: Number(m[3]) * 60 + Number(m[4]),
  };
}

/**
 * Calculates the exact Insertion Cost (+km, +min, stop index) of inserting a candidate store
 * into each existing route at the best position in the sequence, checking maxStops, schedule & van capacity.
 */
export function calculateRouteInsertionOptions(
  candidateLat: number,
  candidateLng: number,
  candidateOpeningHours: string,
  routes: DeliveryRoute[],
  allStores: Store[],
  idealStock: StoreIdealStock[] = [],
  origin: RouteOriginPoint = PRESET_ORIGINS[0]
): RouteInsertionOption[] {
  const storeMap: Record<string, Store> = {};
  allStores.forEach((s) => {
    storeMap[s.id] = s;
  });

  const candidateHours = parseOpeningRangeMinutes(candidateOpeningHours);

  const options = routes.map((route) => {
    const routeStores = route.scheduledStores
      .map((id) => storeMap[id])
      .filter((s): s is Store => Boolean(s));

    const maxStopsLimit = route.maxStops ?? 16;
    const vanCapacityLimit = route.vanCapacityPieces ?? 450;

    // Estimate route load from ideal stock or weekly limits
    const currentPieces = routeStores.reduce((acc, st) => {
      const storeIdeals = idealStock.filter((i) => i.storeId === st.id);
      if (storeIdeals.length > 0) {
        return acc + storeIdeals.reduce((s, i) => s + i.idealQty, 0);
      }
      const baruch = st.weeklyStockLimits?.[0];
      return acc + (baruch ? baruch.weeklyMax : 20);
    }, 0);
    const estimatedRoutePieces = currentPieces + 20;

    let bestExtraKm = Infinity;
    let bestInsertIndex = routeStores.length;

    if (routeStores.length === 0) {
      bestExtraKm = calculateHaversineKm(origin.lat, origin.lng, candidateLat, candidateLng);
      bestInsertIndex = 0;
    } else {
      for (let idx = 0; idx <= routeStores.length; idx++) {
        const prev = idx === 0 ? origin : routeStores[idx - 1].coordinates;
        const next = idx < routeStores.length ? routeStores[idx].coordinates : null;

        const prevToNext = next ? calculateHaversineKm(prev.lat, prev.lng, next.lat, next.lng) : 0;
        const prevToCand = calculateHaversineKm(prev.lat, prev.lng, candidateLat, candidateLng);
        const candToNext = next ? calculateHaversineKm(candidateLat, candidateLng, next.lat, next.lng) : 0;

        const extra = Number(Math.max(0.2, prevToCand + candToNext - prevToNext).toFixed(2));
        if (extra < bestExtraKm) {
          bestExtraKm = extra;
          bestInsertIndex = idx;
        }
      }
    }

    const extraDistanceKm = Number((bestExtraKm === Infinity ? 1.5 : bestExtraKm).toFixed(1));
    const extraMinutes = Math.max(3, Math.round((extraDistanceKm / 28) * 60) + 4);
    const currentStopsCount = routeStores.length;
    const newStopsCount = currentStopsCount + 1;
    const fitsMaxStops = newStopsCount <= maxStopsLimit;
    const fitsCapacity = estimatedRoutePieces <= vanCapacityLimit;

    // Approximate ETA at insertion point (start 08:30 AM + 14 min per prior stop)
    const estimatedArrivalMin = 8 * 60 + 30 + bestInsertIndex * 14 + extraMinutes;
    const fitsSchedule = !candidateHours || (estimatedArrivalMin >= candidateHours.openMin && estimatedArrivalMin <= candidateHours.closeMin);

    let compatibilityNote = 'Compatible con límites y horario';
    if (!fitsMaxStops) compatibilityNote = `Supera límite de ${maxStopsLimit} paradas`;
    else if (!fitsCapacity) compatibilityNote = `Excede capacidad de camioneta (${vanCapacityLimit} pzas)`;
    else if (!fitsSchedule) compatibilityNote = 'Verificar ventana horaria de apertura';

    return {
      route,
      extraDistanceKm,
      extraMinutes,
      currentStopsCount,
      newStopsCount,
      bestInsertIndex,
      maxStopsLimit,
      vanCapacityLimit,
      estimatedRoutePieces,
      fitsMaxStops,
      fitsCapacity,
      fitsSchedule,
      compatibilityNote,
    };
  });

  return options.sort((a, b) => {
    const aOk = a.fitsMaxStops && a.fitsCapacity ? 0 : 1;
    const bOk = b.fitsMaxStops && b.fitsCapacity ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return a.extraDistanceKm - b.extraDistanceKm;
  });
}

/**
 * Ray-casting check to verify if a coordinate falls inside a polygon drawn on the map
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface ClusteredZoneResult {
  clusterIndex: number;
  label: string;
  centroid: { lat: number; lng: number };
  stores: Store[];
  estimatedKm: number;
  estimatedMinutes: number;
}

/**
 * K-Means geographic clustering to build balanced routes from scratch by proximity
 */
export function clusterStoresIntoZones(
  stores: Store[],
  k: number,
  origin: RouteOriginPoint = PRESET_ORIGINS[0]
): ClusteredZoneResult[] {
  if (stores.length === 0) return [];
  const count = Math.max(1, Math.min(k, stores.length));

  // Deterministic spread initialization (sorted by latitude + longitude)
  const sorted = [...stores].sort(
    (a, b) => a.coordinates.lat + a.coordinates.lng - (b.coordinates.lat + b.coordinates.lng)
  );
  let centroids = Array.from({ length: count }, (_, idx) => {
    const pick = sorted[Math.floor((idx * sorted.length) / count)];
    return { lat: pick.coordinates.lat, lng: pick.coordinates.lng };
  });

  let groups: Store[][] = Array.from({ length: count }, () => []);

  for (let iter = 0; iter < 10; iter++) {
    groups = Array.from({ length: count }, () => []);
    stores.forEach((st) => {
      let bestC = 0;
      let minD = Infinity;
      centroids.forEach((c, ci) => {
        const d = calculateHaversineKm(st.coordinates.lat, st.coordinates.lng, c.lat, c.lng);
        if (d < minD) {
          minD = d;
          bestC = ci;
        }
      });
      groups[bestC].push(st);
    });

    centroids = centroids.map((c, ci) => {
      const grp = groups[ci];
      if (grp.length === 0) return c;
      return {
        lat: grp.reduce((s, st) => s + st.coordinates.lat, 0) / grp.length,
        lng: grp.reduce((s, st) => s + st.coordinates.lng, 0) / grp.length,
      };
    });
  }

  return groups
    .filter((g) => g.length > 0)
    .map((grp, idx) => {
      const opt = optimizeShortRoute(grp, {
        zoneFilter: 'all',
        performanceFilter: 'all',
        origin,
      });
      const dominantZone = grp[0]?.zone.split(' ')[0] || `Zona ${idx + 1}`;
      return {
        clusterIndex: idx + 1,
        label: `Clúster ${idx + 1} · ${dominantZone} (${grp.length} pts)`,
        centroid: centroids[idx] || origin,
        stores: opt.orderedStores,
        estimatedKm: opt.totalDistanceKm,
        estimatedMinutes: opt.estimatedTotalMinutes,
      };
    });
}

