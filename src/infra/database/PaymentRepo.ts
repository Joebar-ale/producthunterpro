import { IPaymentRepository } from './contracts';
import { IPayment, IPaymentAllocation } from '../../domain/entities';
import sqliteManagerInstance from './SQLiteManager';

export class PaymentRepo implements IPaymentRepository {
  async createPaymentWithAllocations(payment: IPayment, allocations: IPaymentAllocation[]): Promise<void> {
    await sqliteManagerInstance.withTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO payments (id, customer_id, operator_id, amount_text, method, confirmed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [payment.id, payment.customer_id, payment.operator_id, payment.amount_text, payment.method, payment.confirmed_at, payment.created_at]
      );

      for (const allocation of allocations) {
        await db.runAsync(
          `INSERT INTO payment_allocations (id, payment_id, sale_id, allocated_amount_text, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [allocation.id, allocation.payment_id, allocation.sale_id, allocation.allocated_amount_text, allocation.created_at]
        );
      }
    });
  }

  async confirmPayment(paymentId: string, confirmedAt: string): Promise<void> {
    const db = sqliteManagerInstance.getDB();
    await db.runAsync(
      `UPDATE payments SET confirmed_at = ? WHERE id = ?`,
      [confirmedAt, paymentId]
    );
  }
}
