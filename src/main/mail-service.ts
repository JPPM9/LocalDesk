import { ipcMain } from 'electron';
import { IpcChannels, type Result } from '../shared/api';
import { checkGoogleApp, type MailAppView } from '../shared/mail';
import type { AppSettingsRepository } from './db/app-settings-repository';

const GOOGLE_ID_KEY = 'mail.google.clientId';
const GOOGLE_SECRET_KEY = 'mail.google.clientSecret';

/**
 * Eigene Mail-Apps des Nutzers. Der Clientschlüssel einer Desktop-App ist laut
 * Google kein echtes Geheimnis; er bleibt trotzdem im Hauptprozess und geht
 * nicht an die Oberfläche zurück.
 */
export function registerMailHandlers(settings: AppSettingsRepository) {
  const googleApp = (): MailAppView | null => {
    const clientId = settings.get(GOOGLE_ID_KEY);
    return clientId && settings.get(GOOGLE_SECRET_KEY)
      ? { provider: 'google', clientId }
      : null;
  };

  ipcMain.handle(IpcChannels.getMailApps, (): MailAppView[] => {
    const google = googleApp();
    return google ? [google] : [];
  });

  ipcMain.handle(
    IpcChannels.setGoogleApp,
    (_event, input: unknown): Result<MailAppView> => {
      const checked = checkGoogleApp(input);
      if (!checked.ok) return checked;
      settings.set(GOOGLE_ID_KEY, checked.value.clientId);
      settings.set(GOOGLE_SECRET_KEY, checked.value.clientSecret);
      return {
        ok: true,
        value: { provider: 'google', clientId: checked.value.clientId },
      };
    },
  );

  ipcMain.handle(IpcChannels.clearGoogleApp, () => {
    settings.delete(GOOGLE_ID_KEY);
    settings.delete(GOOGLE_SECRET_KEY);
  });
}
