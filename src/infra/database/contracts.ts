import * as SQLite from 'expo-sqlite';
import { ICustomer, ISale, ISaleItem, IPayment, IPaymentAllocation, IProduct } from '../../domain/entities';

/**
 * Contrato del Gestor Central de SQLite.
 * Se encarga puramente de la conexión y PRAGMAs obligatorios.
 */
export interface ISQLiteManager {
  initDB(): Promise<void>;
  getDB(): SQLite.SQLiteDatabase;
  /** Ejecuta operaciones agrupadas en una transacción exclusiva (BEGIN EXCLUSIVE) */
  withTransaction<T>(work: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T>;
}

/**
 * Entidad de dominio pura para Dataset Meta
 */
export interface IDatasetMeta {
  key: string;
  value_text: string;
  updated_at: string;
}

/**
 * Contrato base para los repositorios
 */
export interface IDatasetMetaRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value_text: string): Promise<void>;
  initializeDefaults(businessName: string, timezone: string): Promise<void>;
}

/**
 * Contrato para el ejecutor de migraciones
 */
export interface IMigrator {
  /** Verifica user_version y ejecuta DDL secuencial si es necesario */
  runMigrations(): Promise<void>;
}

export interface ICustomerRepository {
  create(customer: ICustomer): Promise<void>;
  list(): Promise<ICustomer[]>;
}

export interface IProductRepository {
  create(product: IProduct): Promise<void>;
  list(): Promise<IProduct[]>;
  searchByName(query: string): Promise<IProduct[]>;
}

export interface ISaleRepository {
  /** Crea una venta y sus items en una única transacción */
  createSaleWithItems(sale: ISale, items: ISaleItem[]): Promise<void>;
  /** Confirma una venta bloqueando futuras modificaciones */
  confirmSale(saleId: string, confirmedAt: string): Promise<void>;
}

export interface IPaymentRepository {
  /** Crea un pago y sus asignaciones en una única transacción */
  createPaymentWithAllocations(payment: IPayment, allocations: IPaymentAllocation[]): Promise<void>;
  /** Confirma el pago bloqueando futuras modificaciones */
  confirmPayment(paymentId: string, confirmedAt: string): Promise<void>;
}
