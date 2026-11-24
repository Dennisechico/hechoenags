import {
  Brand,
  DeliveryRoute,
  DeliveryTicket,
  Product,
  Store,
  StoreStockItem,
  User,
  CrossSellingLead,
  CrossSellingOpportunity,
  SettlementCut,
  SystemNotification,
  InitialPlatformConfig,
  VanLoadingDispatch,
  VanReturnReconciliation,
  DiscrepancyAuditRecord,
  InventoryMovement,
  StoreIdealStock,
  VisitSnapshot,
  AuditLogEntry,
} from '../types';
import { hashPassword } from '../utils/security';

export const INITIAL_PLATFORM_CONFIG: InitialPlatformConfig = {
  warehouseManagerName: 'Administrador de Almacén y Oficina',
  warehouseAddress: 'Centro de Acopio Logístico, Aguascalientes, Ags.',
  launchDate: '2026-11-09',
  contactPhone: '',
  notes: 'Red Oficial de Logística y Distribución Hecho en Aguascalientes',
};

const adminSec = hashPassword('admin2026', 'ags_salt_admin_01');
const almacenSec = hashPassword('almacen2026', 'ags_salt_almacen_02');
const driverSec = hashPassword('ruta2026', 'ags_salt_driver_03');

/**
 * 3 PERFILES LIMPIOS CON CONTRASEÑAS CIFRADAS UNIDIRECCIONALMENTE (SHA-256 + Salt):
 * - Administrador 1 (Super Admin): 'admin'
 * - Administrador 2 (Almacén): 'almacen'
 * - Repartidor de Ruta: 'repartidor'
 */
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    username: 'admin',
    passwordHash: adminSec.hash,
    passwordSalt: adminSec.salt,
    status: 'active',
    name: 'Administrador 1',
    email: 'admin@hechoenags.mx',
    phone: '',
    role: 'admin',
    avatarUrl: '',
    createdAt: '2026-11-09T00:00:00Z',
  },
  {
    id: 'user-admin-2',
    username: 'almacen',
    passwordHash: almacenSec.hash,
    passwordSalt: almacenSec.salt,
    status: 'active',
    name: 'Administrador 2 (Almacén)',
    email: 'almacen@hechoenags.mx',
    phone: '',
    role: 'warehouse',
    avatarUrl: '',
    createdAt: '2026-11-09T00:00:00Z',
  },
  {
    id: 'user-driver-1',
    username: 'repartidor',
    passwordHash: driverSec.hash,
    passwordSalt: driverSec.salt,
    status: 'active',
    name: 'Repartidor de Ruta',
    email: 'repartidor@hechoenags.mx',
    phone: '',
    role: 'driver',
    driverZone: 'Aguascalientes',
    avatarUrl: '',
    createdAt: '2026-11-09T00:00:00Z',
  },
];

// CERO MARCAS INICIALES (Para altas reales desde el panel)
export const INITIAL_BRANDS: Brand[] = [];

// CERO PRODUCTOS INICIALES (Para altas reales)
export const INITIAL_PRODUCTS: Product[] = [];

export const BARUCH_BRAND_NAME = 'Baruch Fresh and Healthy Food';

