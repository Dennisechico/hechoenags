export type UserRole = 'admin' | 'warehouse' | 'driver' | 'brand';

export type UserStatus = 'active' | 'blocked';

export interface InitialPlatformConfig {
  warehouseManagerName: string;
  warehouseAddress: string;
  launchDate: string;
  contactPhone?: string;
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // One-way salted SHA-256 hash — plaintext passwords are never stored or displayed
  passwordSalt: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  tempPasswordIssuedAt?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  brandId?: string; // Associated brand for 'brand' role
  driverZone?: string; // Associated zone for 'driver' role
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export type BrandCategory =
  | 'Alimentos & Dulces Típicos'
  | 'Café de Especialidad'
  | 'Cervecería & Vinos Artesanales'
  | 'Cosmética Natural & Bienestar'
  | 'Textil & Confección de Tradición'
  | 'Artesanías & Cerámica'
  | 'Joyería & Marroquinería';

export interface BrandSubscription {
  planName: string;
  monthlyFee: number; // in MXN, e.g. 1200
  status: 'active' | 'pending' | 'suspended';
  nextBillingDate: string;
  lastPaymentDate: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: BrandCategory;
  originLocation: string; // e.g. "Calvillo, Ags" or "Barrio de San Marcos, Ags"
  logoUrl?: string;
  accentColor: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  rfc?: string;
  subscription: BrandSubscription;
  createdAt: string;
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  flavor?: string; // Sabor / Variante específica
  sku: string;
  barcode?: string; // Código de barras / QR EAN-13 o SKU escaneable
  description: string;
  category: BrandCategory;
  unit: string; // 'pza', 'frasco', 'paquete 250g', 'botella 355ml'
  costPrice: number; // Precio mayorista / consignación en MXN
  suggestedRetailPrice: number; // Precio anaquel sugerido en MXN
  centralWarehouseStock: number; // Computed live from immutable movements ledger
  minStockAlert: number;
  imageUrl?: string;
}

export type AguascalientesZone =
  | 'Centro Histórico & San Marcos'
  | 'Norte (Campestre / Colosio / Altaria)'
  | 'Sur (Las Américas / Mahatma Gandhi)'
  | 'Oriente & Tres Centurias';

export interface StorePerformance {
  score: number; // 0-100 score de rendimiento comercial
  ratingTier: 'elite' | 'alto' | 'regular';
  monthlyVolumePieces: number; // piezas promedio/mes
  avgTicketMXN: number; // venta promedio en visita
  deliverySuccessPct: number; // efectividad de recepción %
  turnoverDays: number; // días promedio para agotar anaquel
  highlightBadge?: string; // e.g. "Top Rotación Centro", "Concept Store Insignia"
}

export interface BrandStockLimit {
  brandName: string;
  brandId?: string;
  weeklyMin: number;
  weeklyMax: number;
  unitLabel?: string;
}

export interface Store {
  id: string;
  name: string;
  category: 'Concept Store' | 'Boutique Local' | 'Cafetería Especializada' | 'Mercado Gourmet' | 'Librería & Bazar';
  address: string;
  zone: AguascalientesZone;
  coordinates: {
    lat: number;
    lng: number;
  };
  managerName: string;
  phone: string;
  whatsapp: string;
  openingHours: string;
  deliveryNotes: string;
  activeBrands: string[]; // Brand IDs currently stocked
  lastDeliveryDate?: string;
  performance?: StorePerformance;
  weeklyStockLimits?: BrandStockLimit[];
}

export interface StoreStockItem {
  storeId: string;
  brandId: string;
  productId: string;
  currentStock: number;
  lastRestockedDate: string;
  targetMaxStock: number;
}

// NIVEL IDEAL POR PUNTO DE VENTA (por tienda + producto)
export interface StoreIdealStock {
  id: string;
  storeId: string;
  productId: string;
  brandId: string;
  idealQty: number;
  minQty?: number;
  updatedAt: string;
}

// ==========================================
// 1. INVENTARIO POR MOVIMIENTOS INMUTABLES
// ==========================================
export type MovementType =
  | 'entrada'     // Proveedor/marca -> Bodega (Admin bodega)
  | 'carga'       // Bodega -> Camioneta (Bodega + Repartidor confirman)
  | 'entrega'     // Camioneta -> Punto de venta (Repartidor con firma o foto)
  | 'devolucion'  // Camioneta -> Bodega (Bodega cuenta, repartidor confirma)
  | 'recoleccion' // Punto de venta -> Camioneta (Caducado o dañado)
  | 'merma'       // Cualquiera -> Baja (Motivo y foto)
  | 'ajuste';     // Corrección (Solo admin, motivo obligatorio)

export type LocationType = 'external' | 'warehouse' | 'van' | 'store' | 'loss';

export interface LocationRef {
  type: LocationType;
  id: string; // e.g. 'supplier', 'warehouse-central', 'van-user-driver-1', 'store-bosques-c', 'merma-baja'
  label: string;
}

export interface InventoryMovement {
  id: string;
  folio: string;
  type: MovementType;
  fromLocation: LocationRef;
  toLocation: LocationRef;
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  flavor?: string;
  quantity: number; // Always positive integer; direction is fromLocation -> toLocation
  performedByUserId: string;
  performedByName: string;
  confirmedByUserId?: string;
  confirmedByName?: string;
  gpsCoords?: { lat: number; lng: number };
  timestamp: string;
  reason?: string;
  photoProofDataUrl?: string;
  signatureDataUrl?: string;
  relatedDispatchId?: string;
  relatedTicketId?: string;
  relatedRouteId?: string;
  offlineCreated?: boolean;
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  flavor?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CollectedReturnItem {
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  quantity: number;
  reason: 'caducado' | 'danado';
  photoDataUrl?: string;
}

export interface DeliveryTicket {
  id: string;
  folio: string; // e.g., "REM-AGS-2026-0842"
  routeId: string;
  dispatchId?: string;
  storeId: string;
  storeName: string;
  driverId: string;
  driverName: string;
  brandIds: string[];
  items: DeliveryItem[];
  shelfCounts?: Record<string, number>; // Conteo físico encontrado en anaquel al llegar (productId -> qty)
  collectedItems?: CollectedReturnItem[]; // Piezas recogidas por caducidad o daño
  totalPieces: number;
  totalCollectedPieces?: number;
  totalValue: number;
  recipientName: string;
  recipientRole: string;
  recipientSignature: string; // Data URL of signature canvas (optional if photoProofDataUrl provided)
  photoProofDataUrl?: string; // Foto de comprobante / anaquel del encargado
  gpsCoords?: { lat: number; lng: number };
  geofenceVerified?: boolean;
  geofenceDistanceMeters?: number;
  offlineQueued?: boolean;
  notes?: string;
  timestamp: string;
  status: 'delivered' | 'partial' | 'incident';
}

// ==========================================
// 5. SNAPSHOTS DE VISITA (VENTA REAL EN ANAQUEL)
// ==========================================
export interface VisitSnapshot {
  id: string;
  ticketId: string;
  storeId: string;
  storeName: string;
  routeId: string;
  brandId: string;
  productId: string;
  productName: string;
  previousShelfStock: number;
  shelfCountOnArrival: number;
  deliveredQty: number;
  collectedQty: number; // caducado o dañado retirado
  soldInPeriod: number; // max(0, previousShelfStock - shelfCountOnArrival)
  endingShelfStock: number; // shelfCountOnArrival + deliveredQty
  stockoutDetected: boolean; // true si shelfCountOnArrival === 0
  timestamp: string;
}

export interface DriverTelemetry {
  lat: number;
  lng: number;
  speedKmH: number;
  heading: number;
  currentStreet: string;
  lastUpdated: string;
  isSimulating?: boolean;
  adaptiveIntervalSec?: number; // 30-60s moving, 150s stationary
  batterySaverActive?: boolean;
}

export interface DeliveryRoute {
  id: string;
  code: string; // e.g. "RUTA-CENTRO-01"
  name: string;
  zone: AguascalientesZone;
  driverId: string;
  date: string;
  visitDays?: string[]; // e.g. ['Lun', 'Jue']
  maxStops?: number;
  vanCapacityPieces?: number;
  zonePolygon?: { lat: number; lng: number }[];
  scheduledStores: string[]; // Store IDs in order
  completedStoreIds: string[];
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  startedAt?: string;
  endedAt?: string;
  telemetry?: DriverTelemetry;
  transitCorridor?: string;
  startPointName?: string;
}

export interface CrossSellingOpportunity {
  id: string;
  targetCategory: string;
  complementaryBrandId: string;
  complementaryProductId: string;
  pitchPrompt: string;
}

export interface CrossSellingLead {
  id: string;
  storeId: string;
  storeName: string;
  brandId: string;
  brandName: string;
  productId: string;
  productName: string;
  driverId: string;
  driverName: string;
  action: 'sample_delivered' | 'manager_interested' | 'catalog_shared' | 'order_requested';
  notes: string;
  createdAt: string;
  status: 'pending_review' | 'contacted' | 'catalog_delivered' | 'converted';
}

export type DatePeriodFilter = 'today' | 'week' | 'month' | 'all';

export interface SettlementCut {
  id: string;
  folio: string;
  period: string;
  brandId: string;
  brandName: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  grossSales: number;
  logisticsCommissionRate: number;
  logisticsCommissionAmount: number;
  netPayableToBrand: number;
  status: 'pending' | 'processing' | 'settled';
  createdAt: string;
  settlementDate?: string;
  transferReference?: string;
  notes?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'ticket' | 'route' | 'stock' | 'cross_sell' | 'system' | 'warehouse' | 'security';
  severity: 'info' | 'warning' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

// ==========================================
// 2. CICLO DIARIO DEL REPARTIDOR & CONCILIACIÓN
// ==========================================
export type DispatchLifecycleStatus =
  | 'proposed'             // Bodega registró carga, esperando aceptación del repartidor
  | 'open_in_transit'      // Repartidor aceptó; camioneta abierta con stock en ruta
  | 'pending_return'       // Ruta finalizada, esperando conteo físico de retorno en bodega
  | 'closed_reconciled'    // Cuadró exacto: camioneta cerrada
  | 'closed_with_shortage';// No cuadró: faltante asignado al repartidor, camioneta cerrada

export interface VanLoadingItem {
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  flavor?: string;
  loadedQty: number; // piezas cargadas a la camioneta
  unitPrice: number;
}

export interface VanLoadingDispatch {
  id: string;
  folio: string; // e.g. "DESP-AGS-2026-041"
  routeId: string;
  routeCode: string;
  driverId: string;
  driverName: string;
  warehouseManager: string;
  date: string;
  status: DispatchLifecycleStatus;
  items: VanLoadingItem[];
  totalPieces: number;
  totalValueMXN: number;
  driverAcceptedAt?: string;
  driverAcceptedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface VanReturnReconciliation {
  id: string;
  folio: string; // e.g. "REC-AGS-2026-041"
  dispatchId: string;
  routeId: string;
  driverId: string;
  driverName: string;
  warehouseManager: string;
  reconciledAt: string;
  driverConfirmedReturn: boolean;
  cashCollectedMXN: number;
  cashReconciled: boolean;
  returnedItems: {
    productId: string;
    productName: string;
    brandName: string;
    loadedQty: number;
    deliveredQty: number;
    mermaQty: number;
    collectedQty: number; // Recogido de tienda (caducado/dañado)
    expectedReturnQty: number; // cargado - entregado - merma + recogido
    returnedPhysicalQty: number;
    discrepancyQty: number; // expectedReturnQty - returnedPhysicalQty (>0 = faltante)
    reintegratedToStock: boolean;
  }[];
  totalReturnedPieces: number;
  totalExpectedReturnPieces: number;
  totalDiscrepancyPieces: number;
  shortageValueMXN: number;
  notes?: string;
  status: 'pending' | 'completed';
}

export interface DiscrepancyAuditRecord {
  id: string;
  ticketFolio: string;
  storeName: string;
  driverId?: string;
  driverName: string;
  brandName: string;
  productName: string;
  expectedQty: number;
  deliveredQty: number;
  discrepancyQty: number;
  discrepancyType:
    | 'faltante_liquidacion'
    | 'merma_traslado'
    | 'espacio_lleno'
    | 'caducidad_reemplazo'
    | 'conteo_diferencia';
  resolutionStatus: 'en_revision' | 'auditada_resuelta' | 'reposicion_programada';
  impactMXN: number;
  notes: string;
  date: string;
  auditedBy: string;
}

// ==========================================
// 4. COLA OFFLINE DEL REPARTIDOR
// ==========================================
export interface OfflineQueuedOperation {
  id: string;
  kind: 'delivery_ticket';
  createdAt: string;
  storeName: string;
  totalPieces: number;
  payload: Omit<DeliveryTicket, 'id' | 'folio' | 'timestamp'>;
}

// ==========================================
// 6. BITÁCORA DE AUDITORÍA DE SEGURIDAD
// ==========================================
export type AuditActionType =
  | 'login_success'
  | 'login_blocked'
  | 'password_reset'
  | 'user_status_change'
  | 'impersonation_start'
  | 'impersonation_end'
  | 'user_created'
  | 'user_deleted'
  | 'manual_adjustment'
  | 'van_dispatch_created'
  | 'van_dispatch_accepted'
  | 'van_reconciled'
  | 'csv_bulk_import';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditActionType;
  targetType: 'user' | 'inventory' | 'dispatch' | 'route' | 'store' | 'brand';
  targetId: string;
  targetLabel: string;
  details: string;
}
