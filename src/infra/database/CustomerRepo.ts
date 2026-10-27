import { ICustomerRepository } from './contracts';
import { ICustomer } from '../../domain/entities';
import sqliteManagerInstance from './SQLiteManager';

export class CustomerRepo implements ICustomerRepository {
  async create(customer: ICustomer): Promise<void> {
    const db = sqliteManagerInstance.getDB();
    await db.runAsync(
      `INSERT INTO customers (id, name, alias, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [customer.id, customer.name, customer.alias, customer.created_at, customer.updated_at]
    );
  }

  async list(): Promise<ICustomer[]> {
    const db = sqliteManagerInstance.getDB();
    return await db.getAllAsync<ICustomer>(`SELECT * FROM customers ORDER BY created_at DESC`);
  }
}
