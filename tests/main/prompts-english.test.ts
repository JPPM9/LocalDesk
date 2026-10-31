import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AccessGrants, type Mailbox } from '../../src/main/access';
import { readTools } from '../../src/main/code/code-tools';
import { commandTool } from '../../src/main/code/command-tool';
import { editTools } from '../../src/main/code/edit-tools';
import { gitTools } from '../../src/main/code/git-tools';
import { mailTools } from '../../src/main/mail/mail-tools';
import { memoryTool } from '../../src/main/obsidian/memory-tool';
import type { MessageRecord, SourceRef } from '../../src/shared/api';
import { codeAgentPrompt } from '../../src/shared/code-agent';
import { withKnowledge } from '../../src/shared/knowledge';
import type { MailMessage, MailSummary } from '../../src/shared/mail';
import { mailSummaryMessages } from '../../src/shared/mail-prompt';
import { sortingMessages } from '../../src/shared/mail-sorting';
import { setMessageLanguage } from '../../src/shared/messages';
import { memoryPrompt } from '../../src/shared/memory';
import { skillsPrompt, skillTools } from '../../src/shared/skills';
import { summaryMessages } from '../../src/shared/summary';
import {
  cancelledResult,
  deniedResult,
  limitResult,
  TOOL_RESULT_MAX,
  type OfferedTool,
} from '../../src/shared/tools';

beforeEach(() => setMessageLanguage('en'));
afterEach(() => setMessageLanguage('de'));

/** Deutsche Wörter, die in englischem Anweisungstext nichts verloren haben. */
const GERMAN =
  /[äöüß]|\b(der|die|das|den|dem|und|oder|nicht|nur|mit|für|Nutzer|Datei|Dateien|Ordner|Projekt|Mails?|wenn|dann|sonst)\b/;

const text = (value: unknown) => JSON.stringify(value);

describe('Werkzeug-Beschreibungen auf Englisch', () => {
  it('kein deutsches Wort in Beschreibungen und Eingabefeldern', async () => {
    const access = new AccessGrants(
      {
        mailAccounts: () => [{ id: 'a', email: 'x@y.z' }],
        servers: () => [{ id: 's', name: 'Files', folders: ['C:\\x'] }],
        openMailbox: async () => ({}) as Mailbox,
        persist: () => {},
      },
      { mailbox: null, serverIds: [] },
    );
    const tools: OfferedTool[] = [
      ...readTools(),
      ...editTools(async () => ''),
      commandTool(),
      ...gitTools(async () => ''),
      ...mailTools([{ id: 'L1', name: 'Bills', type: 'user' }], async () => ''),
      ...mailTools([], async () => ''),
      memoryTool(true),
      access.tool()!,
    ];
    expect(tools.length).toBeGreaterThan(15);
    for (const tool of tools) {
      // Namen der Eingaben und ihre Werte (enum) bleiben, wie sie sind – nur Texte zählen.
      const schema = tool.inputSchema as {
        properties?: Record<string, { description?: string }>;
      };
      const texts = [
        tool.description,
        tool.serverName,
        ...Object.values(schema.properties ?? {}).map(
          (p) => p.description ?? '',
        ),
      ].join(' | ');
      expect(texts, tool.toolName).not.toMatch(GERMAN);
    }
  });

  it('bleibt bei Deutsch (Standard) deutsch', () => {
    setMessageLanguage('de');
    expect(readTools()[0].description).toContain('Zeigt Ordner und Dateien');
    expect(commandTool().description).toContain('PowerShell-Befehl');
  });

  it('der Skill als Werkzeug', () => {
    const [tool] = skillTools([
      { id: 'review', name: 'Code review', description: 'Checks code' },
    ]);
    expect(tool.description).toBe(
      'Loads the skill “Code review” (an instruction from the user). Checks code Call it FIRST when the task fits, and then follow the instruction in your answer.',
    );
    expect(
      skillTools([{ id: 'x', name: 'X', description: '' }])[0].description,
    ).not.toMatch(GERMAN);
  });
});

