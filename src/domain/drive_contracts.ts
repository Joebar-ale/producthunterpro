export interface ISnapshotManifest {
  epoch_id: string;
  turn_sequence: number;
  device_id_origin: string;
  timestamp: string; // ISO 8601
  db_hash_sha256: string;
}

export interface IDriveAdapter {
  /** Inicia sesión o recupera credenciales silenciosamente (Google Sign-In) */
  authenticate(): Promise<boolean>;
  
  /** Sube un archivo ZIP al entorno de Drive (usualmente App Data o carpeta específica). Retorna el File ID. */
  uploadSnapshot(localFilePath: string, fileName: string): Promise<string>;
  
  /** Lista los snapshots disponibles ordenados por fecha descendente */
  listSnapshots(): Promise<Array<{ id: string, name: string, createdTime: string }>>;
  
  /** Descarga un snapshot por su ID de Drive a una ruta local */
  downloadSnapshot(driveFileId: string, destinationPath: string): Promise<void>;
}

export interface ISnapshotPackager {
  /** 
   * Genera el SHA-256 de la base de datos, crea el manifest.json 
   * y empaqueta ambos en un archivo ZIP.
   * Retorna la ruta absoluta del archivo ZIP resultante.
   */
  packageSnapshot(dbPath: string, manifestParams: Omit<ISnapshotManifest, 'db_hash_sha256'>): Promise<string>;
  
  /** 
   * Extrae el ZIP en un directorio temporal, lee el manifest.json, 
   * recalcula el SHA-256 de la DB extraída y lanza un error si no coincide.
   * Retorna las rutas de los archivos extraídos y el manifest validado.
   */
  extractAndValidate(zipPath: string): Promise<{ dbPath: string, manifest: ISnapshotManifest }>;
}
