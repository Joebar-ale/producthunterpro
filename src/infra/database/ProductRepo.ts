import { IProductRepository } from './contracts';
import { IProduct } from '../../domain/entities';
import sqliteManagerInstance from './SQLiteManager';

export class ProductRepo implements IProductRepository {
  async create(product: IProduct): Promise<void> {
    const db = sqliteManagerInstance.getDB();
    await db.runAsync(
      `INSERT INTO products (id, name, price_text, stock_quantity) VALUES (?, ?, ?, ?)`,
      [product.id, product.name, product.price_text, product.stock_quantity]
    );
  }

  async list(): Promise<IProduct[]> {
    const db = sqliteManagerInstance.getDB();
    return await db.getAllAsync<IProduct>(`SELECT id, name, price_text, stock_quantity FROM products ORDER BY name ASC`);
  }

  async searchByName(query: string): Promise<IProduct[]> {
    const db = sqliteManagerInstance.getDB();
    const pattern = `%${query.trim()}%`;
    return await db.getAllAsync<IProduct>(
      `SELECT id, name, price_text, stock_quantity FROM products WHERE name LIKE ? ORDER BY name ASC`,
      [pattern]
    );
  }
}
