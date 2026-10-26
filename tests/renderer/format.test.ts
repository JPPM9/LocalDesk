import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatContext,
  formatDate,
  formatMemory,
} from '../../src/renderer/utils/format';

describe('formatMemory', () => {
  it('zeigt VRAM wie der Task-Manager (1024er-Schritte)', () => {
    expect(formatMemory(16380 * 1024 * 1024)).toBe('16,0 GB'); // RTX 4060 Ti
    expect(formatMemory(14383820307)).toBe('13,4 GB'); // qwen3:14b mit 32K Kontext
    expect(formatMemory(1322 * 1024 * 1024)).toBe('1,3 GB');
  });

  it('nutzt MB unter 1 GB und einen Strich für unbekannt', () => {
    expect(formatMemory(512 * 1024 * 1024)).toBe('512 MB');
    expect(formatMemory(0)).toBe('0 MB');
    expect(formatMemory(undefined)).toBe('–');
  });
});

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
