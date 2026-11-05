import { safeStorage } from 'electron';
import type { TokenCipher } from './mail/mail-sessions';

/** Windows-Verschlüsselung (DPAPI) – nur dein Windows-Konto kann es entschlüsseln. */
export const safeStorageCipher: TokenCipher = {
  available: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: async (text) =>
    (await safeStorage.encryptStringAsync(text)).toString('base64'),
  // `shouldReEncrypt` (neuer Schlüssel bei Windows) ignorieren wir: Der alte
  // Text bleibt lesbar, und beim nächsten Speichern wird ohnehin neu verschlüsselt.
  decrypt: async (encrypted) =>
    (await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64')))
      .result,
};
