import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatContext,
  formatDate,
} from '../../src/renderer/utils/format';

describe('formatBytes', () => {
  it('zeigt Modellgrößen wie ollama list', () => {
    expect(formatBytes(8021618941)).toBe('8,0 GB');
    expect(formatBytes(18157010252)).toBe('18,2 GB');
  });

  it('nutzt kleinere Einheiten für kleine Werte', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(274_000_000)).toBe('274 MB');
  });

  it('zeigt einen Strich für unbekannte Größe', () => {
    expect(formatBytes(0)).toBe('–');
  });
});

describe('formatContext', () => {
  it('rechnet in 1024er-Schritten', () => {
    expect(formatContext(40960)).toBe('40K');
    expect(formatContext(131072)).toBe('128K');
    expect(formatContext(262144)).toBe('256K');
  });

  it('zeigt einen Strich, wenn die Länge unbekannt ist', () => {
    expect(formatContext(undefined)).toBe('–');
  });
});

describe('formatDate', () => {
  it('zeigt ein deutsches Datum', () => {
    expect(formatDate('2026-10-01T14:09:08.2467225+02:00')).toBe('01.10.2026');
  });

  it('zeigt einen Strich bei leerem oder kaputtem Datum', () => {
    expect(formatDate('')).toBe('–');
    expect(formatDate('kein datum')).toBe('–');
  });
});
