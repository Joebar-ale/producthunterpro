import { ISnapshotPackager, ISnapshotManifest } from '../../domain/drive_contracts';
let zip: any = async () => ''; let unzip: any = async () => ''; try { const z = require('react-native-zip-archive'); zip = z.zip; unzip = z.unzip; } catch(e) { console.warn('Mocking zip-archive for Expo Go'); }
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

export class SnapshotPackager implements ISnapshotPackager {
  async packageSnapshot(dbPath: string, manifestParams: Omit<ISnapshotManifest, 'db_hash_sha256'>): Promise<string> {
    // 1. Calculate SHA-256 of DB
    const dbContentBase64 = await FileSystem.readAsStringAsync(dbPath, { encoding: FileSystem.EncodingType.Base64 });
    const dbHashSha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dbContentBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // 2. Create manifest.json
    const manifest: ISnapshotManifest = {
      ...manifestParams,
      db_hash_sha256: dbHashSha256,
    };

    // 3. Prepare temporary directory for zipping
    const tempDir = `${FileSystem.cacheDirectory}snapshot_pack_tmp_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

    const tempDbPath = `${tempDir}local.db`;
    const tempManifestPath = `${tempDir}manifest.json`;

    await FileSystem.copyAsync({ from: dbPath, to: tempDbPath });
    await FileSystem.writeAsStringAsync(tempManifestPath, JSON.stringify(manifest));

    // 4. Zip the directory
    const targetZipPath = `${FileSystem.cacheDirectory}snapshot_${Date.now()}.zip`;
    await zip(tempDir, targetZipPath);

    // Clean up temporary directory
    await FileSystem.deleteAsync(tempDir, { idempotent: true });

    return targetZipPath;
  }

  async extractAndValidate(zipPath: string): Promise<{ dbPath: string; manifest: ISnapshotManifest }> {
    // 1. Extract ZIP
    const targetDir = `${FileSystem.cacheDirectory}snapshot_extract_tmp_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    
    await unzip(zipPath, targetDir);

    const extractedDbPath = `${targetDir}local.db`;
    const extractedManifestPath = `${targetDir}manifest.json`;

    // 2. Read and parse manifest.json
    const manifestContent = await FileSystem.readAsStringAsync(extractedManifestPath);
    const manifest: ISnapshotManifest = JSON.parse(manifestContent);

    // 3. Recalculate SHA-256 of extracted DB
    const dbContentBase64 = await FileSystem.readAsStringAsync(extractedDbPath, { encoding: FileSystem.EncodingType.Base64 });
    const recalculatedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dbContentBase64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // 4. Validate hash
    if (recalculatedHash !== manifest.db_hash_sha256) {
      throw new Error('CORRUPCIÓN DE DATOS: El hash de la base de datos no coincide con el manifiesto');
    }

    return {
      dbPath: extractedDbPath,
      manifest,
    };
  }
}

