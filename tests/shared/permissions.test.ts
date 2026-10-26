import { describe, expect, it } from 'vitest';
import {
  defaultPermission,
  effectivePermission,
  isToolPermission,
} from '../../src/shared/permissions';

const read = { name: 'read_text_file', readOnly: true };
const write = { name: 'write_file', readOnly: false };

describe('Tool-Freigaben', () => {
  it('lässt lesende Tools sofort laufen und fragt bei allen anderen', () => {
    expect(defaultPermission(read)).toBe('always');
    expect(defaultPermission(write)).toBe('ask');
  });

  it('nimmt deine Einstellung vor dem Standard', () => {
    expect(effectivePermission(read, { read_text_file: 'off' })).toBe('off');
    expect(effectivePermission(write, { write_file: 'always' })).toBe('always');
    expect(effectivePermission(write, { anderes_tool: 'always' })).toBe('ask');
  });

  it('ignoriert ungültige gespeicherte Werte', () => {
    expect(
      effectivePermission(write, { write_file: 'vielleicht' as never }),
    ).toBe('ask');
    expect(isToolPermission('always')).toBe(true);
    expect(isToolPermission('yes')).toBe(false);
  });
});
