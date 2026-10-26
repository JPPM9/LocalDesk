import { describe, expect, it } from 'vitest';
import { isLocalServer, normalizeServerUrl } from '../../src/shared/server';

const ok = (input: string) => {
  const result = normalizeServerUrl(input);
  return result.ok ? result.value : `FEHLER: ${result.error}`;
};

describe('normalizeServerUrl', () => {
  it('ergänzt http:// und den Ollama-Port', () => {
    expect(ok('192.168.1.20')).toBe('http://192.168.1.20:11434');
    expect(ok('  pc-wohnzimmer ')).toBe('http://pc-wohnzimmer:11434');
    expect(ok('localhost')).toBe('http://localhost:11434');
  });

  it('übernimmt einen angegebenen Port und https', () => {
    expect(ok('192.168.1.20:8080')).toBe('http://192.168.1.20:8080');
    expect(ok('https://ollama.lan:443')).toBe('https://ollama.lan:443');
    expect(ok('http://pc:80')).toBe('http://pc:80');
  });

  it('entfernt einen abschließenden Schrägstrich', () => {
    expect(ok('http://localhost:11434/')).toBe('http://localhost:11434');
  });

  it('lehnt Unsinn, fremde Protokolle, Pfade und Zugangsdaten ab', () => {
    for (const input of [
      '',
      '   ',
      'ftp://pc',
      'file:///C:/Windows',
      'http://pc:11434/api/tags',
      'http://user:pw@pc',
      'http://',
      'pc:99999',
    ]) {
      expect(normalizeServerUrl(input).ok, input).toBe(false);
    }
  });
});

describe('isLocalServer', () => {
  it('erkennt Adressen auf diesem Rechner', () => {
    expect(isLocalServer('http://localhost:11434')).toBe(true);
    expect(isLocalServer('http://127.0.0.1:11434')).toBe(true);
    expect(isLocalServer('http://192.168.1.20:11434')).toBe(false);
    expect(isLocalServer('kaputt')).toBe(false);
  });
});