describe('Anweisungen ans Modell auf Englisch', () => {
  const mail: MailMessage = {
    id: 'm1',
    threadId: 't',
    from: 'Bank <info@bank.example>',
    subject: '',
    date: new Date(2026, 9, 28, 9, 30).getTime(),
    snippet: 'x',
    unread: true,
    starred: false,
    labelIds: [],
    to: 'me@gmail.com',
    cc: '',
    text: 'Please pay by Friday.',
    truncated: false,
    attachments: [{ name: 'bill.pdf', size: 1 }],
  };

  it('Mail zusammenfassen', () => {
    const [system, user] = mailSummaryMessages(mail);
    expect(system.content).toContain('Write in English');
    expect(system.content).not.toMatch(GERMAN);
    expect(user.content).toContain('From: Bank <info@bank.example>');
    expect(user.content).toContain('Subject: (no subject)');
    expect(user.content).toContain('Attachments: bill.pdf');
    expect(user.content).toMatch(/^Summarize this e-mail\./);
  });

  it('Gespräch zusammenfassen', () => {
    const records: MessageRecord[] = [
      { id: '1', role: 'user', content: 'Hi', thinking: '', status: 'done' },
      {
        id: '2',
        role: 'assistant',
        content: 'Hello',
        thinking: '',
        status: 'done',
      },
    ];
    const [system, user] = summaryMessages(records);
    expect(system.content).toContain('Write in English');
    expect(system.content).not.toMatch(GERMAN);
    expect(user.content).toBe(
      'Summarize this conversation:\n\nUser: Hi\n\nAssistant: Hello',
    );
  });

  it('Mails sortieren', () => {
    const mails: MailSummary[] = [{ ...mail, labelIds: ['L1'], starred: true }];
    const labels = [{ id: 'L1', name: 'Bills', type: 'user' as const }];
    const [system, user] = sortingMessages(mails, labels, labels);
    expect(system.content).toContain('in English');
    expect(system.content).not.toMatch(GERMAN);
    expect(user.content).toContain('Available labels:\n- Bills');
    expect(user.content).toContain('Has labels: Bills');
    expect(user.content).toContain('Starred: yes');
    expect(sortingMessages(mails, [], [])[1].content).toContain(
      '(none – suggest new labels through “newLabel”, or only stars)',
    );
    expect(system.content).toContain('“newLabel”');
  });

  it('Code-Agent, auch im Plan-Modus', () => {
    const day = new Date(2026, 9, 31);
    const normal = codeAgentPrompt('App', day);
    expect(normal).toContain('You are a careful programming assistant');
    expect(normal).toContain('Today is Saturday, October 31, 2026.');
    expect(normal).not.toMatch(GERMAN);
    const plan = codeAgentPrompt('App', day, 'plan');
    expect(plan).toContain('PLAN MODE (important)');
    expect(plan).not.toMatch(GERMAN);
  });

  it('Erinnerungen, Skills, Wissen und Ergebnisse', () => {
    expect(memoryPrompt(['I study statistics.'])).toMatch(
      /^What you know about the user/,
    );
    expect(skillsPrompt([{ name: 'Review', body: 'Do it.' }])).toMatch(
      /^Skills that are turned on/,
    );
    const sources: SourceRef[] = [
      {
        n: 1,
        collectionId: 'c',
        collectionName: 'C',
        documentId: 'd',
        path: 'C:\\Docs\\script.pdf',
        page: 12,
        text: 'Passage',
        score: 0.9,
      },
    ];
    const request = withKnowledge(
      { model: 'm', messages: [{ role: 'user', content: 'What is it?' }] },
      sources,
    );
    const content = request.messages[0].content;
    expect(content).toContain('Here are excerpts from the user');
    expect(content).toContain('[1] script.pdf, p. 12');
    expect(content).toMatch(/Question: What is it\?$/);
    expect(content).not.toMatch(GERMAN);
    expect(limitResult('x'.repeat(TOOL_RESULT_MAX + 5))).toMatch(
      /\[… shortened, 5 characters omitted\]$/,
    );
    expect(deniedResult()).toBe('The user denied this call.');
    expect(cancelledResult()).toBe('The call was cancelled.');
  });
});
