import { IMigrator } from './contracts';
import sqliteManagerInstance from './SQLiteManager';

export class DatabaseMigrator implements IMigrator {
  async runMigrations(): Promise<void> {
    try {
      console.log('[DatabaseMigrator] Iniciando ejecución de migraciones...');
      const db = sqliteManagerInstance.getDB();
      
      const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const userVersion = result?.user_version ?? 0;
      console.log(`[DatabaseMigrator] PRAGMA user_version actual: ${userVersion}`);

      if (userVersion === 0) {
        console.log('[DatabaseMigrator] Aplicando migración versión 1...');
        await sqliteManagerInstance.withTransaction(async (txn) => {
          await txn.execAsync(`
            CREATE TABLE IF NOT EXISTS dataset_meta (
              key TEXT PRIMARY KEY,
              value_text TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS operators (
              id TEXT PRIMARY KEY,
              alias TEXT NOT NULL,
              device_uuid TEXT NOT NULL UNIQUE,
              pin_hash TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              alias TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              price_text TEXT NOT NULL,
              stock_quantity INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sales (
              id TEXT PRIMARY KEY,
              customer_id TEXT NOT NULL,
              operator_id TEXT NOT NULL,
              total_amount_text TEXT NOT NULL,
              status TEXT NOT NULL,
              confirmed_at TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sale_items (
              id TEXT PRIMARY KEY,
              sale_id TEXT NOT NULL,
              product_id TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_price_text TEXT NOT NULL,
              line_total_text TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payments (
              id TEXT PRIMARY KEY,
              customer_id TEXT NOT NULL,
              operator_id TEXT NOT NULL,
              amount_text TEXT NOT NULL,
              method TEXT NOT NULL,
              confirmed_at TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payment_allocations (
              id TEXT PRIMARY KEY,
              payment_id TEXT NOT NULL,
              sale_id TEXT NOT NULL,
              allocated_amount_text TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
          `);
        });

        await db.execAsync('PRAGMA user_version = 1;');
        console.log('[DatabaseMigrator] Migración versión 1 completada con éxito.');
      }

      // Verificación y seed inicial seguro
      try {
        const countResult = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM products');
        if ((countResult?.count ?? 0) === 0) {
          console.log('[DatabaseMigrator] Sembrando productos iniciales...');
          await sqliteManagerInstance.withTransaction(async (txn) => {
            await txn.execAsync(`
              INSERT INTO products (id, name, price_text, stock_quantity) VALUES
              ('prod-01', 'Yerba Mate Premium 1kg', '3400', 45000),
              ('prod-02', 'Café Espresso Granos 500g', '7200', 20000),
              ('prod-03', 'Té Verde Matcha Orgánico', '4800', 15000),
              ('prod-04', 'Alfajor Artesanal Chocolate', '1200', 80000);
            `);
          });
          console.log('[DatabaseMigrator] Seed completado.');
        }
      } catch (seedError) {
        console.error('Error DB en seed de productos:', seedError);
      }

      console.log('[DatabaseMigrator] Migraciones finalizadas.');
    } catch (error) {
      console.error('Error DB en DatabaseMigrator.runMigrations:', error);
      throw error;
    }
  }
}