// Puntos de entrega en Aguascalientes incluyendo las 11 sucursales de Las Planchitas con stock semanal Mín/Máx para Baruch Fresh and Healthy Food
export const INITIAL_STORES: Store[] = [
  {
    id: 'store-trend-house',
    name: 'Trend House',
    category: 'Concept Store',
    address: 'Sierra Morena #301, Bosques del Prado Norte, CP 20127',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9215, lng: -102.3085 },
    managerName: 'Punto de Inicio Zona Norte',
    phone: '449-912-3010',
    whatsapp: '524499123010',
    openingHours: '08:00 - 19:00 hrs',
    deliveryNotes: 'Punto de inicio Zona Norte. Base de recolección y salida de ruta.',
    activeBrands: [],
    performance: {
      score: 96,
      ratingTier: 'elite',
      monthlyVolumePieces: 285,
      avgTicketMXN: 2890,
      deliverySuccessPct: 99.5,
      turnoverDays: 4,
      highlightBadge: 'Hub Logístico & Concept Store Insignia Norte',
    },
  },
  {
    id: 'store-bosques-c',
    name: 'Las Planchitas Bosques (Suc. C)',
    category: 'Concept Store',
    address: 'Av. Aguascalientes Nte. #405-A, Zona Bosques, CP 20120',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9135, lng: -102.3110 },
    managerName: 'Encargado(a) Las Planchitas Bosques',
    phone: '449-914-4050',
    whatsapp: '524499144050',
    openingHours: '09:00 - 20:30 hrs',
    deliveryNotes: 'Zona Bosques / Norte. Bahía de descarga sobre Av. Aguascalientes Nte.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 94,
      ratingTier: 'alto',
      monthlyVolumePieces: 250,
      avgTicketMXN: 2150,
      deliverySuccessPct: 98.6,
      turnoverDays: 4,
      highlightBadge: 'Alto Rendimiento Av. Aguascalientes Nte.',
    },
  },
  {
    id: 'store-trojes-i',
    name: 'Las Planchitas Trojes de Alonso (Suc. I)',
    category: 'Boutique Local',
    address: 'Av. Independencia #3008 Local 1, Trojes de Alonso, CP 20116',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9385, lng: -102.2965 },
    managerName: 'Encargado(a) Las Planchitas Trojes',
    phone: '449-973-3008',
    whatsapp: '524499733008',
    openingHours: '10:00 - 21:00 hrs',
    deliveryNotes: 'Corredor Comercial Norte. Estacionamiento comercial sobre Av. Independencia.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 25, weeklyMax: 30, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 95,
      ratingTier: 'elite',
      monthlyVolumePieces: 290,
      avgTicketMXN: 2340,
      deliverySuccessPct: 98.5,
      turnoverDays: 4,
      highlightBadge: 'Mayor Demanda Baruch (25–30 pzas/sem)',
    },
  },
  {
    id: 'store-pocitos-f',
    name: 'Las Planchitas Pocitos (Suc. F)',
    category: 'Cafetería Especializada',
    address: 'Av. Eugenio Garza Sada #115, Pocitos, CP 20328',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9280, lng: -102.3360 },
    managerName: 'Encargado(a) Las Planchitas Pocitos',
    phone: '449-965-0115',
    whatsapp: '524499650115',
    openingHours: '08:30 - 21:00 hrs',
    deliveryNotes: 'Zona Tec de Monterrey / Pocitos. Recepción sobre Av. Eugenio Garza Sada.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 20, weeklyMax: 30, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 93,
      ratingTier: 'alto',
      monthlyVolumePieces: 240,
      avgTicketMXN: 2120,
      deliverySuccessPct: 98.2,
      turnoverDays: 4,
      highlightBadge: 'Alto Flujo Zona Tec / Pocitos (20–30 pzas/sem)',
    },
  },
  {
    id: 'store-rio-san-pedro-d',
    name: 'Las Planchitas Río San Pedro (Suc. D)',
    category: 'Concept Store',
    address: 'Av. Aguascalientes Pte. #742, Poniente, CP 20010',
    zone: 'Centro Histórico & San Marcos',
    coordinates: { lat: 21.8845, lng: -102.3270 },
    managerName: 'Encargado(a) Las Planchitas Río San Pedro',
    phone: '449-916-7420',
    whatsapp: '524499167420',
    openingHours: '09:30 - 20:00 hrs',
    deliveryNotes: 'Poniente. Punto sobre Av. Aguascalientes Pte.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 88,
      ratingTier: 'regular',
      monthlyVolumePieces: 175,
      avgTicketMXN: 1640,
      deliverySuccessPct: 96.8,
      turnoverDays: 6,
      highlightBadge: 'Punto Estratégico Poniente',
    },
  },
  {
    id: 'store-madero-k',
    name: 'Las Planchitas Madero (Suc. K)',
    category: 'Boutique Local',
    address: 'Av. Francisco I. Madero #304, Centro Histórico, CP 20000',
    zone: 'Centro Histórico & San Marcos',
    coordinates: { lat: 21.8818, lng: -102.2955 },
    managerName: 'Encargado(a) Las Planchitas Madero',
    phone: '449-915-3040',
    whatsapp: '524499153040',
    openingHours: '10:00 - 20:00 hrs',
    deliveryNotes: 'Centro Histórico. Descarga sobre Av. Madero antes de mediodía.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 10, weeklyMax: 15, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 98,
      ratingTier: 'elite',
      monthlyVolumePieces: 320,
      avgTicketMXN: 2450,
      deliverySuccessPct: 99.2,
      turnoverDays: 3,
      highlightBadge: 'Máxima Rotación Peatonal Centro Histórico',
    },
  },
  {
    id: 'store-planchitas-nacozari',
    name: 'Las Planchitas Héroe de Nacozari',
    category: 'Mercado Gourmet',
    address: 'Av. Héroe de Nacozari Nte., Zona Centro / Estación, Aguascalientes',
    zone: 'Oriente & Tres Centurias',
    coordinates: { lat: 21.8860, lng: -102.2835 },
    managerName: 'Encargado(a) Suc. Héroe de Nacozari',
    phone: '449-918-2040',
    whatsapp: '524499182040',
    openingHours: '08:00 - 20:00 hrs',
    deliveryNotes: 'Recepción sobre Av. Héroe de Nacozari. Verificar stock mínimo de Baruch.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 91,
      ratingTier: 'alto',
      monthlyVolumePieces: 190,
      avgTicketMXN: 1760,
      deliverySuccessPct: 97.9,
      turnoverDays: 5,
      highlightBadge: 'Corredor Tres Centurias / Nacozari',
    },
  },
  {
    id: 'store-planchitas-tecnologico',
    name: 'Las Planchitas Tecnológico',
    category: 'Mercado Gourmet',
    address: 'Av. Tecnológico, Zona Oriente / ITA, Aguascalientes',
    zone: 'Oriente & Tres Centurias',
    coordinates: { lat: 21.8730, lng: -102.2640 },
    managerName: 'Encargado(a) Suc. Tecnológico',
    phone: '449-970-1520',
    whatsapp: '524499701520',
    openingHours: '08:00 - 20:00 hrs',
    deliveryNotes: 'Zona Tecnológico / Av. Aguascalientes Oriente.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 90,
      ratingTier: 'alto',
      monthlyVolumePieces: 185,
      avgTicketMXN: 1720,
      deliverySuccessPct: 97.4,
      turnoverDays: 5,
      highlightBadge: 'Zona Estudiantil ITA / Oriente',
    },
  },
  {
    id: 'store-planchitas-meridian',
    name: 'Las Planchitas Meridian Park',
    category: 'Mercado Gourmet',
    address: 'Meridian Park / Blvd. Luis Donaldo Colosio, Zona Norte, Aguascalientes',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9225, lng: -102.3220 },
    managerName: 'Encargado(a) Suc. Meridian Park',
    phone: '449-996-1520',
    whatsapp: '524499961520',
    openingHours: '08:30 - 21:00 hrs',
    deliveryNotes: 'Acceso por estacionamiento de plaza Meridian Park.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 92,
      ratingTier: 'alto',
      monthlyVolumePieces: 205,
      avgTicketMXN: 1920,
      deliverySuccessPct: 98.1,
      turnoverDays: 5,
      highlightBadge: 'Plaza Comercial Norte Meridian Park',
    },
  },
  {
    id: 'store-planchitas-papa',
    name: 'Las Planchitas Papa',
    category: 'Mercado Gourmet',
    address: 'Av. Constitución / Zona Norte, Aguascalientes',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    coordinates: { lat: 21.9085, lng: -102.2960 },
    managerName: 'Encargado(a) Suc. Papa',
    phone: '449-912-1520',
    whatsapp: '524499121520',
    openingHours: '08:30 - 20:30 hrs',
    deliveryNotes: 'Entrega directa en barra de recepción.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 89,
      ratingTier: 'regular',
      monthlyVolumePieces: 180,
      avgTicketMXN: 1680,
      deliverySuccessPct: 97.2,
      turnoverDays: 5,
      highlightBadge: 'Punto Norte Constitución',
    },
  },
  {
    id: 'store-planchitas-villas',
    name: 'Las Planchitas Plaza Asunción Villas',
    category: 'Mercado Gourmet',
    address: 'Plaza Asunción / Villas, Aguascalientes',
    zone: 'Sur (Las Américas / Mahatma Gandhi)',
    coordinates: { lat: 21.8685, lng: -102.2880 },
    managerName: 'Encargado(a) Suc. Plaza Asunción Villas',
    phone: '449-978-1520',
    whatsapp: '524499781520',
    openingHours: '09:00 - 20:30 hrs',
    deliveryNotes: 'Plaza Asunción Villas. Acceso de carga en bahía lateral.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 15, weeklyMax: 20, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 90,
      ratingTier: 'alto',
      monthlyVolumePieces: 185,
      avgTicketMXN: 1740,
      deliverySuccessPct: 97.6,
      turnoverDays: 5,
      highlightBadge: 'Plaza Asunción Villas',
    },
  },
  {
    id: 'store-planchitas-santa-anita',
    name: 'Las Planchitas Santa Anita',
    category: 'Mercado Gourmet',
    address: 'Col. Santa Anita, Aguascalientes',
    zone: 'Oriente & Tres Centurias',
    coordinates: { lat: 21.8745, lng: -102.2750 },
    managerName: 'Encargado(a) Suc. Santa Anita',
    phone: '449-975-1015',
    whatsapp: '524499751015',
    openingHours: '08:30 - 20:00 hrs',
    deliveryNotes: 'Col. Santa Anita. Resurtido semanal Mín 10 / Máx 15 piezas Baruch.',
    activeBrands: [],
    weeklyStockLimits: [
      { brandName: BARUCH_BRAND_NAME, weeklyMin: 10, weeklyMax: 15, unitLabel: 'pzas/sem' },
    ],
    performance: {
      score: 87,
      ratingTier: 'regular',
      monthlyVolumePieces: 140,
      avgTicketMXN: 1450,
      deliverySuccessPct: 96.5,
      turnoverDays: 6,
      highlightBadge: 'Zona Santa Anita',
    },
  },
];

