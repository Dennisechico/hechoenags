import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Brand,
  BrandCategory,
  CrossSellingLead,
  DatePeriodFilter,
  DeliveryRoute,
  DeliveryTicket,
  DriverTelemetry,
  Product,
  SettlementCut,
  Store,
  StoreStockItem,
  SystemNotification,
  User,
  InitialPlatformConfig,
  VanLoadingDispatch,
  VanReturnReconciliation,
  DiscrepancyAuditRecord,
  InventoryMovement,
  MovementType,
  LocationRef,
  StoreIdealStock,
  VisitSnapshot,
  OfflineQueuedOperation,
  AuditLogEntry,
  AuditActionType,
} from '../types';
import {
  INITIAL_BRANDS,
  INITIAL_CROSS_SELLING_LEADS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PRODUCTS,
  INITIAL_ROUTES,
  INITIAL_SETTLEMENTS,
  INITIAL_STORES,
  INITIAL_STORE_STOCK,
  INITIAL_TICKETS,
  INITIAL_USERS,
  INITIAL_PLATFORM_CONFIG,
  INITIAL_DISPATCHES,
  INITIAL_RECONCILIATIONS,
  INITIAL_DISCREPANCIES,
  INITIAL_MOVEMENTS,
  INITIAL_IDEAL_STOCK,
  INITIAL_VISIT_SNAPSHOTS,
  INITIAL_AUDIT_LOGS,
  BARUCH_BRAND_NAME,
} from '../data/seedData';
import { hashPassword, verifyPassword, generateTempPassword } from '../utils/security';

interface CreateBrandUserInput {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  brandName: string;
  tagline: string;
  category: BrandCategory;
  originLocation: string;
  address: string;
  rfc?: string;
  monthlyFee: number;
  initialProducts?: {
    name: string;
    flavor?: string;
    barcode?: string;
    description: string;
    unit: string;
    costPrice: number;
    suggestedRetailPrice: number;
    centralWarehouseStock: number;
  }[];
}

export interface RecordMovementInput {
  type: MovementType;
  fromLocation: LocationRef;
  toLocation: LocationRef;
  productId: string;
  quantity: number;
  gpsCoords?: { lat: number; lng: number };
  reason?: string;
  photoProofDataUrl?: string;
  signatureDataUrl?: string;
  confirmedByUserId?: string;
  confirmedByName?: string;
  relatedDispatchId?: string;
  relatedTicketId?: string;
  relatedRouteId?: string;
  offlineCreated?: boolean;
}

export interface SuggestedVanLoadItem {
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  flavor?: string;
  unitPrice: number;
  suggestedQty: number;
  warehouseAvailable: number;
}

interface AppContextType {
  currentUser: User | null;
  impersonatorUser: User | null;
  users: User[];
  brands: Brand[];
  products: Product[];
  stores: Store[];
  routes: DeliveryRoute[];
  storeStock: StoreStockItem[];
  idealStoreStock: StoreIdealStock[];
  movements: InventoryMovement[];
  visitSnapshots: VisitSnapshot[];
  auditLogs: AuditLogEntry[];
  tickets: DeliveryTicket[];
  crossSellingLeads: CrossSellingLead[];
  settlements: SettlementCut[];
  notifications: SystemNotification[];
  unreadNotificationsCount: number;
  activeRoute: DeliveryRoute | null;
  selectedPeriod: DatePeriodFilter;
  activeAdminTab: string;

  // Offline & Sync (Módulo 4)
  isOfflineMode: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  offlineQueue: OfflineQueuedOperation[];
  syncOfflineQueue: () => number;

  // Módulo C & Configuración Inicial
  platformConfig: InitialPlatformConfig;
  updatePlatformConfig: (config: Partial<InitialPlatformConfig>) => void;
  dispatches: VanLoadingDispatch[];
  openDispatchForDriver: (driverId?: string) => VanLoadingDispatch | undefined;
  dispatchVan: (
    data: Omit<VanLoadingDispatch, 'id' | 'folio' | 'createdAt' | 'status'>
  ) => { success: boolean; message: string; dispatch?: VanLoadingDispatch };
  acceptVanDispatch: (dispatchId: string) => { success: boolean; message: string };
  reconciliations: VanReturnReconciliation[];
  recordReturnReconciliation: (
    data: Omit<VanReturnReconciliation, 'id' | 'folio' | 'reconciledAt'>
  ) => VanReturnReconciliation;
  discrepancies: DiscrepancyAuditRecord[];
  updateDiscrepancyStatus: (
    id: string,
    status: DiscrepancyAuditRecord['resolutionStatus'],
    notes?: string
  ) => void;

  // Inventario por Movimientos & Niveles Ideales
  recordInventoryMovement: (
    input: RecordMovementInput
  ) => { success: boolean; message: string; movement?: InventoryMovement };
  getVanStockByDriver: (driverId: string) => Record<string, number>;
  setStoreIdealStock: (storeId: string, productId: string, idealQty: number, minQty?: number) => void;
  getSuggestedVanLoadForRoute: (routeId: string) => SuggestedVanLoadItem[];

  // Auth, Seguridad & Impersonación
  login: (username: string, password: string) => { success: boolean; message: string; user?: User };
  logout: () => void;
  switchUser: (userId: string) => void;
  impersonateUser: (userId: string) => { success: boolean; message: string };
  exitImpersonation: () => void;
  resetUserPassword: (userId: string) => { success: boolean; tempPassword?: string; message: string };
  toggleUserStatus: (userId: string) => { success: boolean; message: string };
  setSelectedPeriod: (period: DatePeriodFilter) => void;
  setActiveAdminTab: (tab: string) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Settlements & Cash Cuts
  addSettlement: (settlement: Omit<SettlementCut, 'id' | 'folio' | 'createdAt'>) => SettlementCut;
  updateSettlementStatus: (id: string, status: SettlementCut['status'], transferRef?: string) => void;

  // Admin Features
  createBrandUser: (data: CreateBrandUserInput) => {
    success: boolean;
    message: string;
    brandId?: string;
    userId?: string;
  };
  updateUserCredentials: (userId: string, newPassword?: string, newUsername?: string) => void;
  deleteUser: (userId: string) => void;

  recordDeliveryTicket: (
    ticket: Omit<DeliveryTicket, 'id' | 'folio' | 'timestamp'>
  ) => DeliveryTicket;
  recordCrossSellingLead: (
    lead: Omit<CrossSellingLead, 'id' | 'createdAt'>
  ) => CrossSellingLead;
  addNewProduct: (product: Omit<Product, 'id'>) => Product;
  addMultipleProducts: (products: Omit<Product, 'id'>[]) => Product[];
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addNewStore: (store: Omit<Store, 'id'>) => Store;
  bulkImportStores: (storesInput: Omit<Store, 'id'>[]) => Store[];
  addNewRoute: (route: Omit<DeliveryRoute, 'id'>) => DeliveryRoute;
  updateRouteStops: (routeId: string, orderedStoreIds: string[]) => void;
  addStoreToRoute: (routeId: string, storeId: string, insertAtIndex?: number) => void;
  removeStoreFromRoute: (routeId: string, storeId: string) => void;
  selectActiveRoute: (routeId: string) => void;
  startRoute: (routeId: string) => void;
  pauseRoute: (routeId: string) => void;
  completeRoute: (routeId: string) => void;
  updateRouteTelemetry: (routeId: string, telemetry: Partial<DriverTelemetry>) => void;
  updateStoreStockLimits: (
    storeId: string,
    weeklyMin: number,
    weeklyMax: number,
    brandName?: string
  ) => void;
  requestRestock: (
    brandId: string,
    storeId: string,
    productId: string,
    requestedPieces: number
  ) => void;
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
  resetAllData: () => void;

  // Global Modals & Toast Feedback
  isCreateRouteModalOpen: boolean;
  setIsCreateRouteModalOpen: (open: boolean) => void;
  isSmartRouteGeneratorModalOpen: boolean;
  setIsSmartRouteGeneratorModalOpen: (open: boolean) => void;
  isCreateStoreModalOpen: boolean;
  setIsCreateStoreModalOpen: (open: boolean) => void;
  isCreateBrandModalOpen: boolean;
  setIsCreateBrandModalOpen: (open: boolean) => void;
  toastMessage: { text: string; type: 'success' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'info') => void;
  dismissToast: () => void;
}

