import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  changelogSection,
  parseLatestYml,
  sha512Base64,
} from '../../scripts/release-lib.mjs';

const changelog = [
  '# Änderungen',
  '',
  '## 0.2.0 – 2026-11-10',
  '',
  '- Neu: Update-Knopf',
  '',
  '## 0.1.10 – 2026-11-01',
  '',
  '- Korrektur',
  '',
  '## 0.1.1 – 2026-10-28',
  '',
  '## 0.1.0 – 2026-10-27',
  '',
  'Erste Version.',
].join('\n');

describe('changelogSection', () => {
  it('liefert genau den Abschnitt der Version', () => {
    expect(changelogSection(changelog, '0.2.0')).toBe('- Neu: Update-Knopf');
    expect(changelogSection(changelog, '0.1.0')).toBe('Erste Version.');
  });

  it('verwechselt 0.1.1 nicht mit 0.1.10', () => {
    expect(changelogSection(changelog, '0.1.10')).toBe('- Korrektur');
    // 0.1.1 ist leer → zählt als fehlend
    expect(changelogSection(changelog, '0.1.1')).toBeNull();
  });

  it('meldet fehlende Versionen', () => {
    expect(changelogSection(changelog, '9.9.9')).toBeNull();
  });

  it('findet den Abschnitt für die aktuelle Version im echten CHANGELOG.md', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
      version: string;
    };
    expect(
      changelogSection(readFileSync('CHANGELOG.md', 'utf8'), version),
    ).toBeTruthy();
  });
});

describe('parseLatestYml', () => {
  it('liest Version, Datei und Prüfsumme (wie von electron-builder geschrieben)', () => {
    const yml = [
      'version: 0.1.0',
      'files:',
      '  - url: LocalDesk-Setup-0.1.0.exe',
      '    sha512: AAA==',
      '    size: 122021720',
      'path: LocalDesk-Setup-0.1.0.exe',
      'sha512: sXae/vVU+mf==',
      "releaseDate: '2026-10-27T21:55:29.732Z'",
    ].join('\r\n');
    expect(parseLatestYml(yml)).toEqual({
      version: '0.1.0',
      path: 'LocalDesk-Setup-0.1.0.exe',
      sha512: 'sXae/vVU+mf==',
    });
  });
});

describe('sha512Base64', () => {
  it('rechnet wie electron-builder (Base64)', () => {
    expect(sha512Base64(new TextEncoder().encode('abc'))).toBe(
      '3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw==',
    );
  });
});
