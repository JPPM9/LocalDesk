import { ipcMain, safeStorage, shell } from 'electron';
import { IpcChannels, type ChatRequest, type Result } from '../shared/api';
import { mailSummaryContext, mailSummaryMessages } from '../shared/mail-prompt';
import {
  APPLY_CHANGES_MAX,
  isSortableLabel,
  parseSuggestions,
  SORT_MAILS_MAX,
  sortingMessages,
  sortingSchema,
  type MailSuggestion,
} from '../shared/mail-sorting';
import { thinkStyle } from '../shared/settings';
import { describeChatError } from './chat-errors';
import type { Provider } from './providers/provider';
import {
  checkGoogleApp,
  checkMailChange,
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
import { applyMailChangeList } from './mail/apply-changes';
import { GmailClient } from './mail/gmail-client';
import type { MailClient } from './mail/mail-client';
import { guardedFetch } from './mail/mail-fetch';
import { MailSessions, type TokenCipher } from './mail/mail-sessions';
import { tr } from '../shared/messages';

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
  getProvider: () => Provider,
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
          error: tr('mail.appLocked'),
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
      if (!app) return { ok: false, error: tr('mail.appMissing') };
      if (!(await safeStorageCipher.available())) {
        return {
          ok: false,
          error: tr('mail.cannotEncrypt'),
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
              throw new Error(tr('mail.unexpectedAuthUrl'));
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
        return { ok: false, error: tr('error.accountMissing') };
      }
      return { ok: true, value: await sessions.signOut(id) };
    },
  );

  /** Zugriff aufs Postfach eines angemeldeten Kontos. */
  const client = (accountId: unknown): MailClient => {
    const account =
      typeof accountId === 'string' ? accounts.get(accountId) : null;
    if (!account) throw new Error(tr('mail.notSignedIn'));
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
        if (!isMailId(messageId)) throw new Error(tr('mail.unknownMail'));
        return client(accountId).get(messageId);
      }),
  );

  ipcMain.handle(
    IpcChannels.listMailLabels,
    (_event, accountId: unknown): Promise<Result<MailLabel[]>> =>
      attempt(() => client(accountId).labels()),
  );

  // Zusammenfassen: Die Mail holt der Hauptprozess selbst (nicht aus der Oberfläche)
  // und gibt sie nur an das lokale Modell. Eine Zusammenfassung zur Zeit.
  let summary: AbortController | null = null;

  ipcMain.handle(
    IpcChannels.summarizeMail,
    async (
      _event,
      accountId: unknown,
      messageId: unknown,
      model: unknown,
    ): Promise<Result<string>> => {
      if (!isMailId(messageId) || typeof model !== 'string' || !model) {
        return { ok: false, error: tr('error.invalidInput') };
      }
      summary?.abort();
      const controller = new AbortController();
      summary = controller;
      try {
        const mail = await client(accountId).get(messageId);
        const provider = getProvider();
        const models = await provider.listModels();
        const info = models.ok
          ? models.value.find((m) => m.name === model)
          : undefined;
        // Denken kostet nur Zeit – fürs Zusammenfassen aus (bzw. niedrig bei gpt-oss).
        const style = thinkStyle(info);
        const messages = mailSummaryMessages(mail);
        const request: ChatRequest = {
          model,
          messages,
          ...(style === 'toggle' && { think: false }),
          ...(style === 'levels' && { think: 'low' }),
          options: { contextLength: mailSummaryContext(messages) },
        };
        let answer = '';
        for await (const chunk of provider.chat(request, controller.signal)) {
          if (chunk.type === 'content') answer += chunk.text;
        }
        return answer.trim()
          ? { ok: true, value: answer.trim() }
          : {
              ok: false,
              error: tr('mail.noSummary'),
            };
      } catch (error) {
        if (controller.signal.aborted)
          return { ok: false, error: tr('error.cancelled') };
        return { ok: false, error: describeChatError(error) };
      } finally {
        if (summary === controller) summary = null;
      }
    },
  );

  ipcMain.handle(IpcChannels.cancelMailSummary, () => summary?.abort());

  // Sortieren: Das Modell schlägt nur vor – geändert wird erst mit applyMailChanges,
  // also nach deinem Klick auf „Übernehmen“.
  let sorting: AbortController | null = null;

  ipcMain.handle(
    IpcChannels.suggestMailSorting,
    async (
      _event,
      accountId: unknown,
      messageIds: unknown,
      model: unknown,
    ): Promise<Result<MailSuggestion[]>> => {
      if (
        !Array.isArray(messageIds) ||
        !messageIds.every(isMailId) ||
        messageIds.length === 0 ||
        typeof model !== 'string' ||
        !model
      ) {
        return { ok: false, error: tr('error.invalidInput') };
      }
      sorting?.abort();
      const controller = new AbortController();
      sorting = controller;
      try {
        const mailbox = client(accountId);
        const [mails, allLabels] = await Promise.all([
          mailbox.summaries(messageIds.slice(0, SORT_MAILS_MAX)),
          mailbox.labels(),
        ]);
        // Vorschlagen darf das Modell nur deine eigenen Labels.
        const labels = allLabels.filter(isSortableLabel);
        const provider = getProvider();
        const models = await provider.listModels();
        const info = models.ok
          ? models.value.find((m) => m.name === model)
          : undefined;
        const style = thinkStyle(info);
        const messages = sortingMessages(mails, labels, allLabels);
        const request: ChatRequest = {
          model,
          messages,
          format: sortingSchema(labels),
          ...(style === 'toggle' && { think: false }),
          ...(style === 'levels' && { think: 'low' }),
          options: {
            contextLength: mailSummaryContext(messages),
            temperature: 0,
          },
        };
        let answer = '';
        for await (const chunk of provider.chat(request, controller.signal)) {
          if (chunk.type === 'content') answer += chunk.text;
        }
        return {
          ok: true,
          value: parseSuggestions(answer, mails, labels, allLabels),
        };
      } catch (error) {
        if (controller.signal.aborted)
          return { ok: false, error: tr('error.cancelled') };
        return { ok: false, error: describeChatError(error) };
      } finally {
        if (sorting === controller) sorting = null;
      }
    },
  );

  ipcMain.handle(IpcChannels.cancelMailSorting, () => sorting?.abort());

  // Führt bestätigte Änderungen aus – jede wird erneut geprüft (Label, neues Label, Stern).
  ipcMain.handle(
    IpcChannels.applyMailChanges,
    async (
      _event,
      accountId: unknown,
      changes: unknown,
    ): Promise<Result<{ applied: number; failed: string[] }>> => {
      if (!Array.isArray(changes) || changes.length > APPLY_CHANGES_MAX) {
        return { ok: false, error: tr('error.invalidInput') };
      }
      const checked = changes.map(checkMailChange);
      const invalid = checked.find((c) => !c.ok);
      if (invalid && !invalid.ok) return invalid;
      return attempt(() =>
        applyMailChangeList(
          client(accountId),
          checked.flatMap((c) => (c.ok ? [c.value] : [])),
        ),
      );
    },
  );

  // Labels anlegen und umbenennen (Mail-Seite „Labels verwalten“): dein Klick ist die
  // Bestätigung. Den Namen prüft der Mail-Client noch einmal gegen die echten Labels.
  ipcMain.handle(
    IpcChannels.createMailLabel,
    (_event, accountId: unknown, name: unknown): Promise<Result<MailLabel>> =>
      attempt(() => {
        if (typeof name !== 'string') throw new Error(tr('error.invalidInput'));
        return client(accountId).createLabel(name);
      }),
  );

  ipcMain.handle(
    IpcChannels.renameMailLabel,
    (
      _event,
      accountId: unknown,
      labelId: unknown,
      name: unknown,
    ): Promise<Result<MailLabel>> =>
      attempt(() => {
        if (!isMailId(labelId) || typeof name !== 'string') {
          throw new Error(tr('error.invalidInput'));
        }
        return client(accountId).renameLabel(labelId, name);
      }),
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
