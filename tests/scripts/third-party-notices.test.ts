import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  collectPackages,
  renderNotices,
} from '../../scripts/third-party-notices.mjs';

const root = process.cwd();
const own = JSON.parse(readFileSync('package.json', 'utf8')) as {
  license: string;
  dependencies: Record<string, string>;
};

describe('Lizenzen', () => {
  it('LocalDesk steht unter MIT', () => {
    expect(own.license).toBe('MIT');
    expect(readFileSync('LICENSE', 'utf8')).toMatch(/^MIT License/);
  });

  it('erfasst alle direkten Abhängigkeiten', () => {
    const names = new Set(collectPackages(root).map((p) => p.name));
    for (const dep of Object.keys(own.dependencies)) {
      expect(names.has(dep), dep).toBe(true);
    }
  });

  it('THIRD_PARTY_NOTICES.md ist aktuell (sonst: npm run notices)', () => {
    expect(readFileSync('THIRD_PARTY_NOTICES.md', 'utf8')).toBe(
      renderNotices(collectPackages(root)),
    );
  });

  it('enthält keine Lizenz, die eine Weitergabe unter MIT ausschließt', () => {
    // Nur reine Copyleft-Lizenzen wären ein Problem; „MIT OR GPL“ (Wahl) ist in Ordnung.
    const copyleftOnly = collectPackages(root).filter(
      (p) => /GPL|AGPL|SSPL/i.test(p.license) && !/\bOR\b/.test(p.license),
    );
    expect(copyleftOnly).toEqual([]);
  });
});
