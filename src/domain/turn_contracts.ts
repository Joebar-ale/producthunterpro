export type TurnStatus = 'READER' | 'WRITER' | 'SNAPSHOT_READY' | 'RESTORING';

export interface IDeviceState {
  device_id: string;
  turn_state: TurnStatus;
  epoch_id: string; // UUID del turno (evita choques de secuencia)
  turn_sequence: number; // Secuencia monótona +1
  updated_at: string;
}

export interface ITurnStateRepository {
  /** Lee el estado local. Retorna null si no está inicializado. */
  readState(): Promise<IDeviceState | null>;
  
  /** Guarda el estado atómicamente (write temp -> move/rename) */
  writeState(state: IDeviceState): Promise<void>;
  
  /** Inicializa el dispositivo por primera vez (como READER) */
  initializeDevice(deviceId: string): Promise<IDeviceState>;
}

export interface ITurnManager {
  /** Verifica si somos WRITER antes de permitir abrir la DB localmente */
  assertIsWriter(): Promise<void>;
  
  /** Transiciona el estado a WRITER bajo un nuevo epoch */
  acquireTurn(newEpochId: string, sequence: number): Promise<void>;
  
  /** 
   * Cierra el turno actual:
   * 1. Pasa a SNAPSHOT_READY
   * 2. Ejecuta PRAGMA wal_checkpoint(TRUNCATE) (a nivel de infraestructura)
   * 3. Crea la copia física (.db)
   */
  releaseTurn(): Promise<void>;
}
