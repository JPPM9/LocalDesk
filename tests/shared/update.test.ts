import { describe, expect, it } from 'vitest';
import { describeUpdateError, releaseNotesText } from '../../src/shared/update';

describe('releaseNotesText', () => {
  it('macht aus dem GitHub-HTML lesbaren Text', () => {
    const html =
      '<p>Erste installierbare Version.</p>\n<ul>\n<li><strong>Chat</strong> mit Modellen &amp; Verlauf</li>\n<li>Installer &lt;neu&gt;</li>\n</ul>';
    expect(releaseNotesText(html)).toBe(
      'Erste installierbare Version.\n\n- Chat mit Modellen & Verlauf\n- Installer <neu>',
    );
  });

  it('kommt mit Listen mehrerer Versionen und leeren Notizen zurecht', () => {
    expect(
      releaseNotesText([
        { version: '0.1.1', note: '<p>Korrektur</p>' },
        { version: '0.1.0', note: null },
      ]),
    ).toBe('Korrektur');
    expect(releaseNotesText(null)).toBe('');
  });
});

describe('describeUpdateError', () => {
  it('übersetzt typische Fehler', () => {
    expect(describeUpdateError('net::ERR_INTERNET_DISCONNECTED')).toContain(
      'Keine Verbindung',
    );
    expect(
      describeUpdateError(
        'HttpError: 404 \n"method: GET url: https://github.com/…"',
      ),
    ).toContain('noch keine Version');
    expect(
      describeUpdateError('sha512 checksum mismatch, expected …'),
    ).toContain('Prüfsumme');
  });

  it('zeigt Unbekanntes einzeilig und gekürzt', () => {
    expect(describeUpdateError('Etwas anderes\nmit Stacktrace')).toBe(
      'Etwas anderes',
    );
  });
});
