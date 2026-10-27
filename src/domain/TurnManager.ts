import * as FileSystem from 'expo-file-system/legacy';
import { ITurnManager, IDeviceState, TurnStatus } from './turn_contracts';
import { TurnStateRepo } from '../infra/device/TurnStateRepo';
import sqliteManagerInstance from '../infra/database/SQLiteManager';

class TurnManager implements ITurnManager {
  private repo = new TurnStateRepo();

  async assertIsWriter(): Promise<void> {
    const state = await this.repo.readState();
    if (!state || state.turn_state !== 'WRITER') {
      throw new Error('No tienes el turno de ESCRITURA');
    }
  }

  async acquireTurn(newEpochId: string, sequence: number): Promise<void> {
    const state = await this.repo.readState();
    if (!state) {
      throw new Error('Dispositivo no inicializado');
    }
    
    state.turn_state = 'WRITER';
    state.epoch_id = newEpochId;
    state.turn_sequence = sequence;
    state.updated_at = new Date().toISOString();

    await this.repo.writeState(state);
  }

  async releaseTurn(): Promise<void> {
    // Requiere ser WRITER
    await this.assertIsWriter();

    const state = await this.repo.readState();
    if (!state) {
      throw new Error('No se pudo leer el estado del dispositivo');
    }

    // 1. Pasa a SNAPSHOT_READY
    state.turn_state = 'SNAPSHOT_READY';
    state.updated_at = new Date().toISOString();
    await this.repo.writeState(state);

    // 2. Ejecuta PRAGMA wal_checkpoint(TRUNCATE)
    const db = sqliteManagerInstance.getDB();
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

    // 3. Copia la base de datos
    const sourceDbPath = FileSystem.documentDirectory + 'SQLite/product_hunter.db';
    const snapshotPath = FileSystem.documentDirectory + 'product_hunter.db.snapshot';
    
    await FileSystem.copyAsync({
      from: sourceDbPath,
      to: snapshotPath
    });

    // 4. Pasa a READER
    state.turn_state = 'READER';
    state.updated_at = new Date().toISOString();
    await this.repo.writeState(state);
  }
}

export const turnManager = new TurnManager();
export default TurnManager;
