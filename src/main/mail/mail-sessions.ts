import type { GoogleAppInput } from '../../shared/mail';
import type { MailAccountRepository } from '../db/mail-account-repository';
import {
  refreshGoogleAccess,
  revokeGoogleToken,
  type AccessToken,
} from './google-auth';
import type { Fetch } from './mail-fetch';
import { tr } from '../../shared/messages';

/** Verschlüsselt die Anmelde-Schlüssel (in der App: Electrons safeStorage). */
export interface TokenCipher {
  available(): Promise<boolean>;
  encrypt(text: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
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

  /**
   * Speichert eine neue Anmeldung verschlüsselt; ohne Verschlüsselung gar nicht.
   * Klappt das Speichern nicht, wird die Anmeldung bei Google gleich widerrufen.
   */
  async remember(email: string, refreshToken: string, access: AccessToken) {
    try {
      if (!(await this.cipher.available())) {
        throw new Error(tr('mail.cannotStore'));
      }
      const account = this.accounts.save(
        'google',
        email,
        await this.cipher.encrypt(refreshToken),
      );
      this.access.set(account.id, access);
      return account;
    } catch (error) {
      await revokeGoogleToken(this.fetch, refreshToken).catch(() => {});
      throw error;
    }
  }

  /** Gültiger Zugangsschlüssel für ein Konto – bei Bedarf frisch geholt. */
  async accessToken(accountId: string): Promise<string> {
    const cached = this.access.get(accountId);
    if (cached && cached.expiresAt > this.now()) return cached.token;
    const app = this.googleApp();
    const encrypted = this.accounts.encryptedToken(accountId);
    if (!app || !encrypted) {
      throw new Error(tr('mail.accountGone'));
    }
    const fresh = await refreshGoogleAccess(
      this.fetch,
      app,
      await this.cipher.decrypt(encrypted),
      this.now(),
    );
    this.access.set(accountId, fresh);
    return fresh.token;
  }

  /** Zugangsschlüssel verwerfen – der nächste Aufruf holt einen frischen. */
  invalidate(accountId: string) {
    this.access.delete(accountId);
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
        await revokeGoogleToken(
          this.fetch,
          await this.cipher.decrypt(encrypted),
        );
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
