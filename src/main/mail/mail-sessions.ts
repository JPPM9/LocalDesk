import type { GoogleAppInput } from '../../shared/mail';
import type { MailAccountRepository } from '../db/mail-account-repository';
import {
  refreshGoogleAccess,
  revokeGoogleToken,
  type AccessToken,
} from './google-auth';
import type { Fetch } from './mail-fetch';

/** Verschlüsselt die Anmelde-Schlüssel (in der App: Electrons safeStorage). */
export interface TokenCipher {
  available(): boolean;
  encrypt(text: string): string;
  decrypt(encrypted: string): string;
}

/**
 * Zugangsschlüssel je Konto. Die dauerhafte Anmeldung liegt verschlüsselt in der
 * Datenbank, der kurzlebige Zugangsschlüssel (≈ 1 Stunde) nur im Speicher.
 */
export class MailSessions {
  private readonly access = new Map<string, AccessToken>();

  constructor(
    private readonly accounts: MailAccountRepository,
    private readonly cipher: TokenCipher,
    private readonly googleApp: () => GoogleAppInput | null,
    private readonly fetch: Fetch,
    private readonly now: () => number = Date.now,
  ) {}

  /** Speichert eine neue Anmeldung verschlüsselt; ohne Verschlüsselung gar nicht. */
  remember(email: string, refreshToken: string, access: AccessToken) {
    if (!this.cipher.available()) {
      throw new Error(
        'Windows kann die Anmeldung gerade nicht verschlüsseln – deshalb wird sie nicht gespeichert.',
      );
    }
    const account = this.accounts.save(
      'google',
      email,
      this.cipher.encrypt(refreshToken),
    );
    this.access.set(account.id, access);
    return account;
  }

  /** Gültiger Zugangsschlüssel für ein Konto – bei Bedarf frisch geholt. */
  async accessToken(accountId: string): Promise<string> {
    const cached = this.access.get(accountId);
    if (cached && cached.expiresAt > this.now()) return cached.token;
    const app = this.googleApp();
    const encrypted = this.accounts.encryptedToken(accountId);
    if (!app || !encrypted) {
      throw new Error('Dieses Konto ist nicht (mehr) eingerichtet.');
    }
    const fresh = await refreshGoogleAccess(
      this.fetch,
      app,
      this.cipher.decrypt(encrypted),
      this.now(),
    );
    this.access.set(accountId, fresh);
    return fresh.token;
  }

  /**
   * Abmelden: bei Google widerrufen, dann lokal löschen. Gelöscht wird auch,
   * wenn Google nicht erreichbar ist – `revoked` sagt, ob der Widerruf klappte.
   */
  async signOut(accountId: string): Promise<{ revoked: boolean }> {
    const encrypted = this.accounts.encryptedToken(accountId);
    let revoked = false;
    if (encrypted) {
      try {
        await revokeGoogleToken(this.fetch, this.cipher.decrypt(encrypted));
        revoked = true;
      } catch {
        revoked = false;
      }
    }
    this.access.delete(accountId);
    this.accounts.delete(accountId);
    return { revoked };
  }
}
