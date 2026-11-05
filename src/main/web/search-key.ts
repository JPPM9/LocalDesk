import type { Result } from '../../shared/api';
import { tr } from '../../shared/messages';
import { WEB_SEARCH_KEY_MAX, WEB_SEARCH_KEY_MIN } from '../../shared/web';
import type { TokenCipher } from '../mail/mail-sessions';

const KEY_NAME = 'web.search.ollamaKey';

/** Das, was der Speicher von den App-Einstellungen braucht (Tabelle `app_settings`). */
interface SettingsStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
}

/**
 * Prüft einen eingetragenen Ollama-Schlüssel: ein Wort aus sichtbaren Zeichen, 10–300 Zeichen.
 * Das Format selbst kennen wir nicht – aber so kann kein Zeilenumbruch in den Kopf der Anfrage.
 */
export function checkSearchKey(input: unknown): Result<string> {
  const key = typeof input === 'string' ? input.trim() : '';
  if (
    key.length < WEB_SEARCH_KEY_MIN ||
    key.length > WEB_SEARCH_KEY_MAX ||
    !/^[\x21-\x7e]+$/.test(key)
  ) {
    return {
      ok: false,
      error: tr('web.keyInvalid', {
        min: WEB_SEARCH_KEY_MIN,
        max: WEB_SEARCH_KEY_MAX,
      }),
    };
  }
  return { ok: true, value: key };
}

/**
 * Der Ollama-Schlüssel für die Websuche. Er liegt mit Windows verschlüsselt in den
 * App-Einstellungen und verlässt den Hauptprozess nie – die Oberfläche erfährt nur,
 * ob einer gespeichert ist.
 */
export class SearchKeyStore {
  constructor(
    private readonly settings: SettingsStore,
    private readonly cipher: TokenCipher,
  ) {}

  configured(): boolean {
    return this.settings.get(KEY_NAME) !== null;
  }

  async save(input: unknown): Promise<Result<null>> {
    const checked = checkSearchKey(input);
    if (!checked.ok) return checked;
    if (!(await this.cipher.available())) {
      return { ok: false, error: tr('web.cannotEncrypt') };
    }
    this.settings.set(KEY_NAME, await this.cipher.encrypt(checked.value));
    return { ok: true, value: null };
  }

  /** Der Schlüssel im Klartext, nur für die Anfrage an den Suchdienst; null, wenn keiner (lesbar) da ist. */
  async load(): Promise<string | null> {
    const encrypted = this.settings.get(KEY_NAME);
    if (encrypted === null) return null;
    try {
      const key = await this.cipher.decrypt(encrypted);
      return key || null;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.settings.delete(KEY_NAME);
  }
}
