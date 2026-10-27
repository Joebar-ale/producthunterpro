import * as SQLite from 'expo-sqlite';
import { ISQLiteManager } from './contracts';

class SQLiteManager implements ISQLiteManager {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDB(): Promise<void> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('product_hunter.db');
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  getDB(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Base de datos no inicializada');
    }
    return this.db;
  }

  async withTransaction<T>(work: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const db = this.getDB();
    if (typeof (db as any).withExclusiveTransactionAsync === 'function') {
      return await (db as any).withExclusiveTransactionAsync(async () => {
        return await work(db);
      });
    }

    await db.execAsync('BEGIN EXCLUSIVE;');
    try {
      const result = await work(db);
      await db.execAsync('COMMIT;');
      return result;
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}

const sqliteManagerInstance = new SQLiteManager();
export default sqliteManagerInstance;
