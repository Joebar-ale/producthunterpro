import { IDeviceState } from './turn_contracts';
import { ICartState } from './cart_contracts';
import { IProduct } from './entities';

export interface IAppState {
  isReady: boolean;
  isSyncing: boolean;
  turnState: IDeviceState | null;
  businessName: string | null;
  globalError: string | null;
  cart: ICartState;
  products: IProduct[];
  searchQuery: string;
}

export interface IAppActions {
  /** 
   * Inicializa SQLite, ejecuta migraciones, lee metadatos base y 
   * carga el estado de turnos inicial en memoria.
   */
  initializeApp(): Promise<void>;

  /** 
   * Carga los productos desde la base de datos local SQLite.
   */
  loadProducts(): Promise<void>;

  /**
   * Actualiza el filtro de búsqueda de productos.
   */
  setSearchQuery(query: string): void;

  /** 
   * Flujo completo: Sincroniza desde Drive y luego asume la posesión
   * del turno (WRITER). Pasa el control a WRITER.
   */
  requestTurn(): Promise<void>;

  /** 
   * Cierra el turno, genera el snapshot y lo sube a Drive.
   * Vuelve el dispositivo a estado READER.
   */
  releaseTurn(): Promise<void>;

  /** 
   * Importa la última base de datos desde Drive sin pedir el turno (sólo lectura).
   */
  syncFromDrive(): Promise<void>;

  /** Limpia el error global */
  clearError(): void;

  /** Acciones del Carrito */
  addToCart(product: IProduct, quantity: number): void;
  setQuantity(productId: string, quantity: number): void;
  clearCart(): void;
  checkout(customerId?: string, operatorId?: string): Promise<void>;
}

export type IAppStore = IAppState & IAppActions;
