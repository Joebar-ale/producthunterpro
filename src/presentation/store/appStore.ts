import { create } from 'zustand';
import { IAppStore } from '../../domain/store_contracts';
import { IProduct } from '../../domain/entities';
import sqliteManagerInstance from '../../infra/database/SQLiteManager';
import { DatabaseMigrator } from '../../infra/database/DatabaseMigrator';
import { DatasetMetaRepo } from '../../infra/database/DatasetMetaRepo';
import { TurnStateRepo } from '../../infra/device/TurnStateRepo';
import { SyncManager } from '../../domain/SyncManager';
import { turnManager } from '../../domain/TurnManager';
import { MoneyAdapter } from '../../domain/MoneyAdapter';
import { CartService } from '../../domain/CartService';
import { SaleRepo } from '../../infra/database/SaleRepo';
import { ProductRepo } from '../../infra/database/ProductRepo';

const datasetMetaRepo = new DatasetMetaRepo();
const turnStateRepo = new TurnStateRepo();
const migrator = new DatabaseMigrator();
const syncManager = new SyncManager();
const moneyAdapter = new MoneyAdapter();
const cartService = new CartService(moneyAdapter);
const saleRepo = new SaleRepo();
const productRepo = new ProductRepo();

export const useAppStore = create<IAppStore>((set, get) => ({
  isReady: false,
  isSyncing: false,
  turnState: null,
  businessName: null,
  globalError: null,
  cart: cartService.empty(),
  products: [],
  searchQuery: '',

  initializeApp: async () => {
    console.log('[useAppStore] Iniciando initializeApp...');
    try {
      console.log('[useAppStore] Paso 1: initDB');
      await sqliteManagerInstance.initDB();

      console.log('[useAppStore] Paso 2: runMigrations');
      await migrator.runMigrations();

      console.log('[useAppStore] Paso 3: initializeDefaults');
      await datasetMetaRepo.initializeDefaults('AVO Products', 'America/Argentina/Buenos_Aires');

      console.log('[useAppStore] Paso 4: get business_name');
      const businessName = await datasetMetaRepo.get('business_name');

      console.log('[useAppStore] Paso 5: readState/initializeDevice');
      let turnState = await turnStateRepo.readState();
      if (!turnState) {
        turnState = await turnStateRepo.initializeDevice('default_device_id');
      }

      console.log('[useAppStore] Paso 6: productRepo.list');
      const products = await productRepo.list();

      set({ 
        businessName,
        turnState,
        products,
        globalError: null 
      });
      console.log('[useAppStore] Inicialización exitosa.');
    } catch (error: unknown) {
      console.error('Error DB:', error);
      const msg = error instanceof Error ? error.message : 'Error en initializeApp';
      set({ globalError: msg });
    } finally {
      // Garantizar que la UI nunca quede colgada en el splash/loader
      console.log('[useAppStore] Finalizando initializeApp -> isReady: true');
      set({ isReady: true });
    }
  },

  loadProducts: async () => {
    try {
      const { searchQuery } = get();
      const products = searchQuery.trim()
        ? await productRepo.searchByName(searchQuery)
        : await productRepo.list();
      set({ products });
    } catch (error: unknown) {
      console.error('Error DB al cargar productos:', error);
      const msg = error instanceof Error ? error.message : 'Error al cargar productos';
      set({ globalError: msg });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  requestTurn: async () => {
    set({ isSyncing: true, globalError: null });
    try {
      try {
        await syncManager.importRemoteSnapshot();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        console.warn('importRemoteSnapshot warn:', msg);
      }

      const currentState = await turnStateRepo.readState();
      const currentEpoch = currentState?.epoch_id || Math.random().toString(36).substring(7);
      const nextSequence = (currentState?.turn_sequence || 0) + 1;

      await turnManager.acquireTurn(currentEpoch, nextSequence);

      const turnState = await turnStateRepo.readState();
      set({ turnState });
    } catch (error: unknown) {
      console.error('Error DB en requestTurn:', error);
      const msg = error instanceof Error ? error.message : 'Error en requestTurn';
      set({ globalError: msg });
    } finally {
      set({ isSyncing: false });
    }
  },

  releaseTurn: async () => {
    set({ isSyncing: true, globalError: null });
    try {
      await syncManager.exportLocalSnapshot();

      const turnState = await turnStateRepo.readState();
      set({ turnState });
    } catch (error: unknown) {
      console.error('Error DB en releaseTurn:', error);
      const msg = error instanceof Error ? error.message : 'Error en releaseTurn';
      set({ globalError: msg });
    } finally {
      set({ isSyncing: false });
    }
  },

  syncFromDrive: async () => {
    set({ isSyncing: true, globalError: null });
    try {
      await syncManager.importRemoteSnapshot();

      const turnState = await turnStateRepo.readState();
      set({ turnState });
    } catch (error: unknown) {
      console.error('Error DB en syncFromDrive:', error);
      const msg = error instanceof Error ? error.message : 'Error en syncFromDrive';
      set({ globalError: msg });
    } finally {
      set({ isSyncing: false });
    }
  },

  clearError: () => {
    set({ globalError: null });
  },

  addToCart: (product: IProduct, quantity: number) => {
    try {
      set((state) => ({ cart: cartService.add(state.cart, product, quantity) }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al agregar al carrito';
      set({ globalError: msg });
    }
  },

  setQuantity: (productId: string, quantity: number) => {
    try {
      set((state) => ({ cart: cartService.setQuantity(state.cart, productId, quantity) }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al modificar cantidad';
      set({ globalError: msg });
    }
  },

  clearCart: () => {
    set({ cart: cartService.empty() });
  },

  checkout: async (customerId = 'consumidor_final', operatorId = 'operator_1') => {
    const { cart } = get();
    if (cart.lines.length === 0) return;

    set({ globalError: null });
    try {
      const now = new Date().toISOString();
      const saleId = `sale_${Date.now()}`;
      const itemIds = cart.lines.map((_, idx) => `item_${Date.now()}_${idx}`);

      const { sale, items } = cartService.toSale(cart, {
        sale_id: saleId,
        customer_id: customerId,
        operator_id: operatorId,
        item_ids: itemIds,
        now,
      });

      await saleRepo.createSaleWithItems(sale, items);
      set({ cart: cartService.empty() });
    } catch (e: unknown) {
      console.error('Error DB en checkout:', e);
      const msg = e instanceof Error ? e.message : 'Error durante el checkout';
      set({ globalError: msg });
      throw e;
    }
  },
}));