// CERO STOCK PREVIO EN ANAQUELES
export const INITIAL_STORE_STOCK: StoreStockItem[] = [];

// Rutas logísticas oficiales en Aguascalientes
export const INITIAL_ROUTES: DeliveryRoute[] = [
  {
    id: 'route-eje-ags-01',
    code: 'RUTA-EJE-AGS-01',
    name: 'Ruta Eje de Traslado Norte - Poniente - Centro',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    driverId: 'user-driver-1',
    date: '2026-11-11',
    visitDays: ['Lun', 'Mié', 'Vie'],
    maxStops: 14,
    vanCapacityPieces: 450,
    scheduledStores: [
      'store-trend-house',
      'store-bosques-c',
      'store-trojes-i',
      'store-pocitos-f',
      'store-rio-san-pedro-d',
      'store-madero-k',
    ],
    completedStoreIds: [],
    status: 'scheduled',
    transitCorridor: 'Av. Eugenio Garza Sada, Av. Independencia, Av. Siglo XXI Norte, Av. Aguascalientes Nte./Pte. y Av. Madero',
    startPointName: 'Trend House (Sierra Morena #301, Bosques del Prado Norte) — Punto de inicio Zona Norte',
    telemetry: {
      lat: 21.9215,
      lng: -102.3085,
      speedKmH: 0,
      heading: 0,
      currentStreet: 'Sierra Morena #301 (Trend House - Punto de inicio Zona Norte)',
      lastUpdated: '2026-11-11T08:00:00Z',
      isSimulating: false,
    },
  },
  {
    id: 'route-planchitas-baruch',
    code: 'RUTA-PLANCHITAS-02',
    name: 'Ruta Las Planchitas — Stock Semanal Baruch (11 Sucursales)',
    zone: 'Norte (Campestre / Colosio / Altaria)',
    driverId: 'user-driver-1',
    date: '2026-11-11',
    visitDays: ['Mar', 'Jue', 'Sáb'],
    maxStops: 16,
    vanCapacityPieces: 500,
    scheduledStores: [
      'store-bosques-c',
      'store-planchitas-meridian',
      'store-pocitos-f',
      'store-trojes-i',
      'store-planchitas-papa',
      'store-planchitas-nacozari',
      'store-madero-k',
      'store-rio-san-pedro-d',
      'store-planchitas-villas',
      'store-planchitas-santa-anita',
      'store-planchitas-tecnologico',
    ],
    completedStoreIds: [],
    status: 'scheduled',
    transitCorridor: 'Circuito completo 11 sucursales Las Planchitas · Cuota Semanal Baruch: 170 Mín / 230 Máx pzas',
    startPointName: 'Las Planchitas Bosques (Av. Aguascalientes Nte. #405-A)',
    telemetry: {
      lat: 21.9135,
      lng: -102.3110,
      speedKmH: 0,
      heading: 0,
      currentStreet: 'Av. Aguascalientes Nte. #405-A (Las Planchitas Bosques)',
      lastUpdated: '2026-11-11T08:00:00Z',
      isSimulating: false,
    },
  },
];

