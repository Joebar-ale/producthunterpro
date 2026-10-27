import * as FileSystem from 'expo-file-system/legacy';
import { ITurnStateRepository, IDeviceState } from '../../domain/turn_contracts';

const STATE_FILE_NAME = 'device_state.json';
const TEMP_FILE_NAME = 'device_state.json.tmp';

export class TurnStateRepo implements ITurnStateRepository {
  private get stateFilePath() {
    return `${FileSystem.documentDirectory}${STATE_FILE_NAME}`;
  }

  private get tempFilePath() {
    return `${FileSystem.documentDirectory}${TEMP_FILE_NAME}`;
  }

  async readState(): Promise<IDeviceState | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.stateFilePath);
      if (!fileInfo.exists) {
        return null;
      }
      
      const content = await FileSystem.readAsStringAsync(this.stateFilePath);
      return JSON.parse(content) as IDeviceState;
    } catch (error) {
      console.error('Error reading state file:', error);
      return null;
    }
  }

  async writeState(state: IDeviceState): Promise<void> {
    const tempPath = this.tempFilePath;
    const finalPath = this.stateFilePath;

    // 1. Escribe el JSON a device_state.json.tmp
    await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(state));

    // 2. Verifica que el archivo temporal exista y tenga tamaño (getInfoAsync)
    const tempInfo = await FileSystem.getInfoAsync(tempPath);
    if (!tempInfo.exists || tempInfo.size === 0) {
      throw new Error('Failed to write temporary state file, or it is empty.');
    }

    // 3. Elimina el viejo device_state.json si existe (idempotente)
    const finalInfo = await FileSystem.getInfoAsync(finalPath);
    if (finalInfo.exists) {
      await FileSystem.deleteAsync(finalPath, { idempotent: true });
    }

    // 4. Mueve el .tmp al final usando FileSystem.moveAsync
    await FileSystem.moveAsync({
      from: tempPath,
      to: finalPath,
    });
  }

  async initializeDevice(deviceId: string): Promise<IDeviceState> {
    const initialState: IDeviceState = {
      device_id: deviceId,
      turn_state: 'READER',
      epoch_id: 'initial',
      turn_sequence: 0,
      updated_at: new Date().toISOString(),
    };

    await this.writeState(initialState);
    return initialState;
  }
}
