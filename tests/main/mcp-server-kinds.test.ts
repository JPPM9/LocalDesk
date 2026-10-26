import { describe, expect, it } from 'vitest';
import { buildCommand, toToolInfo } from '../../src/main/mcp/server-kinds';

describe('buildCommand', () => {
  it('startet den Dateisystem-Server in fester Version mit genau den Ordnern', () => {
    expect(
      buildCommand({
        id: 's1',
        name: 'Dateien',
        kind: 'filesystem',
        folders: ['D:\\Notizen', 'D:\\Projekte\\LocalDesk'],
        enabled: true,
      }),
    ).toEqual({
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem@2.0.1',
        'D:\\Notizen',
        'D:\\Projekte\\LocalDesk',
      ],
    });
  });
});

describe('toToolInfo', () => {
  it('übernimmt „nur lesend“ vom Server', () => {
    expect(
      toToolInfo({
        name: 'read_text_file',
        description: 'Read a file',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
        },
        annotations: { readOnlyHint: true },
      }),
    ).toMatchObject({
      name: 'read_text_file',
      readOnly: true,
      destructive: false,
    });
  });

  it('erkennt verändernde und zerstörende Tools', () => {
    expect(
      toToolInfo({
        name: 'create_directory',
        annotations: { readOnlyHint: false, destructiveHint: false },
      }),
    ).toMatchObject({ readOnly: false, destructive: false });
    expect(
      toToolInfo({
        name: 'write_file',
        annotations: { readOnlyHint: false, destructiveHint: true },
      }),
    ).toMatchObject({ readOnly: false, destructive: true });
  });

  it('behandelt Tools ohne Angaben vorsichtig (verändernd, zerstörend)', () => {
    expect(toToolInfo({ name: 'unbekannt' })).toEqual({
      name: 'unbekannt',
      description: '',
      readOnly: false,
      destructive: true,
      inputSchema: { type: 'object', properties: {} },
    });
  });
});
