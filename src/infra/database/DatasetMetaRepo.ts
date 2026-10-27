import * as Crypto from 'expo-crypto';
import { IDatasetMetaRepository } from './contracts';
import sqliteManagerInstance from './SQLiteManager';

export class DatasetMetaRepo implements IDatasetMetaRepository {
  async get(key: string): Promise<string | null> {
    const db = sqliteManagerInstance.getDB();
    const result = await db.getFirstAsync<{ value_text: string }>(
      'SELECT value_text FROM dataset_meta WHERE key = ?',
      [key]
    );
    return result?.value_text ?? null;
  }

  async set(key: string, value_text: string): Promise<void> {
    const db = sqliteManagerInstance.getDB();
    await db.runAsync(
      "INSERT OR REPLACE INTO dataset_meta (key, value_text, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
      [key, value_text]
    );
  }

  async initializeDefaults(businessName: string, timezone: string): Promise<void> {
    const existingBusinessName = await this.get('business_name');
    if (!existingBusinessName) {
      await this.set('business_name', businessName);
      await this.set('timezone', timezone);
      await this.set('dataset_uuid', Crypto.randomUUID());
      await this.set('epoch_id', Crypto.randomUUID());
    }
  }
}
