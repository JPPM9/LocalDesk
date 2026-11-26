import { ipcMain } from 'electron';
import { IpcChannels } from '../shared/api';
import { WORKING_STYLE_KEY } from '../shared/working-style';
import type { AppSettingsRepository } from './db/app-settings-repository';

/** Einstellung „Arbeitsweise“ (an/aus). Ohne gespeicherte Wahl gilt: an. */
export function registerWorkingStyleHandlers(settings: AppSettingsRepository) {
  const on = () => settings.get(WORKING_STYLE_KEY) !== '0';
  ipcMain.handle(IpcChannels.getWorkingStyle, () => on());
  ipcMain.handle(IpcChannels.setWorkingStyle, (_event, value: unknown) => {
    if (typeof value === 'boolean')
      settings.set(WORKING_STYLE_KEY, value ? '1' : '0');
  });
  return { on };
}
