import type { DatabaseSync } from 'node:sqlite';
import type { MailAccountView, MailProvider } from '../../shared/mail';

interface AccountRow {
  id: string;
  provider: MailProvider;
  email: string;
}

/**
 * Angemeldete Mail-Konten. Der Refresh-Token kommt hier schon verschlüsselt an
 * und wird nur verschlüsselt wieder herausgegeben.
 */
export class MailAccountRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  list(): MailAccountView[] {
    return this.db
      .prepare(
        'SELECT id, provider, email FROM mail_accounts ORDER BY created_at, email',
      )
      .all() as unknown as AccountRow[];
  }

  get(id: string): MailAccountView | null {
    return (
      (this.db
        .prepare('SELECT id, provider, email FROM mail_accounts WHERE id = ?')
        .get(id) as AccountRow | undefined) ?? null
    );
  }

  /** Verschlüsselter Refresh-Token des Kontos (null = Konto gibt es nicht). */
  encryptedToken(id: string): string | null {
    const row = this.db
      .prepare('SELECT refresh_token FROM mail_accounts WHERE id = ?')
      .get(id) as { refresh_token: string } | undefined;
    return row?.refresh_token ?? null;
  }

  /** Neues Konto – oder neue Anmeldung für ein vorhandenes (Kennung bleibt). */
  save(
    provider: MailProvider,
    email: string,
    encryptedToken: string,
  ): MailAccountView {
    this.db
      .prepare(
        `INSERT INTO mail_accounts (id, provider, email, refresh_token, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(provider, email) DO UPDATE SET refresh_token = excluded.refresh_token`,
      )
      .run(this.newId(), provider, email, encryptedToken, this.now());
    return this.db
      .prepare(
        'SELECT id, provider, email FROM mail_accounts WHERE provider = ? AND email = ?',
      )
      .get(provider, email) as unknown as MailAccountView;
  }

  delete(id: string) {
    this.db.prepare('DELETE FROM mail_accounts WHERE id = ?').run(id);
  }
}