const STORAGE_KEY_PREFIX = 'hecho_en_ags_eje_v9_';

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hecho_en_ags_') && !k.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
} catch {
  // ignore
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function migrateUserRecord(raw: User & { password?: string }): User {
  const clean: User = {
    id: raw.id,
    username: raw.username,
    passwordHash: raw.passwordHash || '',
    passwordSalt: raw.passwordSalt || '',
    status: raw.status || 'active',
    mustChangePassword: raw.mustChangePassword,
    tempPasswordIssuedAt: raw.tempPasswordIssuedAt,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    role: raw.role,
    brandId: raw.brandId,
    driverZone: raw.driverZone,
    avatarUrl: raw.avatarUrl || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    lastLogin: raw.lastLogin,
  };

  if (!clean.passwordHash || !clean.passwordSalt) {
    const fallbackSecret =
      raw.password ||
      (raw.username === 'admin'
        ? 'admin2026'
        : raw.username === 'almacen'
          ? 'almacen2026'
          : raw.username === 'repartidor'
            ? 'ruta2026'
            : 'ags2026');
    const sec = hashPassword(fallbackSecret);
    clean.passwordHash = sec.hash;
    clean.passwordSalt = sec.salt;
  }
  return clean;
}

function migrateDispatchRecord(raw: Omit<VanLoadingDispatch, 'status'> & { status: string }): VanLoadingDispatch {
  let mappedStatus = raw.status as VanLoadingDispatch['status'];
  if (raw.status === 'loaded') mappedStatus = 'proposed';
  else if (raw.status === 'in_transit') mappedStatus = 'open_in_transit';
  else if (raw.status === 'reconciled') mappedStatus = 'closed_reconciled';
  return {
    ...raw,
    status: mappedStatus,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
      if (saved) {
        const parsed: (User & { password?: string })[] = JSON.parse(saved);
        const hasLegacy = parsed.some((u) => /vero|marcela|macías|macias/i.test(u.name));
        if (!hasLegacy && parsed.length >= 3) {
          return parsed.map(migrateUserRecord);
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}brands`);
      return saved ? JSON.parse(saved) : INITIAL_BRANDS;
    } catch {
      return INITIAL_BRANDS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}products`);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}stores`);
      if (saved) {
        const parsed: Store[] = JSON.parse(saved);
        const merged = parsed.map((st) => {
          const seedMatch = INITIAL_STORES.find((s) => s.id === st.id);
          if (!seedMatch) return st;
          return {
            ...st,
            name: st.name.startsWith('Suc. ') ? seedMatch.name : st.name,
            performance: st.performance || seedMatch.performance,
            weeklyStockLimits:
              st.weeklyStockLimits && st.weeklyStockLimits.length > 0
                ? st.weeklyStockLimits
                : seedMatch.weeklyStockLimits,
          };
        });
        const existingIds = new Set(merged.map((s) => s.id));
        const missingSeeds = INITIAL_STORES.filter((s) => !existingIds.has(s.id));
        return [...merged, ...missingSeeds];
      }
    } catch {
      // ignore
    }
    return INITIAL_STORES;
  });

  const [routes, setRoutes] = useState<DeliveryRoute[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}routes`);
      if (saved) {
        const parsed: DeliveryRoute[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((r) => r.id));
        const missingRoutes = INITIAL_ROUTES.filter((r) => !existingIds.has(r.id));
        return [...parsed, ...missingRoutes];
      }
    } catch {
      // ignore
    }
    return INITIAL_ROUTES;
  });

  const [storeStock, setStoreStock] = useState<StoreStockItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}store_stock`);
      return saved ? JSON.parse(saved) : INITIAL_STORE_STOCK;
    } catch {
      return INITIAL_STORE_STOCK;
    }
  });

  const [idealStoreStock, setIdealStoreStockState] = useState<StoreIdealStock[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}ideal_stock`);
      return saved ? JSON.parse(saved) : INITIAL_IDEAL_STOCK;
    } catch {
      return INITIAL_IDEAL_STOCK;
    }
  });

  const [movements, setMovements] = useState<InventoryMovement[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}movements`);
      if (saved) return JSON.parse(saved);
      // Seed initial entrada movements if existing products already had stock before ledger migration
      const savedProductsRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}products`);
      if (savedProductsRaw) {
        const prods: Product[] = JSON.parse(savedProductsRaw);
        const migrated: InventoryMovement[] = prods
          .filter((p) => p.centralWarehouseStock > 0)
          .map((p, idx) => ({
            id: `mov-init-${p.id}-${idx}`,
            folio: `MOV-INIT-${100 + idx}`,
            type: 'entrada',
            fromLocation: { type: 'external', id: 'supplier', label: 'Proveedor / Marca' },
            toLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
            productId: p.id,
            productName: p.name,
            brandId: p.brandId,
            brandName: '',
            flavor: p.flavor,
            quantity: p.centralWarehouseStock,
            performedByUserId: 'user-admin-1',
            performedByName: 'Migración Inicial Kardex',
            timestamp: new Date().toISOString(),
            reason: 'Saldo inicial migrado al libro de movimientos',
          }));
        return migrated;
      }
    } catch {
      // ignore
    }
    return INITIAL_MOVEMENTS;
  });

  const [visitSnapshots, setVisitSnapshots] = useState<VisitSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}visit_snapshots`);
      return saved ? JSON.parse(saved) : INITIAL_VISIT_SNAPSHOTS;
    } catch {
      return INITIAL_VISIT_SNAPSHOTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}audit_logs`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [tickets, setTickets] = useState<DeliveryTicket[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}tickets`);
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [crossSellingLeads, setCrossSellingLeads] = useState<CrossSellingLead[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}leads`);
      return saved ? JSON.parse(saved) : INITIAL_CROSS_SELLING_LEADS;
    } catch {
      return INITIAL_CROSS_SELLING_LEADS;
    }
  });

  const [settlements, setSettlements] = useState<SettlementCut[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}settlements`);
      return saved ? JSON.parse(saved) : INITIAL_SETTLEMENTS;
    } catch {
      return INITIAL_SETTLEMENTS;
    }
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [platformConfig, setPlatformConfig] = useState<InitialPlatformConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}platform_config`);
      return saved ? JSON.parse(saved) : INITIAL_PLATFORM_CONFIG;
    } catch {
      return INITIAL_PLATFORM_CONFIG;
    }
  });

  const [dispatches, setDispatches] = useState<VanLoadingDispatch[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}dispatches`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(migrateDispatchRecord);
      }
    } catch {
      // ignore
    }
    return INITIAL_DISPATCHES;
  });

  const [reconciliations, setReconciliations] = useState<VanReturnReconciliation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reconciliations`);
      return saved ? JSON.parse(saved) : INITIAL_RECONCILIATIONS;
    } catch {
      return INITIAL_RECONCILIATIONS;
    }
  });

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}discrepancies`);
      return saved ? JSON.parse(saved) : INITIAL_DISCREPANCIES;
    } catch {
      return INITIAL_DISCREPANCIES;
    }
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedOperation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}offline_queue`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const isOfflineMode = !browserOnline || simulatedOffline;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriodFilter>('today');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('brands');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonatorUser, setImpersonatorUser] = useState<User | null>(null);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_config`, JSON.stringify(platformConfig));
  }, [platformConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}dispatches`, JSON.stringify(dispatches));
  }, [dispatches]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reconciliations`, JSON.stringify(reconciliations));
  }, [reconciliations]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}discrepancies`, JSON.stringify(discrepancies));
  }, [discrepancies]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}brands`, JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}stores`, JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}routes`, JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}store_stock`, JSON.stringify(storeStock));
  }, [storeStock]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}ideal_stock`, JSON.stringify(idealStoreStock));
  }, [idealStoreStock]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}movements`, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}visit_snapshots`, JSON.stringify(visitSnapshots));
  }, [visitSnapshots]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tickets`, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}leads`, JSON.stringify(crossSellingLeads));
  }, [crossSellingLeads]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}settlements`, JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}offline_queue`, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user_id`, currentUser.id);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
    }
  }, [currentUser]);

  // Real-time Cross-Tab Location Synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const channel = new BroadcastChannel('hecho_en_ags_telemetry');
      channel.onmessage = (event) => {
        if (event.data?.type === 'TELEMETRY_UPDATE' && event.data.routeId) {
          const { routeId, telemetry } = event.data;
          setRoutes((prev) =>
            prev.map((r) => {
              if (r.id === routeId) {
                return {
                  ...r,
                  telemetry: {
                    lat: telemetry.lat ?? r.telemetry?.lat ?? 21.881,
                    lng: telemetry.lng ?? r.telemetry?.lng ?? -102.299,
                    speedKmH: telemetry.speedKmH ?? r.telemetry?.speedKmH ?? 0,
                    heading: telemetry.heading ?? r.telemetry?.heading ?? 0,
                    currentStreet: telemetry.currentStreet ?? r.telemetry?.currentStreet ?? '',
                    lastUpdated: new Date().toISOString(),
                    isSimulating: telemetry.isSimulating ?? r.telemetry?.isSimulating ?? false,
                    adaptiveIntervalSec: telemetry.adaptiveIntervalSec,
                    batterySaverActive: telemetry.batterySaverActive,
                  },
                };
              }
              return r;
            })
          );
        }
      };
      return () => channel.close();
    } catch {
      // ignore
    }
  }, []);

  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);
  const [isSmartRouteGeneratorModalOpen, setIsSmartRouteGeneratorModalOpen] = useState(false);
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [isCreateBrandModalOpen, setIsCreateBrandModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  };

  const dismissToast = () => setToastMessage(null);

  const addAuditLog = (
    action: AuditActionType,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    targetLabel: string,
    details: string,
    actorOverride?: User
  ) => {
    const actor = actorOverride || impersonatorUser || currentUser;
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorUserId: actor?.id || 'system',
      actorName: actor?.name || 'Sistema',
      actorRole: actor?.role || 'admin',
      action,
      targetType,
      targetId,
      targetLabel,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // ==========================================
  // LEDGER-COMPUTED STOCK HELPER
  // ==========================================
  const warehouseStockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    movements.forEach((m) => {
      if (m.toLocation.type === 'warehouse') {
        map[m.productId] = (map[m.productId] || 0) + m.quantity;
      }
      if (m.fromLocation.type === 'warehouse') {
        map[m.productId] = (map[m.productId] || 0) - m.quantity;
      }
    });
    return map;
  }, [movements]);

  const getVanStockByDriver = (driverId: string): Record<string, number> => {
    const vanLocId = `van-${driverId}`;
    const map: Record<string, number> = {};
    movements.forEach((m) => {
      if (m.toLocation.type === 'van' && m.toLocation.id === vanLocId) {
        map[m.productId] = (map[m.productId] || 0) + m.quantity;
      }
      if (m.fromLocation.type === 'van' && m.fromLocation.id === vanLocId) {
        map[m.productId] = (map[m.productId] || 0) - m.quantity;
      }
    });
    return map;
  };

  const applyMovementsBatch = (newMovements: InventoryMovement[]) => {
    if (newMovements.length === 0) return;

    setMovements((prev) => {
      const updated = [...newMovements, ...prev];

      // Recompute exact warehouse stock per product strictly as sum of movements
      const whMap: Record<string, number> = {};
      const storeMap: Record<string, number> = {};
      updated.forEach((m) => {
        if (m.toLocation.type === 'warehouse') {
          whMap[m.productId] = (whMap[m.productId] || 0) + m.quantity;
        }
        if (m.fromLocation.type === 'warehouse') {
          whMap[m.productId] = (whMap[m.productId] || 0) - m.quantity;
        }
        if (m.toLocation.type === 'store') {
          const key = `${m.toLocation.id}::${m.productId}`;
          storeMap[key] = (storeMap[key] || 0) + m.quantity;
        }
        if (m.fromLocation.type === 'store') {
          const key = `${m.fromLocation.id}::${m.productId}`;
          storeMap[key] = (storeMap[key] || 0) - m.quantity;
        }
      });

      setProducts((currProds) =>
        currProds.map((p) => ({
          ...p,
          centralWarehouseStock: Math.max(0, whMap[p.id] ?? 0),
        }))
      );

      setStoreStock((currStoreStock) => {
        const nextList = [...currStoreStock];
        const todayStr = new Date().toISOString().split('T')[0];

        newMovements.forEach((m) => {
          const storeIdsToTouch: string[] = [];
          if (m.toLocation.type === 'store') storeIdsToTouch.push(m.toLocation.id);
          if (m.fromLocation.type === 'store') storeIdsToTouch.push(m.fromLocation.id);

          storeIdsToTouch.forEach((sId) => {
            const computedQty = Math.max(0, storeMap[`${sId}::${m.productId}`] ?? 0);
            const idx = nextList.findIndex(
              (item) => item.storeId === sId && item.productId === m.productId
            );
            if (idx >= 0) {
              nextList[idx] = {
                ...nextList[idx],
                currentStock: computedQty,
                lastRestockedDate: todayStr,
              };
            } else {
              nextList.push({
                storeId: sId,
                brandId: m.brandId,
                productId: m.productId,
                currentStock: computedQty,
                lastRestockedDate: todayStr,
                targetMaxStock: Math.max(15, computedQty * 2),
              });
            }
          });
        });

        return nextList;
      });

      return updated;
    });
  };

  const recordInventoryMovement = (
    input: RecordMovementInput
  ): { success: boolean; message: string; movement?: InventoryMovement } => {
    const qty = Math.round(Number(input.quantity));
    if (!qty || qty <= 0) {
      return { success: false, message: 'La cantidad del movimiento debe ser mayor a 0.' };
    }

    const actor = currentUser;
    if (input.type === 'ajuste') {
      if (actor?.role !== 'admin') {
        return {
          success: false,
          message: 'Solo el Super Administrador puede registrar movimientos de Ajuste.',
        };
      }
      if (!input.reason || input.reason.trim().length < 5) {
        return {
          success: false,
          message: 'Todo Ajuste requiere un motivo obligatorio (mínimo 5 caracteres).',
        };
      }
    }

    if (input.type === 'merma') {
      if (!input.reason || input.reason.trim().length < 3) {
        return { success: false, message: 'Toda Merma requiere especificar un motivo.' };
      }
      if (!input.photoProofDataUrl) {
        return { success: false, message: 'Toda Merma requiere adjuntar evidencia fotográfica.' };
      }
    }

    const prod = products.find((p) => p.id === input.productId);
    if (!prod) {
      return { success: false, message: 'Producto no encontrado en catálogo.' };
    }
    const brand = brands.find((b) => b.id === prod.brandId);

    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      folio: `MOV-${input.type.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: input.type,
      fromLocation: input.fromLocation,
      toLocation: input.toLocation,
      productId: prod.id,
      productName: prod.name,
      brandId: prod.brandId,
      brandName: brand?.name || 'Marca Local',
      flavor: prod.flavor,
      quantity: qty,
      performedByUserId: actor?.id || 'system',
      performedByName: actor?.name || 'Sistema',
      confirmedByUserId: input.confirmedByUserId,
      confirmedByName: input.confirmedByName,
      gpsCoords: input.gpsCoords,
      timestamp: new Date().toISOString(),
      reason: input.reason?.trim(),
      photoProofDataUrl: input.photoProofDataUrl,
      signatureDataUrl: input.signatureDataUrl,
      relatedDispatchId: input.relatedDispatchId,
      relatedTicketId: input.relatedTicketId,
      relatedRouteId: input.relatedRouteId,
      offlineCreated: input.offlineCreated,
    };

    applyMovementsBatch([newMovement]);

    if (input.type === 'ajuste') {
      addAuditLog(
        'manual_adjustment',
        'inventory',
        prod.id,
        prod.name,
        `Ajuste ${input.fromLocation.label} → ${input.toLocation.label} (${qty} pzas). Motivo: ${input.reason}`
      );
    }

    showToast(`Movimiento ${newMovement.folio} (${input.type.toUpperCase()}) registrado.`);
    return { success: true, message: 'Movimiento registrado.', movement: newMovement };
  };

  // ==========================================
  // AUTH, IMPERSONATION & SECURITY
  // ==========================================
  const login = (username: string, password: string) => {
    const cleanedUser = username.trim().toLowerCase();
    const cleanedPass = password.trim();

    const user = users.find((u) => u.username.toLowerCase() === cleanedUser);
    if (!user) {
      return {
        success: false,
        message: 'Usuario o contraseña incorrectos. Verifica tus credenciales.',
      };
    }

    if (user.status === 'blocked') {
      addAuditLog(
        'login_blocked',
        'user',
        user.id,
        user.username,
        `Intento de acceso rechazado: usuario bloqueado.`,
        user
      );
      return {
        success: false,
        message: 'Esta cuenta está bloqueada o desactivada por el Administrador.',
      };
    }

    const isValid = verifyPassword(cleanedPass, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return {
        success: false,
        message: 'Usuario o contraseña incorrectos. Verifica tus credenciales.',
      };
    }

    const updatedUser: User = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    setImpersonatorUser(null);
    setCurrentUser(updatedUser);
    addAuditLog(
      'login_success',
      'user',
      updatedUser.id,
      updatedUser.name,
      `Inicio de sesión exitoso (${updatedUser.role}).`,
      updatedUser
    );
    return { success: true, message: `Bienvenido(a), ${user.name}`, user: updatedUser };
  };

  const logout = () => {
    setImpersonatorUser(null);
    setCurrentUser(null);
  };

  const impersonateUser = (userId: string): { success: boolean; message: string } => {
    const realAdmin = impersonatorUser || currentUser;
    if (!realAdmin || realAdmin.role !== 'admin') {
      return {
        success: false,
        message: 'Solo el Super Administrador puede entrar como otro usuario.',
      };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Usuario destino no encontrado.' };
    }
    if (target.status === 'blocked') {
      return {
        success: false,
        message: 'No puedes entrar como un usuario bloqueado. Actívalo primero.',
      };
    }
    if (!impersonatorUser) {
      setImpersonatorUser(realAdmin);
    }
    setCurrentUser(target);
    addAuditLog(
      'impersonation_start',
      'user',
      target.id,
      target.name,
      `Super Admin "${realAdmin.name}" entró como "${target.name}" (${target.role}).`,
      realAdmin
    );
    showToast(`Entraste como ${target.name} (acción registrada en bitácora)`, 'info');
    return { success: true, message: `Sesión visualizada como ${target.name}` };
  };

  const exitImpersonation = () => {
    if (!impersonatorUser) return;
    const prevViewed = currentUser;
    addAuditLog(
      'impersonation_end',
      'user',
      prevViewed?.id || 'unknown',
      prevViewed?.name || 'Usuario',
      `Super Admin "${impersonatorUser.name}" finalizó vista como "${prevViewed?.name || ''}".`,
      impersonatorUser
    );
    setCurrentUser(impersonatorUser);
    setImpersonatorUser(null);
    showToast('Regresaste a tu sesión de Super Administrador.');
  };

  const switchUser = (userId: string) => {
    const realAdmin = impersonatorUser || currentUser;
    if (realAdmin && realAdmin.role === 'admin') {
      if (userId === realAdmin.id) {
        exitImpersonation();
        return;
      }
      impersonateUser(userId);
      return;
    }
    showToast('Cambio directo bloqueado por seguridad. Inicia sesión con tus credenciales.', 'info');
  };

  const resetUserPassword = (
    userId: string
  ): { success: boolean; tempPassword?: string; message: string } => {
    const realAdmin = impersonatorUser || currentUser;
    if (!realAdmin || realAdmin.role !== 'admin') {
      return { success: false, message: 'Permiso denegado: solo Super Admin.' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'Usuario no encontrado.' };

    const tempPassword = generateTempPassword();
    const sec = hashPassword(tempPassword);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              passwordHash: sec.hash,
              passwordSalt: sec.salt,
              mustChangePassword: true,
              tempPasswordIssuedAt: new Date().toISOString(),
            }
          : u
      )
    );

    addAuditLog(
      'password_reset',
      'user',
      target.id,
      target.name,
      `Se generó contraseña temporal cifrada para "${target.username}".`,
      realAdmin
    );

    return {
      success: true,
      tempPassword,
      message: `Contraseña temporal generada para ${target.username}.`,
    };
  };

  const toggleUserStatus = (userId: string): { success: boolean; message: string } => {
    const realAdmin = impersonatorUser || currentUser;
    if (!realAdmin || realAdmin.role !== 'admin') {
      return { success: false, message: 'Permiso denegado.' };
    }
    if (userId === realAdmin.id) {
      return { success: false, message: 'No puedes bloquear tu propia cuenta de Super Admin.' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'Usuario no encontrado.' };

    const nextStatus = target.status === 'blocked' ? 'active' : 'blocked';
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));

    addAuditLog(
      'user_status_change',
      'user',
      target.id,
      target.name,
      `Usuario "${target.username}" ${nextStatus === 'blocked' ? 'BLOQUEADO' : 'ACTIVADO'}.`,
      realAdmin
    );
    showToast(
      `Usuario ${target.username} ${nextStatus === 'blocked' ? 'bloqueado' : 'reactivado'}.`
    );
    return { success: true, message: `Estado actualizado a ${nextStatus}.` };
  };

  const createBrandUser = (data: CreateBrandUserInput) => {
    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, message: 'La contraseña debe tener al menos 4 caracteres.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return {
        success: false,
        message: `El usuario "${data.username}" ya está registrado en el sistema.`,
      };
    }

    const newBrandId = `brand-${Date.now()}`;
    const newUserId = `user-brand-${Date.now()}`;
    const sec = hashPassword(data.password);

    const newBrand: Brand = {
      id: newBrandId,
      name: data.brandName.trim(),
      slug: data.brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: data.tagline.trim() || 'Productos artesanales con orgullo hidrocálido',
      category: data.category,
      originLocation: data.originLocation.trim() || 'Aguascalientes, Ags',
      accentColor: '#d97706',
      contactName: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      address: data.address.trim() || 'Aguascalientes, México',
      rfc: data.rfc?.trim().toUpperCase(),
      subscription: {
        planName: 'Ruta Compartida Hecho en Ags',
        monthlyFee: Number(data.monthlyFee) || 1200,
        status: 'active',
        nextBillingDate: '2026-11-01',
        lastPaymentDate: new Date().toISOString().split('T')[0],
      },
      createdAt: new Date().toISOString(),
    };

    const newUser: User = {
      id: newUserId,
      username: cleanUsername,
      passwordHash: sec.hash,
      passwordSalt: sec.salt,
      status: 'active',
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      role: 'brand',
      brandId: newBrandId,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    };

    let createdProducts: Product[] = [];
    if (data.initialProducts && data.initialProducts.length > 0) {
      createdProducts = data.initialProducts.map((p, idx) => ({
        id: `prod-${Date.now()}-${idx}`,
        brandId: newBrandId,
        name: p.name,
        flavor: p.flavor?.trim() || 'Original',
        sku: `${data.brandName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${idx + 1}`,
        barcode:
          p.barcode?.trim() ||
          `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13),
        description: p.description || 'Producto artesanal hecho en Aguascalientes',
        category: data.category,
        unit: p.unit || 'pza',
        costPrice: Number(p.costPrice) || 50,
        suggestedRetailPrice: Number(p.suggestedRetailPrice) || 85,
        centralWarehouseStock: Number(p.centralWarehouseStock) || 0,
        minStockAlert: 10,
      }));
    } else {
      createdProducts = [
        {
          id: `prod-${Date.now()}-default`,
          brandId: newBrandId,
          name: `${data.brandName} - Presentación Artesanal`,
          flavor: 'Original',
          sku: `${data.brandName.substring(0, 3).toUpperCase()}-ORIGINAL-01`,
          barcode: `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13),
          description: `Producto insignia de ${data.brandName} elaborado artesanalmente en ${data.originLocation}.`,
          category: data.category,
          unit: 'pza',
          costPrice: 60,
          suggestedRetailPrice: 100,
          centralWarehouseStock: 60,
          minStockAlert: 15,
        },
      ];
    }

    // Record initial 'entrada' movements to Bodega Central for each product with stock > 0
    const initialEntries: InventoryMovement[] = createdProducts
      .filter((p) => p.centralWarehouseStock > 0)
      .map((p, idx) => ({
        id: `mov-alta-${Date.now()}-${idx}`,
        folio: `MOV-ENT-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'entrada',
        fromLocation: { type: 'external', id: 'supplier', label: `Marca: ${newBrand.name}` },
        toLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
        productId: p.id,
        productName: p.name,
        brandId: newBrandId,
        brandName: newBrand.name,
        flavor: p.flavor,
        quantity: p.centralWarehouseStock,
        performedByUserId: currentUser?.id || 'user-admin-1',
        performedByName: currentUser?.name || 'Admin Bodega',
        timestamp: new Date().toISOString(),
        reason: 'Alta inicial de inventario de marca en Bodega Central',
      }));

    setBrands((prev) => [newBrand, ...prev]);
    setUsers((prev) => [newUser, ...prev]);
    setProducts((prev) => [...createdProducts, ...prev]);
    if (initialEntries.length > 0) {
      setMovements((prev) => [...initialEntries, ...prev]);
    }

    addAuditLog(
      'user_created',
      'brand',
      newBrandId,
      newBrand.name,
      `Alta de marca "${newBrand.name}" con usuario "${cleanUsername}" (contraseña cifrada) y ${createdProducts.length} productos.`
    );

    return {
      success: true,
      message: `¡Marca "${data.brandName}" y usuario "${cleanUsername}" creados con cifrado seguro!`,
      brandId: newBrandId,
      userId: newUserId,
    };
  };

  const updateUserCredentials = (userId: string, newPassword?: string, newUsername?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const sec = newPassword ? hashPassword(newPassword) : null;
        return {
          ...u,
          ...(sec ? { passwordHash: sec.hash, passwordSalt: sec.salt, mustChangePassword: false } : {}),
          ...(newUsername ? { username: newUsername.trim().toLowerCase() } : {}),
        };
      })
    );
    if (newPassword) {
      addAuditLog(
        'password_reset',
        'user',
        userId,
        newUsername || userId,
        'Actualización directa de credenciales cifradas por Super Admin.'
      );
    }
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (target) {
      addAuditLog('user_deleted', 'user', userId, target.name, `Usuario "${target.username}" eliminado.`);
    }
  };

  // ==========================================
  // CICLO DIARIO DEL REPARTIDOR & DISPATCH
  // ==========================================
  const openDispatchForDriver = (driverId: string = 'user-driver-1'): VanLoadingDispatch | undefined => {
    return dispatches.find(
      (d) =>
        d.driverId === driverId &&
        (d.status === 'proposed' || d.status === 'open_in_transit' || d.status === 'pending_return')
    );
  };

  const dispatchVan = (
    data: Omit<VanLoadingDispatch, 'id' | 'folio' | 'createdAt' | 'status'>
  ): { success: boolean; message: string; dispatch?: VanLoadingDispatch } => {
    // CRITICAL BUSINESS RULE: No se puede abrir una carga nueva sin cerrar la anterior
    const existingOpen = dispatches.find(
      (d) =>
        d.driverId === data.driverId &&
        (d.status === 'proposed' || d.status === 'open_in_transit' || d.status === 'pending_return')
    );
    if (existingOpen) {
      return {
        success: false,
        message: `Bloqueado: El repartidor ${data.driverName} tiene la jornada ${existingOpen.folio} (${existingOpen.status}) abierta sin liquidar. Debe cerrarse antes de abrir una carga nueva.`,
      };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, message: 'Selecciona al menos 1 producto para cargar.' };
    }

    // Check warehouse availability
    for (const item of data.items) {
      const avail = warehouseStockByProduct[item.productId] ?? products.find((p) => p.id === item.productId)?.centralWarehouseStock ?? 0;
      if (item.loadedQty > avail) {
        return {
          success: false,
          message: `Stock insuficiente en Bodega para "${item.productName}": disponible ${avail}, solicitado ${item.loadedQty}.`,
        };
      }
    }

    const id = `disp-${Date.now()}`;
    const folioNumber = Math.floor(100 + Math.random() * 900);
    const folio = `DESP-AGS-2026-${folioNumber}`;

    const newDispatch: VanLoadingDispatch = {
      ...data,
      id,
      folio,
      status: 'proposed', // Bodega propone y escanea; repartidor acepta para abrir camioneta
      createdAt: new Date().toISOString(),
    };

    setDispatches((prev) => [newDispatch, ...prev]);

    const notif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: 'Carga de Camioneta Lista para Aceptación',
      message: `Folio ${folio}: Bodega preparó ${data.totalPieces} pzas para ruta ${data.routeCode}. Esperando confirmación del repartidor ${data.driverName}.`,
      type: 'warehouse',
      severity: 'info',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'warehouse',
    };
    setNotifications((prev) => [notif, ...prev]);

    addAuditLog(
      'van_dispatch_created',
      'dispatch',
      id,
      folio,
      `Carga propuesta para ${data.driverName} (${data.totalPieces} pzas). Pendiente aceptación del repartidor.`
    );

    showToast(`Carga ${folio} preparada. Esperando que el repartidor la acepte para abrir jornada.`);
    return { success: true, message: `Carga ${folio} preparada.`, dispatch: newDispatch };
  };

  const acceptVanDispatch = (dispatchId: string): { success: boolean; message: string } => {
    const target = dispatches.find((d) => d.id === dispatchId);
    if (!target) return { success: false, message: 'Despacho no encontrado.' };
    if (target.status !== 'proposed') {
      return { success: false, message: 'Esta carga ya fue aceptada o cerrada.' };
    }

    const driverUser = users.find((u) => u.id === target.driverId);
    const nowIso = new Date().toISOString();

    // Dual confirmation: write immutable 'carga' movements (Bodega -> Camioneta)
    const cargaMovements: InventoryMovement[] = target.items
      .filter((i) => i.loadedQty > 0)
      .map((item, idx) => ({
        id: `mov-carga-${Date.now()}-${idx}`,
        folio: `MOV-CAR-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'carga',
        fromLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
        toLocation: {
          type: 'van',
          id: `van-${target.driverId}`,
          label: `Camioneta (${target.driverName})`,
        },
        productId: item.productId,
        productName: item.productName,
        brandId: item.brandId,
        brandName: item.brandName,
        flavor: item.flavor,
        quantity: item.loadedQty,
        performedByUserId: currentUser?.id || target.driverId,
        performedByName: target.warehouseManager,
        confirmedByUserId: currentUser?.id || driverUser?.id || target.driverId,
        confirmedByName: currentUser?.name || target.driverName,
        timestamp: nowIso,
        reason: `Carga aceptada en doble confirmación (${target.folio})`,
        relatedDispatchId: target.id,
        relatedRouteId: target.routeId,
      }));

    applyMovementsBatch(cargaMovements);

    setDispatches((prev) =>
      prev.map((d) =>
        d.id === dispatchId
          ? {
              ...d,
              status: 'open_in_transit',
              driverAcceptedAt: nowIso,
              driverAcceptedBy: currentUser?.name || target.driverName,
            }
          : d
      )
    );

    addAuditLog(
      'van_dispatch_accepted',
      'dispatch',
      target.id,
      target.folio,
      `Repartidor "${currentUser?.name || target.driverName}" aceptó carga de ${target.totalPieces} pzas. Camioneta abierta.`
    );

    showToast(`¡Carga ${target.folio} aceptada! Camioneta abierta con ${target.totalPieces} piezas.`);
    return { success: true, message: 'Camioneta abierta con stock confirmado.' };
  };

  // ==========================================
  // ENTREGA EN TIENDA + SNAPSHOT + MOVIMIENTOS
  // ==========================================
  const processTicketInternal = (
    ticketInput: Omit<DeliveryTicket, 'id' | 'folio' | 'timestamp'>,
    wasOffline: boolean
  ): DeliveryTicket => {
    const timestamp = new Date().toISOString();
    const folioNumber = Math.floor(1000 + Math.random() * 9000);
    const folio = `REM-AGS-2026-${folioNumber}`;
    const ticketId = `ticket-${Date.now()}-${Math.floor(Math.random() * 100)}`;

    const newTicket: DeliveryTicket = {
      ...ticketInput,
      id: ticketId,
      folio,
      timestamp,
      offlineQueued: wasOffline,
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Update route progress
    let routeAllDone = false;
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === ticketInput.routeId) {
          const completedStoreIds = Array.from(new Set([...r.completedStoreIds, ticketInput.storeId]));
          routeAllDone = r.scheduledStores.every((sId) => completedStoreIds.includes(sId));
          return {
            ...r,
            completedStoreIds,
            status: routeAllDone ? 'completed' : 'in_progress',
          };
        }
        return r;
      })
    );

    const driverLoc: LocationRef = {
      type: 'van',
      id: `van-${ticketInput.driverId}`,
      label: `Camioneta (${ticketInput.driverName})`,
    };
    const storeLoc: LocationRef = {
      type: 'store',
      id: ticketInput.storeId,
      label: ticketInput.storeName,
    };

    const batchMovements: InventoryMovement[] = [];
    const newSnapshots: VisitSnapshot[] = [];

    // 1) 'entrega' movements (Camioneta -> Punto de venta)
    ticketInput.items.forEach((item, idx) => {
      if (item.quantity > 0) {
        batchMovements.push({
          id: `mov-ent-${Date.now()}-${idx}`,
          folio: `MOV-DLV-${folioNumber}-${idx + 1}`,
          type: 'entrega',
          fromLocation: driverLoc,
          toLocation: storeLoc,
          productId: item.productId,
          productName: item.productName,
          brandId: item.brandId,
          brandName: item.brandName,
          flavor: item.flavor,
          quantity: item.quantity,
          performedByUserId: ticketInput.driverId,
          performedByName: ticketInput.driverName,
          confirmedByName: ticketInput.recipientName,
          gpsCoords: ticketInput.gpsCoords,
          timestamp,
          signatureDataUrl: ticketInput.recipientSignature || undefined,
          photoProofDataUrl: ticketInput.photoProofDataUrl || undefined,
          relatedDispatchId: ticketInput.dispatchId,
          relatedTicketId: ticketId,
          relatedRouteId: ticketInput.routeId,
          offlineCreated: wasOffline,
        });
      }
    });

    // 2) 'recoleccion' movements (Punto de venta -> Camioneta por caducado o dañado)
    (ticketInput.collectedItems || []).forEach((col, idx) => {
      if (col.quantity > 0) {
        batchMovements.push({
          id: `mov-rec-${Date.now()}-${idx}`,
          folio: `MOV-COL-${folioNumber}-${idx + 1}`,
          type: 'recoleccion',
          fromLocation: storeLoc,
          toLocation: driverLoc,
          productId: col.productId,
          productName: col.productName,
          brandId: col.brandId,
          brandName: col.brandName,
          quantity: col.quantity,
          performedByUserId: ticketInput.driverId,
          performedByName: ticketInput.driverName,
          confirmedByName: ticketInput.recipientName,
          gpsCoords: ticketInput.gpsCoords,
          timestamp,
          reason: `Recolección en punto: ${col.reason === 'caducado' ? 'Producto caducado' : 'Producto dañado'}`,
          photoProofDataUrl: col.photoDataUrl || ticketInput.photoProofDataUrl,
          relatedDispatchId: ticketInput.dispatchId,
          relatedTicketId: ticketId,
          relatedRouteId: ticketInput.routeId,
          offlineCreated: wasOffline,
        });
      }
    });

    // 3) Compute VisitSnapshot per touched product for real Brand sell-through analytics:
    // Venta en el periodo = stock visita anterior + entregado - recogido - stock actual (ending)
    // Equivalent to: previousEndingStock - (shelfCountOnArrival + collectedQty)
    const touchedProductIds = Array.from(
      new Set([
        ...ticketInput.items.map((i) => i.productId),
        ...Object.keys(ticketInput.shelfCounts || {}),
        ...(ticketInput.collectedItems || []).map((c) => c.productId),
      ])
    );

    touchedProductIds.forEach((pId, idx) => {
      const prod = products.find((p) => p.id === pId);
      const deliveredItem = ticketInput.items.find((i) => i.productId === pId);
      const collectedItem = (ticketInput.collectedItems || []).find((c) => c.productId === pId);
      const deliveredQty = deliveredItem?.quantity || 0;
      const collectedQty = collectedItem?.quantity || 0;

      const prevStockItem = storeStock.find(
        (s) => s.storeId === ticketInput.storeId && s.productId === pId
      );
      const previousShelfStock = prevStockItem?.currentStock ?? 0;
      const shelfCountOnArrival =
        ticketInput.shelfCounts && ticketInput.shelfCounts[pId] !== undefined
          ? ticketInput.shelfCounts[pId]
          : previousShelfStock;

      // Exact formula requested: stock_anterior + entregado_anterior_ya_en_prev - stock_en_esta_visita
      // And store ending stock after this visit = shelfCountOnArrival - collectedQty + deliveredQty
      const soldInPeriod = Math.max(0, previousShelfStock - shelfCountOnArrival);
      const endingShelfStock = Math.max(0, shelfCountOnArrival - collectedQty + deliveredQty);

      newSnapshots.push({
        id: `snap-${Date.now()}-${idx}`,
        ticketId,
        storeId: ticketInput.storeId,
        storeName: ticketInput.storeName,
        routeId: ticketInput.routeId,
        brandId: deliveredItem?.brandId || prod?.brandId || '',
        productId: pId,
        productName: deliveredItem?.productName || prod?.name || 'Producto',
        previousShelfStock,
        shelfCountOnArrival,
        deliveredQty,
        collectedQty,
        soldInPeriod,
        endingShelfStock,
        stockoutDetected: shelfCountOnArrival === 0 && previousShelfStock > 0,
        timestamp,
      });
    });

    if (batchMovements.length > 0) {
      applyMovementsBatch(batchMovements);
    }
    if (newSnapshots.length > 0) {
      setVisitSnapshots((prev) => [...newSnapshots, ...prev]);
    }

    // Update store lastDeliveryDate & activeBrands
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === ticketInput.storeId) {
          return {
            ...s,
            lastDeliveryDate: timestamp.split('T')[0],
            activeBrands: Array.from(new Set([...s.activeBrands, ...ticketInput.brandIds])),
          };
        }
        return s;
      })
    );

    if (routeAllDone && ticketInput.dispatchId) {
      setDispatches((prev) =>
        prev.map((d) =>
          d.id === ticketInput.dispatchId && d.status === 'open_in_transit'
            ? { ...d, status: 'pending_return' }
            : d
        )
      );
    }

    return newTicket;
  };

  const recordDeliveryTicket = (
    ticketInput: Omit<DeliveryTicket, 'id' | 'folio' | 'timestamp'>
  ): DeliveryTicket => {
    if (isOfflineMode) {
      const queued: OfflineQueuedOperation = {
        id: `offline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind: 'delivery_ticket',
        createdAt: new Date().toISOString(),
        storeName: ticketInput.storeName,
        totalPieces: ticketInput.totalPieces,
        payload: ticketInput,
      };
      setOfflineQueue((prev) => [queued, ...prev]);
      showToast(
        `Sin señal: Entrega a ${ticketInput.storeName} guardada localmente para sincronizar.`,
        'info'
      );
      return {
        ...ticketInput,
        id: queued.id,
        folio: `OFFLINE-${queued.id.slice(-4)}`,
        timestamp: queued.createdAt,
        offlineQueued: true,
      };
    }

    return processTicketInternal(ticketInput, false);
  };

  const syncOfflineQueue = (): number => {
    if (isOfflineMode || offlineQueue.length === 0) return 0;
    let syncedCount = 0;
    const reversed = [...offlineQueue].reverse();
    reversed.forEach((op) => {
      if (op.kind === 'delivery_ticket') {
        processTicketInternal(op.payload, true);
        syncedCount++;
      }
    });
    setOfflineQueue([]);
    showToast(`¡${syncedCount} operación(es) offline sincronizada(s) al libro de movimientos!`);
    return syncedCount;
  };

  // ==========================================
  // CIERRE / LIQUIDACIÓN DE CAMIONETA
  // ==========================================
  const recordReturnReconciliation = (
    data: Omit<VanReturnReconciliation, 'id' | 'folio' | 'reconciledAt'>
  ): VanReturnReconciliation => {
    const id = `rec-${Date.now()}`;
    const folioNumber = Math.floor(100 + Math.random() * 900);
    const folio = `REC-AGS-2026-${folioNumber}`;
    const nowIso = new Date().toISOString();

    const newRec: VanReturnReconciliation = {
      ...data,
      id,
      folio,
      reconciledAt: nowIso,
    };

    // 1. Record immutable 'devolucion' movements (Camioneta -> Bodega) for physical pieces returned
    const returnMovements: InventoryMovement[] = data.returnedItems
      .filter((item) => item.returnedPhysicalQty > 0)
      .map((item, idx) => {
        const prod = products.find((p) => p.id === item.productId);
        return {
          id: `mov-dev-${Date.now()}-${idx}`,
          folio: `MOV-DEV-${folioNumber}-${idx + 1}`,
          type: 'devolucion',
          fromLocation: {
            type: 'van',
            id: `van-${data.driverId}`,
            label: `Camioneta (${data.driverName})`,
          },
          toLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
          productId: item.productId,
          productName: item.productName,
          brandId: prod?.brandId || '',
          brandName: item.brandName,
          flavor: prod?.flavor,
          quantity: item.returnedPhysicalQty,
          performedByUserId: currentUser?.id || 'user-admin-2',
          performedByName: data.warehouseManager,
          confirmedByUserId: data.driverId,
          confirmedByName: data.driverName,
          timestamp: nowIso,
          reason: `Devolución al cierre de jornada (${folio})`,
          relatedDispatchId: data.dispatchId,
          relatedRouteId: data.routeId,
        };
      });

    if (returnMovements.length > 0) {
      applyMovementsBatch(returnMovements);
    }

    const hasShortage = data.totalDiscrepancyPieces > 0;

    // 2. Close dispatch strictly (closed_reconciled vs closed_with_shortage)
    setDispatches((prev) =>
      prev.map((d) =>
        d.id === data.dispatchId
          ? {
              ...d,
              status: hasShortage ? 'closed_with_shortage' : 'closed_reconciled',
            }
          : d
      )
    );

    // 3. If mismatch, generate formal Faltante attributed to Driver for Admin review
    if (hasShortage) {
      const shortageAudits: DiscrepancyAuditRecord[] = data.returnedItems
        .filter((i) => i.discrepancyQty > 0)
        .map((i, idx) => {
          const prod = products.find((p) => p.id === i.productId);
          return {
            id: `disc-liq-${Date.now()}-${idx}`,
            ticketFolio: folio,
            storeName: 'Liquidación de Camioneta → Bodega',
            driverId: data.driverId,
            driverName: data.driverName,
            brandName: i.brandName,
            productName: i.productName,
            expectedQty: i.expectedReturnQty,
            deliveredQty: i.returnedPhysicalQty,
            discrepancyQty: i.discrepancyQty,
            discrepancyType: 'faltante_liquidacion',
            resolutionStatus: 'en_revision',
            impactMXN: i.discrepancyQty * (prod?.suggestedRetailPrice || 75),
            notes: `Faltante en liquidación ${folio}. Fórmula: Cargado (${i.loadedQty}) - Entregado (${i.deliveredQty}) - Merma (${i.mermaQty}) + Recogido (${i.collectedQty}) = Esperado ${i.expectedReturnQty} vs Físico ${i.returnedPhysicalQty}.`,
            date: nowIso.split('T')[0],
            auditedBy: data.warehouseManager,
          };
        });
      setDiscrepancies((prev) => [...shortageAudits, ...prev]);
    }

    setReconciliations((prev) => [newRec, ...prev]);

    addAuditLog(
      'van_reconciled',
      'dispatch',
      data.dispatchId,
      folio,
      hasShortage
        ? `Cierre con FALTANTE de ${data.totalDiscrepancyPieces} pzas ($${data.shortageValueMXN.toLocaleString()}) a cargo de ${data.driverName}.`
        : `Cierre cuadrado exacto (${data.totalReturnedPieces} pzas reintegradas a Bodega).`
    );

    showToast(
      hasShortage
        ? `Liquidación ${folio} cerrada con FALTANTE de ${data.totalDiscrepancyPieces} pzas asignado a ${data.driverName}.`
        : `¡Liquidación ${folio} cuadrada y camioneta cerrada correctamente!`,
      hasShortage ? 'info' : 'success'
    );

    return newRec;
  };

  // ==========================================
  // NIVEL IDEAL POR PUNTO DE VENTA
  // ==========================================
  const setStoreIdealStock = (
    storeId: string,
    productId: string,
    idealQty: number,
    minQty?: number
  ) => {
    const prod = products.find((p) => p.id === productId);
    const safeIdeal = Math.max(0, Math.round(idealQty));
    const safeMin = minQty !== undefined ? Math.max(0, Math.round(minQty)) : Math.floor(safeIdeal * 0.5);

    setIdealStoreStockState((prev) => {
      const idx = prev.findIndex((i) => i.storeId === storeId && i.productId === productId);
      const entry: StoreIdealStock = {
        id: idx >= 0 ? prev[idx].id : `ideal-${storeId}-${productId}`,
        storeId,
        productId,
        brandId: prod?.brandId || '',
        idealQty: safeIdeal,
        minQty: safeMin,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? entry : item));
      }
      return [...prev, entry];
    });
  };

  const getSuggestedVanLoadForRoute = (routeId: string): SuggestedVanLoadItem[] => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return [];

    const brandMap: Record<string, string> = {};
    brands.forEach((b) => {
      brandMap[b.id] = b.name;
    });

    const totalsByProduct: Record<string, number> = {};

    route.scheduledStores.forEach((storeId) => {
      const storeIdeals = idealStoreStock.filter((i) => i.storeId === storeId);
      if (storeIdeals.length > 0) {
        storeIdeals.forEach((ideal) => {
          const current =
            storeStock.find((s) => s.storeId === storeId && s.productId === ideal.productId)
              ?.currentStock ?? 0;
          const need = Math.max(0, ideal.idealQty - current);
          if (need > 0) {
            totalsByProduct[ideal.productId] = (totalsByProduct[ideal.productId] || 0) + need;
          }
        });
      } else {
        // Fallback: check store weekly limits or active brands
        const st = stores.find((s) => s.id === storeId);
        const target = st?.weeklyStockLimits?.[0]?.weeklyMax || 0;
        if (target > 0 && products.length > 0) {
          const storeProducts = products.filter((p) => st?.activeBrands.includes(p.brandId));
          const pool = storeProducts.length > 0 ? storeProducts : products.slice(0, 1);
          const perProd = Math.ceil(target / pool.length);
          pool.forEach((p) => {
            const current =
              storeStock.find((s) => s.storeId === storeId && s.productId === p.id)?.currentStock ?? 0;
            const need = Math.max(0, perProd - current);
            if (need > 0) {
              totalsByProduct[p.id] = (totalsByProduct[p.id] || 0) + need;
            }
          });
        }
      }
    });

    return products.map((p) => {
      const avail = warehouseStockByProduct[p.id] ?? p.centralWarehouseStock;
      const suggested = Math.min(avail, totalsByProduct[p.id] || 0);
      return {
        productId: p.id,
        productName: p.name,
        brandId: p.brandId,
        brandName: brandMap[p.brandId] || 'Marca Local',
        flavor: p.flavor,
        unitPrice: p.suggestedRetailPrice,
        suggestedQty: suggested,
        warehouseAvailable: avail,
      };
    });
  };

  // ==========================================
  // PRODUCTS, STORES & ROUTES CRUD
  // ==========================================
  const recordCrossSellingLead = (
    leadInput: Omit<CrossSellingLead, 'id' | 'createdAt'>
  ): CrossSellingLead => {
    const newLead: CrossSellingLead = {
      ...leadInput,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCrossSellingLeads((prev) => [newLead, ...prev]);
    return newLead;
  };

  const addNewProduct = (productInput: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...productInput,
      barcode:
        productInput.barcode?.trim() ||
        `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13),
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setProducts((prev) => [newProduct, ...prev]);

    if (newProduct.centralWarehouseStock > 0) {
      const brand = brands.find((b) => b.id === newProduct.brandId);
      applyMovementsBatch([
        {
          id: `mov-ent-${Date.now()}`,
          folio: `MOV-ENT-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'entrada',
          fromLocation: {
            type: 'external',
            id: 'supplier',
            label: `Marca: ${brand?.name || 'Proveedor'}`,
          },
          toLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
          productId: newProduct.id,
          productName: newProduct.name,
          brandId: newProduct.brandId,
          brandName: brand?.name || 'Marca Local',
          flavor: newProduct.flavor,
          quantity: newProduct.centralWarehouseStock,
          performedByUserId: currentUser?.id || 'system',
          performedByName: currentUser?.name || 'Admin Bodega',
          timestamp: new Date().toISOString(),
          reason: 'Ingreso inicial al registrar producto',
        },
      ]);
    }

    showToast(`¡Producto "${newProduct.name}" añadido al catálogo!`);
    return newProduct;
  };

  const addMultipleProducts = (productsInput: Omit<Product, 'id'>[]): Product[] => {
    if (!productsInput || productsInput.length === 0) return [];
    const now = Date.now();
    const created: Product[] = productsInput.map((input, idx) => ({
      ...input,
      barcode:
        input.barcode?.trim() ||
        `750${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13),
      id: `prod-${now}-${idx}-${Math.floor(Math.random() * 1000)}`,
    }));

    setProducts((prev) => [...created, ...prev]);

    const entryMovs: InventoryMovement[] = created
      .filter((p) => p.centralWarehouseStock > 0)
      .map((p, idx) => {
        const brand = brands.find((b) => b.id === p.brandId);
        return {
          id: `mov-csv-${now}-${idx}`,
          folio: `MOV-ENT-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'entrada',
          fromLocation: {
            type: 'external',
            id: 'supplier',
            label: `Carga Masiva (${brand?.name || 'Marca'})`,
          },
          toLocation: { type: 'warehouse', id: 'warehouse-central', label: 'Bodega Central' },
          productId: p.id,
          productName: p.name,
          brandId: p.brandId,
          brandName: brand?.name || 'Marca Local',
          flavor: p.flavor,
          quantity: p.centralWarehouseStock,
          performedByUserId: currentUser?.id || 'system',
          performedByName: currentUser?.name || 'Admin Bodega',
          timestamp: new Date().toISOString(),
          reason: 'Carga masiva de catálogo',
        };
      });

    if (entryMovs.length > 0) {
      applyMovementsBatch(entryMovs);
    }

    addAuditLog(
      'csv_bulk_import',
      'brand',
      created[0].brandId,
      `${created.length} productos`,
      `Importación masiva de ${created.length} productos.`
    );

    showToast(`¡Se registraron ${created.length} productos en el catálogo con éxito!`);
    return created;
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    // Stock is immutable via direct edit — strip centralWarehouseStock if passed
    const { centralWarehouseStock: _ignoredStock, ...safeUpdates } = updates;
    void _ignoredStock;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...safeUpdates } : p))
    );
    showToast('¡Datos de catálogo del producto actualizados!');
  };

  const deleteProduct = (productId: string) => {
    const prodToDelete = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setStoreStock((prev) => prev.filter((item) => item.productId !== productId));
    showToast(`¡Producto "${prodToDelete?.name || 'Producto'}" eliminado del catálogo!`);
  };

  const addNewStore = (storeInput: Omit<Store, 'id'>): Store => {
    const newStoreId = `store-${Date.now()}`;
    const newStore: Store = {
      ...storeInput,
      id: newStoreId,
    };
    setStores((prev) => [...prev, newStore]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: 'Nuevo Punto de Entrega Aliado',
      message: `Se dio de alta el punto "${newStore.name}" (${newStore.zone}).`,
      timestamp: new Date().toISOString(),
      type: 'system',
      severity: 'info',
      read: false,
      linkTab: 'stores',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`¡Punto de entrega "${newStore.name}" registrado con éxito!`);
    setActiveAdminTab('stores');
    return newStore;
  };

  const bulkImportStores = (storesInput: Omit<Store, 'id'>[]): Store[] => {
    if (!storesInput || storesInput.length === 0) return [];
    const now = Date.now();
    const created: Store[] = storesInput.map((s, idx) => ({
      ...s,
      id: `store-csv-${now}-${idx}`,
    }));
    setStores((prev) => [...prev, ...created]);
    addAuditLog(
      'csv_bulk_import',
      'store',
      'bulk',
      `${created.length} tiendas`,
      `Importación masiva CSV de ${created.length} puntos de venta.`
    );
    showToast(`¡${created.length} puntos de venta importados con éxito!`);
    return created;
  };

  const addNewRoute = (routeInput: Omit<DeliveryRoute, 'id'>): DeliveryRoute => {
    const newRouteId = `route-${Date.now()}`;
    const newRoute: DeliveryRoute = {
      ...routeInput,
      id: newRouteId,
      status: routeInput.status || 'scheduled',
      completedStoreIds: [],
    };
    setRoutes((prev) => [newRoute, ...prev]);

    const assignedDriver = users.find((u) => u.id === newRoute.driverId);
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: 'Nueva Ruta de Entrega Planificada',
      message: `Ruta ${newRoute.code} (${newRoute.name}) programada con ${newRoute.scheduledStores.length} paradas. Conductor: ${assignedDriver?.name || 'Asignado'}.`,
      timestamp: new Date().toISOString(),
      type: 'route',
      severity: 'info',
      read: false,
      linkTab: 'routes',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`¡Ruta ${newRoute.code} planificada con éxito y lista para despacho!`);
    setActiveAdminTab('routes');
    setSelectedRouteId(newRouteId);
    return newRoute;
  };

  const updateRouteStops = (routeId: string, orderedStoreIds: string[]) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, scheduledStores: orderedStoreIds } : r))
    );
    showToast('Secuencia de paradas optimizada para la ruta.');
  };

  const addStoreToRoute = (routeId: string, storeId: string, insertAtIndex?: number) => {
    const storeObj = stores.find((s) => s.id === storeId);
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId && !r.scheduledStores.includes(storeId)) {
          const nextStops = [...r.scheduledStores];
          if (
            insertAtIndex !== undefined &&
            insertAtIndex >= 0 &&
            insertAtIndex <= nextStops.length
          ) {
            nextStops.splice(insertAtIndex, 0, storeId);
          } else {
            nextStops.push(storeId);
          }
          return {
            ...r,
            scheduledStores: nextStops,
          };
        }
        return r;
      })
    );
    showToast(`¡Parada "${storeObj?.name || 'Tienda'}" insertada en la ruta!`);
  };

  const removeStoreFromRoute = (routeId: string, storeId: string) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          return {
            ...r,
            scheduledStores: r.scheduledStores.filter((id) => id !== storeId),
            completedStoreIds: r.completedStoreIds.filter((id) => id !== storeId),
          };
        }
        return r;
      })
    );
  };

  const startRoute = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          const firstStoreId = r.scheduledStores[0];
          const firstStore = stores.find((s) => s.id === firstStoreId);
          return {
            ...r,
            status: 'in_progress',
            startedAt: r.startedAt || new Date().toISOString(),
            telemetry: r.telemetry || {
              lat: 21.881,
              lng: -102.299,
              speedKmH: 32,
              heading: 65,
              currentStreet: `Av. López Mateos rumbo a ${firstStore?.name || 'primera parada'}`,
              lastUpdated: new Date().toISOString(),
              isSimulating: true,
              adaptiveIntervalSec: 40,
            },
          };
        }
        return r;
      })
    );
  };

  const pauseRoute = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, status: 'paused' } : r))
    );
  };

  const completeRoute = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              status: 'completed',
              endedAt: new Date().toISOString(),
              completedStoreIds: r.scheduledStores,
            }
          : r
      )
    );
    // Mark open dispatch for this route as pending return count at Bodega
    setDispatches((prev) =>
      prev.map((d) =>
        d.routeId === routeId && d.status === 'open_in_transit'
          ? { ...d, status: 'pending_return' }
          : d
      )
    );
  };

  const updateRouteTelemetry = (routeId: string, telemetry: Partial<DriverTelemetry>) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('hecho_en_ags_telemetry');
        channel.postMessage({ type: 'TELEMETRY_UPDATE', routeId, telemetry });
        channel.close();
      } catch {
        // ignore
      }
    }

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          return {
            ...r,
            telemetry: {
              lat: telemetry.lat ?? r.telemetry?.lat ?? 21.881,
              lng: telemetry.lng ?? r.telemetry?.lng ?? -102.299,
              speedKmH: telemetry.speedKmH ?? r.telemetry?.speedKmH ?? 0,
              heading: telemetry.heading ?? r.telemetry?.heading ?? 0,
              currentStreet: telemetry.currentStreet ?? r.telemetry?.currentStreet ?? 'En trayecto',
              lastUpdated: new Date().toISOString(),
              isSimulating: telemetry.isSimulating ?? r.telemetry?.isSimulating ?? false,
              adaptiveIntervalSec:
                telemetry.adaptiveIntervalSec ?? r.telemetry?.adaptiveIntervalSec,
              batterySaverActive: telemetry.batterySaverActive ?? r.telemetry?.batterySaverActive,
            },
          };
        }
        return r;
      })
    );
  };

  const updatePlatformConfig = (updated: Partial<InitialPlatformConfig>) => {
    setPlatformConfig((prev) => ({
      ...prev,
      ...updated,
    }));
    showToast('Configuración inicial del Almacén Central actualizada.');
  };

  const updateDiscrepancyStatus = (
    id: string,
    status: DiscrepancyAuditRecord['resolutionStatus'],
    notes?: string
  ) => {
    setDiscrepancies((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            resolutionStatus: status,
            notes: notes ? `${d.notes} | Nota de auditoría: ${notes}` : d.notes,
          };
        }
        return d;
      })
    );
    showToast('Discrepancia actualizada.');
  };

  const requestRestock = (
    _brandId: string,
    storeId: string,
    productId: string,
    requestedPieces: number
  ) => {
    const store = stores.find((s) => s.id === storeId);
    const prod = products.find((p) => p.id === productId);
    const notif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: 'Solicitud de Reabastecimiento',
      message: `La marca solicitó surtir ${requestedPieces} piezas de "${prod?.name || 'producto'}" para ${store?.name || 'tienda'}.`,
      type: 'stock',
      severity: 'info',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'inventory',
    };
    setNotifications((prev) => [notif, ...prev]);
    showToast(`Solicitud de ${requestedPieces} pzas enviada a logística central.`);
  };

  const updateUserProfile = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...updates };
          if (currentUser?.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    showToast('Perfil actualizado con éxito.');
  };

  const resetAllData = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setBrands(INITIAL_BRANDS);
    setProducts(INITIAL_PRODUCTS);
    setStores(INITIAL_STORES);
    setRoutes(INITIAL_ROUTES);
    setStoreStock(INITIAL_STORE_STOCK);
    setIdealStoreStockState(INITIAL_IDEAL_STOCK);
    setMovements(INITIAL_MOVEMENTS);
    setVisitSnapshots(INITIAL_VISIT_SNAPSHOTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setTickets(INITIAL_TICKETS);
    setCrossSellingLeads(INITIAL_CROSS_SELLING_LEADS);
    setPlatformConfig(INITIAL_PLATFORM_CONFIG);
    setDispatches(INITIAL_DISPATCHES);
    setReconciliations(INITIAL_RECONCILIATIONS);
    setDiscrepancies(INITIAL_DISCREPANCIES);
    setOfflineQueue([]);
    setImpersonatorUser(null);
    setCurrentUser(null);
  };

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const selectActiveRoute = (routeId: string) => setSelectedRouteId(routeId);

  const activeRoute =
    (selectedRouteId && routes.find((r) => r.id === selectedRouteId)) ||
    routes.find((r) => r.status === 'in_progress') ||
    routes[0] ||
    null;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addSettlement = (
    data: Omit<SettlementCut, 'id' | 'folio' | 'createdAt'>
  ): SettlementCut => {
    const newSettlement: SettlementCut = {
      ...data,
      id: `settle-${Date.now()}`,
      folio: `CORTE-AGS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    setSettlements((prev) => [newSettlement, ...prev]);
    return newSettlement;
  };

  const updateSettlementStatus = (
    id: string,
    status: SettlementCut['status'],
    transferRef?: string
  ) => {
    setSettlements((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            status,
            settlementDate: status === 'settled' ? new Date().toISOString() : s.settlementDate,
            transferReference: transferRef || s.transferReference,
          };
        }
        return s;
      })
    );
  };

  const updateStoreStockLimits = (
    storeId: string,
    weeklyMin: number,
    weeklyMax: number,
    brandName: string = BARUCH_BRAND_NAME
  ) => {
    const safeMin = Math.max(0, Math.round(weeklyMin));
    const safeMax = Math.max(safeMin, Math.round(weeklyMax));
    const targetStore = stores.find((s) => s.id === storeId);

    setStores((prev) =>
      prev.map((st) => {
        if (st.id !== storeId) return st;
        const currentLimits = st.weeklyStockLimits || [];
        const existingIdx = currentLimits.findIndex(
          (l) => l.brandName.toLowerCase() === brandName.toLowerCase()
        );
        const updatedEntry = {
          brandName,
          weeklyMin: safeMin,
          weeklyMax: safeMax,
          unitLabel: 'pzas/sem',
        };
        const nextLimits =
          existingIdx >= 0
            ? currentLimits.map((l, idx) => (idx === existingIdx ? { ...l, ...updatedEntry } : l))
            : [...currentLimits, updatedEntry];
        return {
          ...st,
          weeklyStockLimits: nextLimits,
        };
      })
    );

    showToast(
      `Stock semanal actualizado en ${targetStore?.name || 'sucursal'}: Mín ${safeMin} / Máx ${safeMax} pzas`
    );
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        impersonatorUser,
        users,
        brands,
        products,
        stores,
        routes,
        storeStock,
        idealStoreStock,
        movements,
        visitSnapshots,
        auditLogs,
        tickets,
        crossSellingLeads,
        settlements,
        notifications,
        unreadNotificationsCount,
        activeRoute,
        selectedPeriod,
        activeAdminTab,
        isOfflineMode,
        simulatedOffline,
        setSimulatedOffline,
        offlineQueue,
        syncOfflineQueue,
        platformConfig,
        updatePlatformConfig,
        dispatches,
        openDispatchForDriver,
        dispatchVan,
        acceptVanDispatch,
        reconciliations,
        recordReturnReconciliation,
        discrepancies,
        updateDiscrepancyStatus,
        recordInventoryMovement,
        getVanStockByDriver,
        setStoreIdealStock,
        getSuggestedVanLoadForRoute,
        login,
        logout,
        switchUser,
        impersonateUser,
        exitImpersonation,
        resetUserPassword,
        toggleUserStatus,
        setSelectedPeriod,
        setActiveAdminTab,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addSettlement,
        updateSettlementStatus,
        createBrandUser,
        updateUserCredentials,
        deleteUser,
        recordDeliveryTicket,
        recordCrossSellingLead,
        addNewProduct,
        addMultipleProducts,
        updateProduct,
        deleteProduct,
        addNewStore,
        bulkImportStores,
        addNewRoute,
        updateRouteStops,
        addStoreToRoute,
        removeStoreFromRoute,
        selectActiveRoute,
        startRoute,
        pauseRoute,
        completeRoute,
        updateRouteTelemetry,
        updateStoreStockLimits,
        requestRestock,
        updateUserProfile,
        resetAllData,
        isCreateRouteModalOpen,
        setIsCreateRouteModalOpen,
        isSmartRouteGeneratorModalOpen,
        setIsSmartRouteGeneratorModalOpen,
        isCreateStoreModalOpen,
        setIsCreateStoreModalOpen,
        isCreateBrandModalOpen,
        setIsCreateBrandModalOpen,
        toastMessage,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
