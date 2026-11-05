import type {
  ChatRequest,
  ChatStats,
  ChatStreamEvent,
  Result,
  ThinkSetting,
  ToolCallRecord,
} from '../../shared/api';
import { combineStats } from '../../shared/chat';
import { tr } from '../../shared/messages';
import {
  fitNotes,
  hostOf,
  notesBudgetChars,
  notesMessages,
  notesSchema,
  oneLine,
  pageChars,
  parseNotes,
  parsePlan,
  planMessages,
  planSchema,
  reportFooter,
  reportMessages,
  RESEARCH_DEPTHS,
  RESEARCH_NOTES_TIMEOUT_MS,
  RESEARCH_PAGE_MIN_CHARS,
  RESEARCH_PLAN_TIMEOUT_MS,
  RESEARCH_TOOL_SERVER,
  selectPages,
  type ResearchDepth,
  type ResearchSource,
} from '../../shared/research';
import { thinkStyle } from '../../shared/settings';
import { WEB_SEARCH_RESULTS, type WebSearchHit } from '../../shared/web';
import { emptyAnswer } from '../tool-loop';
import type { Provider } from '../providers/provider';
import { checkWebUrl } from '../web/address';
import { extractWebText } from '../web/extract';
import { fetchWebPage } from '../web/fetch';
import { searchWeb } from '../web/search';

/** Was die Recherche vom Netz braucht – in der App die echten Dienste, im Test gefälschte. */
export interface ResearchDeps {
  search(
    query: string,
    apiKey: string,
    signal: AbortSignal,
    count: number,
  ): Promise<Result<WebSearchHit[]>>;
  /** Liest eine Seite: Adresse (nach Weiterleitungen), Titel und Text – oder ein fertiger Fehlertext. */
  readPage(
    url: string,
    signal: AbortSignal,
  ): Promise<Result<{ url: string; title: string; text: string }>>;
}

export const liveResearchDeps: ResearchDeps = {
  search: (query, apiKey, signal, count) =>
    searchWeb(query, apiKey, signal, count),
  async readPage(url, signal) {
    const checked = checkWebUrl(url);
    if (!checked.ok) return checked;
    const fetched = await fetchWebPage(checked.value, signal);
    if (!fetched.ok) return fetched;
    const page = extractWebText(
      fetched.value.text,
      fetched.value.contentType,
      fetched.value.url,
    );
    return {
      ok: true,
      value: { url: fetched.value.url, title: page.title, text: page.text },
    };
  },
};

export interface ResearchRun {
  provider: Provider;
  model: string;
  /** Die Kontextlänge des Chats – für alle Aufrufe gleich, damit das Modell nicht neu geladen wird. */
  contextLength: number;
  /** Denken, Temperatur und Seed des Chats: gelten für den Bericht (Plan und Notizen laufen ohne Denken). */
  think?: ThinkSetting;
  temperature?: number;
  seed?: number;
  /** Der Ollama-Schlüssel für die Suche. */
  apiKey: string;
  depth: ResearchDepth;
  question: string;
  /** Kennung der Antwort – die Fortschrittszeilen heißen davon abgeleitet. */
  requestId: string;
  signal: AbortSignal;
  emit: (event: ChatStreamEvent) => void;
  /** Zeit je Modell-Aufruf für Plan und Notizen (nur für Tests anders als die Vorgabe). */
  timeouts?: { plan?: number; notes?: number };
}

const ROW = { plan: 'plan', search: 'search', read: 'read' } as const;
type RowName = keyof typeof ROW;

/** Wirft den Abbruch weiter, aber nicht jeden anderen Fehler eines Timeouts. */
function isTimeout(signal: AbortSignal, outer: AbortSignal): boolean {
  return signal.aborted && !outer.aborted;
}

/**
 * Die Recherche in festem Ablauf: Plan → Suchen → Seiten lesen → Notizen → Bericht. Meldet den
 * Fortschritt als drei Zeilen (`tool-call`-Ereignisse) und streamt den Bericht wie eine Antwort.
 * Erwartbare Misserfolge (keine Treffer, nichts Brauchbares) werden als `error`-Ereignis gemeldet;
 * Abbruch und Fehler des Servers werfen.
 */