// CERO REMISIONES PREVIAS
export const INITIAL_TICKETS: DeliveryTicket[] = [];

export const INITIAL_CROSS_SELLING_OPPORTUNITIES: CrossSellingOpportunity[] = [];
export const CROSS_SELLING_CATALOG: CrossSellingOpportunity[] = [];
export const INITIAL_CROSS_SELLING_LEADS: CrossSellingLead[] = [];
export const INITIAL_SETTLEMENTS: SettlementCut[] = [];

// Notificación de bienvenida al entorno limpio
export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-clean-ready',
    title: 'Entorno de Pruebas Reales Inicializado',
    message: 'Sistema listo con 0 marcas y 0 productos. Tienes 2 administradores y 1 repartidor listos. Usa "+ Nueva Marca" para dar de alta tus primeras marcas y productos.',
    type: 'system',
    severity: 'success',
    timestamp: 'Ahora',
    read: false,
    linkTab: 'brands',
  },
];

// CERO DESPACHOS, RETORNOS O DISCREPANCIAS PREVIAS
export const INITIAL_DISPATCHES: VanLoadingDispatch[] = [];
export const INITIAL_RECONCILIATIONS: VanReturnReconciliation[] = [];
export const INITIAL_DISCREPANCIES: DiscrepancyAuditRecord[] = [];
export const INITIAL_MOVEMENTS: InventoryMovement[] = [];
export const INITIAL_IDEAL_STOCK: StoreIdealStock[] = [];
export const INITIAL_VISIT_SNAPSHOTS: VisitSnapshot[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

