import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { describeChatError } from '../../src/main/chat-errors';
import { checkCollectionInput } from '../../src/main/db/knowledge-repository';
import { toToolResult } from '../../src/main/mcp/tool-result';
import { checkFolderName } from '../../src/main/obsidian/vault';
import { setMessageLanguage } from '../../src/shared/messages';
import { normalizeServerUrl } from '../../src/shared/server';
import { checkSkillInput } from '../../src/shared/skills';
import { describeUpdateError } from '../../src/shared/update';

beforeEach(() => setMessageLanguage('en'));
afterEach(() => setMessageLanguage('de'));

const error = (result: { ok: boolean; error?: string }) =>
  result.ok ? 'kein Fehler' : result.error;

describe('Übrige Meldungen auf Englisch', () => {
  it('Server-Adresse', () => {
    expect(error(normalizeServerUrl(' '))).toBe('Please enter an address.');
    expect(error(normalizeServerUrl('ftp://pc'))).toBe(
      'Only http:// or https:// is allowed.',
    );
    expect(error(normalizeServerUrl('http://pc:11434/api'))).toBe(
      'Please give only host and port, without a path (e.g. /api).',
    );
    expect(error(normalizeServerUrl('http://user:pw@pc'))).toBe(
      'A user name/password in the address is not supported.',
    );
  });

  it('Skills: Prüfung der Eingaben', () => {
    expect(
      error(checkSkillInput({ name: '', description: '', body: 'x' })),
    ).toBe('The skill needs a name.');
    expect(
      error(checkSkillInput({ name: 'a', description: 'd', body: ' ' })),
    ).toBe('The instructions are empty.');
    expect(
      error(
        checkSkillInput({ name: 'a'.repeat(500), description: 'd', body: 'x' }),
      ),
    ).toMatch(/^Name: \d+ characters at most\.$/);
    expect(
      error(
        checkSkillInput({
          name: 'a',
          description: 'd',
          body: 'x'.repeat(100_000),
        }),
      ),
    ).toMatch(/^Instructions: \d{1,3}(,\d{3})* characters at most\.$/);
  });

  it('Updates, Chat-Fehler, Ordnername, MCP-Ergebnis', () => {
    expect(describeUpdateError('getaddrinfo ENOTFOUND github.com')).toBe(
      'No connection to GitHub – are you online?',
    );
    expect(describeUpdateError('HTTP 403 rate limit exceeded')).toBe(
      'GitHub is not accepting more requests right now – try again in an hour.',
    );
    expect(describeChatError(new Error('x does not support tools'))).toContain(
      "This model can't use tools",
    );
    expect(describeChatError(new Error('CUDA error: out of memory'))).toMatch(
      /^Ollama couldn't load the model\..*\(CUDA error: out of memory\)$/,
    );
    expect(error(checkFolderName(''))).toBe('Please enter a folder name.');
    expect(error(checkFolderName('a:b'))).toContain(
      'Just a simple folder name',
    );
    expect(toToolResult({ content: [] }).text).toBe('(no result)');
    expect(toToolResult({ content: [{ type: 'image', data: 'x' }] }).text).toBe(
      '[image – cannot be shown as text]',
    );
  });

  it('Sammlungen', () => {
    expect(
      error(checkCollectionInput({ id: 'a', name: ' ', sources: [] })),
    ).toBe('Please give the collection a name.');
    expect(
      error(
        checkCollectionInput({
          id: 'a',
          name: 'x',
          sources: [{ kind: 'folder', path: 'relativ' }],
        }),
      ),
    ).toBe('Not a full path: relativ');
    expect(
      error(
        checkCollectionInput({
          id: 'a',
          name: 'x',
          sources: [{ kind: 'folder', path: 'C:\\' }],
        }),
      ),
    ).toBe('A whole drive (C:\\) is too much – please choose a subfolder.');
  });
});
