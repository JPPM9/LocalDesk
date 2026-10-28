import { ipcMain, safeStorage, shell } from 'electron';
import { IpcChannels, type Result } from '../shared/api';
import {
  checkGoogleApp,
  isMailId,
  type GoogleAppInput,
  type MailAccountView,
  type MailAppView,
  type MailLabel,
  type MailMessage,
  type MailPage,
} from '../shared/mail';
import type { AppSettingsRepository } from './db/app-settings-repository';
import type { MailAccountRepository } from './db/mail-account-repository';
import { GOOGLE_URLS, signInWithGoogle } from './mail/google-auth';
import { GmailClient } from './mail/gmail-client';
import type { MailClient } from './mail/mail-client';
import { guardedFetch } from './mail/mail-fetch';
import { MailSessions, type TokenCipher } from './mail/mail-sessions';

const GOOGLE_ID_KEY = 'mail.google.clientId';
const GOOGLE_SECRET_KEY = 'mail.google.clientSecret';

/** Windows-Verschlüsselung (DPAPI) – nur dein Windows-Konto kann es entschlüsseln. */
const safeStorageCipher: TokenCipher = {
  available: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: async (text) =>
    (await safeStorage.encryptStringAsync(text)).toString('base64'),
  // `shouldReEncrypt` (neuer Schlüssel bei Windows) ignorieren wir: Der alte
  // Text bleibt lesbar, und beim nächsten Anmelden wird ohnehin neu verschlüsselt.
  decrypt: async (encrypted) =>
    (await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64')))
      .result,
};

/**
 * Eigene Mail-Apps und angemeldete Konten. Der Clientschlüssel einer Desktop-App
 * ist laut Google kein echtes Geheimnis; er bleibt trotzdem im Hauptprozess und
 * geht nicht an die Oberfläche zurück. Alle Mail-Verbindungen laufen über
 * `guardedFetch` (Netzwerk-Regel).
 */
export function registerMailHandlers(
  settings: AppSettingsRepository,
  accounts: MailAccountRepository,
) {
  const fetch = guardedFetch((url, init) => globalThis.fetch(url, init));

  const googleSecrets = (): GoogleAppInput | null => {
    const clientId = settings.get(GOOGLE_ID_KEY);
    const clientSecret = settings.get(GOOGLE_SECRET_KEY);
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  };
  const sessions = new MailSessions(
    accounts,
    safeStorageCipher,
    googleSecrets,
    fetch,
  );
  // Läuft gerade eine Anmeldung im Browser? Dann kann sie abgebrochen werden.
  let signIn: AbortController | null = null;

  // Mit angemeldeten Konten ist die App fest: Die Anmeldungen gehören zu ihr.
  const appLocked = (): Result<null> | null =>
    accounts.list().length > 0
      ? {
          ok: false,
          error:
            'Erst alle Konten abmelden – die Anmeldungen gehören zu dieser Google-App.',
        }
      : null;

  ipcMain.handle(IpcChannels.getMailApps, (): MailAppView[] => {
    const google = googleSecrets();
    return google ? [{ provider: 'google', clientId: google.clientId }] : [];
  });

  ipcMain.handle(
    IpcChannels.setGoogleApp,
    (_event, input: unknown): Result<MailAppView> => {
      const locked = appLocked();
      if (locked && !locked.ok) return locked;
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

  ipcMain.handle(IpcChannels.clearGoogleApp, (): Result<null> => {
    const locked = appLocked();
    if (locked) return locked;
    settings.delete(GOOGLE_ID_KEY);
    settings.delete(GOOGLE_SECRET_KEY);
    return { ok: true, value: null };
  });

  ipcMain.handle(IpcChannels.listMailAccounts, (): MailAccountView[] =>
    accounts.list(),
  );

  ipcMain.handle(
    IpcChannels.connectGoogle,
    async (): Promise<Result<MailAccountView>> => {
      const app = googleSecrets();
      if (!app) return { ok: false, error: 'Erst die Google-App eintragen.' };
      if (!(await safeStorageCipher.available())) {
        return {
          ok: false,
          error:
            'Windows kann die Anmeldung gerade nicht verschlüsseln – deshalb melde ich nicht an.',
        };
      }
      signIn?.abort();
      const controller = new AbortController();
      signIn = controller;
      try {
        const result = await signInWithGoogle(app, {
          fetch,
          signal: controller.signal,
          now: Date.now,
          openBrowser: async (url) => {
            // Nur Googles Anmeldeseite – nichts anderes wird im Browser geöffnet.
            if (!url.startsWith(`${GOOGLE_URLS.auth}?`)) {
              throw new Error('Unerwartete Anmeldeadresse.');
            }
            await shell.openExternal(url);
          },
        });
        return {
          ok: true,
          value: await sessions.remember(
            result.email,
            result.refreshToken,
            result.access,
          ),
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        if (signIn === controller) signIn = null;
      }
    },
  );

  ipcMain.handle(IpcChannels.cancelMailConnect, () => {
    signIn?.abort();
  });

  ipcMain.handle(
    IpcChannels.disconnectMailAccount,
    async (_event, id: unknown): Promise<Result<{ revoked: boolean }>> => {
      if (typeof id !== 'string' || !accounts.get(id)) {
        return { ok: false, error: 'Dieses Konto gibt es nicht.' };
      }
      return { ok: true, value: await sessions.signOut(id) };
    },
  );

  /** Zugriff aufs Postfach eines angemeldeten Kontos. */
  const client = (accountId: unknown): MailClient => {
    const account =
      typeof accountId === 'string' ? accounts.get(accountId) : null;
    if (!account) throw new Error('Dieses Konto ist nicht (mehr) angemeldet.');
    return new GmailClient(fetch, {
      token: () => sessions.accessToken(account.id),
      invalidate: () => sessions.invalidate(account.id),
    });
  };

  ipcMain.handle(
    IpcChannels.listMail,
    (_event, query: unknown): Promise<Result<MailPage>> => {
      const raw = (query ?? {}) as Record<string, unknown>;
      return attempt(() =>
        client(raw.accountId).list({
          query: typeof raw.query === 'string' ? raw.query : undefined,
          labelId: isMailId(raw.labelId) ? raw.labelId : undefined,
          pageToken:
            typeof raw.pageToken === 'string' ? raw.pageToken : undefined,
          max: typeof raw.max === 'number' ? raw.max : 25,
        }),
      );
    },
  );

  ipcMain.handle(
    IpcChannels.getMail,
    (
      _event,
      accountId: unknown,
      messageId: unknown,
    ): Promise<Result<MailMessage>> =>
      attempt(() => {
        if (!isMailId(messageId)) throw new Error('Unbekannte Mail.');
        return client(accountId).get(messageId);
      }),
  );

  ipcMain.handle(
    IpcChannels.listMailLabels,
    (_event, accountId: unknown): Promise<Result<MailLabel[]>> =>
      attempt(() => client(accountId).labels()),
  );

  return { sessions, client };
}

/** Fehler als Ergebnis zurückgeben, damit die Oberfläche sie zeigen kann. */
async function attempt<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
