let GoogleSignin: any = { configure: () => {}, hasPlayServices: async () => false, signIn: async () => {}, getTokens: async () => ({ accessToken: '' }) }; try { GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin; } catch(e) { console.warn('Mocking GoogleSignin for Expo Go'); }
import * as FileSystem from 'expo-file-system/legacy';
import { IDriveAdapter } from '../../domain/drive_contracts';

export class DriveAdapter implements IDriveAdapter {
  private accessToken: string | null = null;

  async authenticate(): Promise<boolean> {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      this.accessToken = tokens.accessToken;
      return true;
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      return false;
    }
  }

  async uploadSnapshot(localFilePath: string, fileName: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    // 1. Create file metadata
    const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: 'application/zip',
      }),
    });

    if (!metadataResponse.ok) {
      const err = await metadataResponse.text();
      throw new Error(`Failed to create file metadata: ${err}`);
    }

    const metadata = await metadataResponse.json();
    const fileId = metadata.id;

    // 2. Upload file content
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, localFilePath, {
      httpMethod: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/zip',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (uploadResult.status !== 200) {
      throw new Error(`Failed to upload file content: ${uploadResult.body}`);
    }

    return fileId;
  }

  async listSnapshots(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    const url = "https://www.googleapis.com/drive/v3/files?q=trashed=false and name contains 'snapshot'&fields=files(id,name,createdTime)&orderBy=createdTime desc";
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to list snapshots: ${err}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  async downloadSnapshot(driveFileId: string, destinationPath: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
    
    const downloadResult = await FileSystem.downloadAsync(url, destinationPath, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download snapshot (status ${downloadResult.status})`);
    }
  }
}

