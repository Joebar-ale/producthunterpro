import * as FileSystem from 'expo-file-system/legacy';
import { ISyncManager } from './sync_contracts';
import { ISnapshotManifest } from './drive_contracts';
import { turnManager } from './TurnManager';
import { TurnStateRepo } from '../infra/device/TurnStateRepo';
import { SnapshotPackager } from '../infra/sync/SnapshotPackager';
import { DriveAdapter } from '../infra/sync/DriveAdapter';

export class SyncManager implements ISyncManager {
  private turnStateRepo = new TurnStateRepo();
  private snapshotPackager = new SnapshotPackager();
  private driveAdapter = new DriveAdapter();

  async exportLocalSnapshot(): Promise<void> {
    // 1. Release turn (creates the snapshot copy, truncates WAL, and transitions to READER)
    await turnManager.releaseTurn();

    // 2. Read state to get epoch_id and turn_sequence
    const state = await this.turnStateRepo.readState();
    if (!state) {
      throw new Error('Estado del dispositivo no inicializado.');
    }

    // 3. Construct base manifest
    const manifestParams: Omit<ISnapshotManifest, 'db_hash_sha256'> = {
      epoch_id: state.epoch_id,
      turn_sequence: state.turn_sequence,
      device_id_origin: state.device_id,
      timestamp: new Date().toISOString()
    };

    // 4. Package snapshot
    const dbSnapshotPath = FileSystem.documentDirectory + 'product_hunter.db.snapshot';
    const zipPath = await this.snapshotPackager.packageSnapshot(dbSnapshotPath, manifestParams);

    // 5. Authenticate with Drive and upload
    const isAuthenticated = await this.driveAdapter.authenticate();
    if (!isAuthenticated) {
      throw new Error('No se pudo autenticar con Google Drive.');
    }

    const fileName = `snapshot_${state.epoch_id}_${state.turn_sequence}.zip`;
    await this.driveAdapter.uploadSnapshot(zipPath, fileName);
  }

  async importRemoteSnapshot(): Promise<void> {
    // 1. Authenticate and List Snapshots
    const isAuthenticated = await this.driveAdapter.authenticate();
    if (!isAuthenticated) {
      throw new Error('No se pudo autenticar con Google Drive.');
    }

    const snapshots = await this.driveAdapter.listSnapshots();
    if (snapshots.length === 0) {
      throw new Error('No hay snapshots disponibles para importar.');
    }

    const latestSnapshot = snapshots[0]; // as listSnapshots orders by createdTime desc

    // 2. Download latest and Extract/Validate
    const tempZipPath = `${FileSystem.cacheDirectory}downloaded_snapshot_${Date.now()}.zip`;
    await this.driveAdapter.downloadSnapshot(latestSnapshot.id, tempZipPath);

    const { dbPath, manifest } = await this.snapshotPackager.extractAndValidate(tempZipPath);

    // 3. Validate turn_sequence
    let state = await this.turnStateRepo.readState();
    if (!state) {
      throw new Error('Estado del dispositivo no inicializado.');
    }

    if (manifest.turn_sequence <= state.turn_sequence) {
      throw new Error('Snapshot obsoleto');
    }

    // 4. Atomically replace database
    const targetDbPath = FileSystem.documentDirectory + 'SQLite/product_hunter.db';
    
    const sqliteDir = FileSystem.documentDirectory + 'SQLite';
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    const dbFileInfo = await FileSystem.getInfoAsync(targetDbPath);
    if (dbFileInfo.exists) {
      await FileSystem.deleteAsync(targetDbPath, { idempotent: true });
    }
    
    await FileSystem.moveAsync({
      from: dbPath,
      to: targetDbPath
    });

    // 5. Update state
    state.epoch_id = manifest.epoch_id;
    state.turn_sequence = manifest.turn_sequence;
    state.turn_state = 'READER';
    state.updated_at = new Date().toISOString();

    await this.turnStateRepo.writeState(state);
  }
}
