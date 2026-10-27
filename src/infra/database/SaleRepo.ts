import { ISaleRepository } from './contracts';
import { ISale, ISaleItem } from '../../domain/entities';
import sqliteManagerInstance from './SQLiteManager';

export class SaleRepo implements ISaleRepository {
  async createSaleWithItems(sale: ISale, items: ISaleItem[]): Promise<void> {
    await sqliteManagerInstance.withTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO sales (id, customer_id, operator_id, total_amount_text, status, confirmed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale.id, sale.customer_id, sale.operator_id, sale.total_amount_text, sale.status, sale.confirmed_at, sale.created_at]
      );

      for (const item of items) {
        await db.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price_text, line_total_text)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.id, item.sale_id, item.product_id, item.quantity, item.unit_price_text, item.line_total_text]
        );
      }
    });
  }

  async confirmSale(saleId: string, confirmedAt: string): Promise<void> {
    const db = sqliteManagerInstance.getDB();
    await db.runAsync(
      `UPDATE sales SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?`,
      [confirmedAt, saleId]
    );
  }
}