export async function runResearch(
  run: ResearchRun,
  deps: ResearchDeps = liveResearchDeps,
): Promise<void> {
  const { provider, signal, emit, requestId, question } = run;
  const spec = RESEARCH_DEPTHS[run.depth];
  const stats: ChatStats[] = [];

  // --- Fortschrittszeilen
  const rows = new Map<RowName, ToolCallRecord>();
  const row = (
    name: RowName,
    patch: Partial<ToolCallRecord> & { step?: string },
  ) => {
    const { step, ...rest } = patch;
    const previous = rows.get(name);
    const record: ToolCallRecord = {
      id: `${requestId}-${ROW[name]}`,
      round: 1,
      name: `research_${name}`,
      toolName: `research_${name}`,
      serverId: RESEARCH_TOOL_SERVER,
      serverName: tr('research.serverName'),
      arguments: step ? { progress: step } : (previous?.arguments ?? {}),
      status: 'running',
      ...previous,
      ...rest,
      ...(step && { arguments: { progress: step } }),
    };
    rows.set(name, record);
    emit({ requestId, type: 'tool-call', call: record });
  };

  // --- Modell-Aufrufe für Plan und Notizen: kurz, ohne Denken, Antwort nur im festen Format
  const models = await provider.listModels();
  const info = models.ok
    ? models.value.find((m) => m.name === run.model)
    : undefined;
  const style = thinkStyle(info);
  const askJson = async (
    messages: ChatRequest['messages'],
    schema: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<string | null> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    const request: ChatRequest = {
      model: run.model,
      messages,
      format: schema,
      ...(style === 'toggle' && { think: false }),
      ...(style === 'levels' && { think: 'low' }),
      options: { contextLength: run.contextLength, temperature: 0 },
    };
    let answer = '';
    try {
      for await (const chunk of provider.chat(request, combined)) {
        if (chunk.type === 'content') answer += chunk.text;
        else if (chunk.type === 'done' && chunk.stats) stats.push(chunk.stats);
      }
      return answer;
    } catch (error) {
      signal.throwIfAborted();
      // Zeitüberschreitung: der Aufruf gilt als gescheitert; jeder andere Fehler (Server weg …) bricht ab.
      if (isTimeout(combined, signal)) return null;
      throw error;
    }
  };

  // --- 1. Plan
  row('plan', {});
  const planAnswer = await askJson(
    planMessages(question, spec.searches),
    planSchema(),
    run.timeouts?.plan ?? RESEARCH_PLAN_TIMEOUT_MS,
  );
  const queries = parsePlan(planAnswer ?? '', spec.searches, question);
  row('plan', {
    status: 'done',
    result: queries.map((q, i) => `${i + 1}. ${q}`).join('\n'),
  });

  // --- 2. Suchen (nacheinander; beim ersten Fehler – z. B. Limit – wird nicht weitergesucht)
  const hits: WebSearchHit[][] = [];
  const searchLines: string[] = [];
  let searchFailure: string | null = null;
  for (let i = 0; i < queries.length; i++) {
    signal.throwIfAborted();
    row('search', {
      step: `${i + 1}/${queries.length}`,
      result: searchLines.join('\n'),
    });
    const found = await deps.search(
      queries[i],
      run.apiKey,
      signal,
      WEB_SEARCH_RESULTS,
    );
    signal.throwIfAborted();
    if (!found.ok) {
      searchFailure = found.error;
      searchLines.push(
        tr('research.searchFailedLine', {
          n: i + 1,
          query: queries[i],
          error: found.error,
        }),
      );
      break;
    }
    hits.push(found.value);
    searchLines.push(
      tr('research.searchLine', {
        n: i + 1,
        query: queries[i],
        count: found.value.length,
      }),
    );
  }
  const picks = selectPages(hits, spec.pages);
  if (picks.length === 0) {
    row('search', {
      status: 'error',
      step: `${hits.length}/${queries.length}`,
      result: searchLines.join('\n'),
    });
    emit({
      requestId,
      type: 'error',
      error: searchFailure ?? tr('research.noHits'),
    });
    return;
  }
  row('search', {
    status: searchFailure ? 'error' : 'done',
    step: `${hits.length}/${queries.length}`,
    result: searchLines.join('\n'),
  });

  // --- 3. Seiten lesen und je Seite Notizen machen
  const sources: Omit<ResearchSource, 'n'>[] = [];
  const readLines: string[] = [];
  const seen = new Set<string>();
  const limit = pageChars(run.contextLength);
  for (let i = 0; i < picks.length; i++) {
    signal.throwIfAborted();
    const pick = picks[i];
    row('read', {
      step: `${i + 1}/${picks.length}`,
      result: readLines.join('\n'),
    });
    const label = (title: string, url: string) => ({
      title: oneLine(title, 80) || hostOf(url),
      host: hostOf(url),
    });
    const failed = (error: string, title = pick.title, url = pick.url) =>
      readLines.push(
        tr('research.pageFailed', { ...label(title, url), error }),
      );

    const page = await deps.readPage(pick.url, signal);
    signal.throwIfAborted();
    if (!page.ok) {
      failed(page.error);
      continue;
    }
    const finalUrl = page.value.url;
    const title = page.value.title || pick.title;
    if (seen.has(finalUrl)) continue; // zwei Treffer führten zur selben Seite
    seen.add(finalUrl);
    if (page.value.text.length < RESEARCH_PAGE_MIN_CHARS) {
      failed(tr('research.pageThin'), title, finalUrl);
      continue;
    }
    const answer = await askJson(
      notesMessages(question, {
        title,
        url: finalUrl,
        text: page.value.text.slice(0, limit),
      }),
      notesSchema(),
      run.timeouts?.notes ?? RESEARCH_NOTES_TIMEOUT_MS,
    );
    if (answer === null) {
      failed(tr('research.pageTimeout'), title, finalUrl);
      continue;
    }
    const facts = parseNotes(answer);
    if (facts === null) {
      failed(tr('research.pageUnreadable'), title, finalUrl);
    } else if (facts.length === 0) {
      readLines.push(tr('research.pageIrrelevant', label(title, finalUrl)));
    } else {
      // In die Quellenliste kommt die Adresse aus der Suche, nicht die nach Weiterleitungen
      // (die trägt oft Hilfsangaben wie „?error=cookies_not_supported“, weil LocalDesk keine Cookies schickt).
      sources.push({ title, url: pick.url, facts });
      readLines.push(
        tr('research.pageOk', {
          ...label(title, finalUrl),
          count: facts.length,
        }),
      );
    }
  }
  row('read', {
    status: sources.length > 0 ? 'done' : 'error',
    step: `${picks.length}/${picks.length}`,
    result: readLines.join('\n'),
  });
  if (sources.length === 0) {
    emit({ requestId, type: 'error', error: tr('research.nothingFound') });
    return;
  }

  // --- 4. Bericht (gestreamt wie eine Antwort)
  signal.throwIfAborted();
  const noted = fitNotes(sources, notesBudgetChars(run.contextLength));
  const request: ChatRequest = {
    model: run.model,
    messages: reportMessages(question, noted),
    ...(run.think !== undefined && { think: run.think }),
    options: {
      contextLength: run.contextLength,
      ...(run.temperature !== undefined && { temperature: run.temperature }),
      ...(run.seed !== undefined && { seed: run.seed }),
    },
  };
  let report = '';
  for await (const chunk of provider.chat(request, signal)) {
    if (chunk.type === 'content') {
      report += chunk.text;
      emit({ requestId, type: 'content', text: chunk.text });
    } else if (chunk.type === 'thinking') {
      emit({ requestId, type: 'thinking', text: chunk.text });
    } else if (chunk.type === 'done' && chunk.stats) {
      stats.push(chunk.stats);
    }
  }
  if (report.trim() === '') {
    emit({ requestId, type: 'error', error: emptyAnswer() });
    return;
  }
  // Die Quellenliste schreibt LocalDesk selbst – das Modell hat nur Nummern.
  emit({ requestId, type: 'content', text: reportFooter(report, noted) });
  emit({ requestId, type: 'done', stats: combineStats(stats) });
}
