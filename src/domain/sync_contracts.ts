import { ISnapshotManifest } from './drive_contracts';

export interface ISyncManager {
  /**
   * Sincroniza la BD actual subiéndola a Drive si tenemos el turno
   * y hay cambios. Empaqueta todo en un ZIP y lo sube.
   */
  exportLocalSnapshot(): Promise<void>;

  /**
   * Intenta importar el snapshot más reciente desde Drive.
   * Pasos estables:
   * 1. Autenticar y Listar Snapshots.
   * 2. Descargar el último y Extraer/Validar Hashes (usando ISnapshotPackager).
   * 3. Validar `turn_sequence` (rechazar si es menor o igual al actual).
   * 4. Reemplazar la base de datos atómicamente.
   */
  importRemoteSnapshot(): Promise<void>;
}
