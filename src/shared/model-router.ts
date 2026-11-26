// Auto-Modus der Modellwahl: aus den installierten Modellen das passendste für die Aufgabe nennen.
// Nachvollziehbare Regeln statt eines Router-Modells – jede Wahl kommt mit Gründen.
import type { ModelInfo } from './api';
import { fitModel, type FitLevel, type Hardware } from './model-fit';

/** Wert der Modellauswahl für „Auto“ (kein echter Modellname). */
export const AUTO_MODEL = '__auto__';

export interface TaskSignals {
  /** Bilder im Chat oder an der neuen Nachricht. */
  images: boolean;
  /** Werkzeuge sind eingeschaltet (MCP, Mail, Internet). */
  tools: boolean;
  /** Sieht nach einer Programmieraufgabe aus. */
  code: boolean;
  /** Sieht nach Rechnen oder Herleiten aus. */
  reasoning: boolean;
  /** Geschätzter Kontextbedarf in Token (Verlauf + neue Nachricht). */
  contextTokens: number;
}

export type ReasonKey =
  | 'vision'
  | 'tools'
  | 'code'
  | 'thinking'
  | 'fitsGpu'
  | 'partial'
  | 'cpu'
  | 'loaded'
  | 'largest';

/** Was die Oberfläche vor dem Senden zeigt: der Vorschlag, die Gründe und die Wahlmöglichkeiten. */
export interface AutoProposal {
  model: string;
  reasons: ReasonKey[];
  /** Alle Modelle, aus denen man stattdessen wählen kann. */
  choices: string[];
}

export interface AutoPick {
  model: string;
  reasons: ReasonKey[];
  /** Alle geeigneten Modelle, bestes zuerst. */
  ranked: string[];
}

const CODE_WORDS =
  /```|\b(code|funktion|function|skript|script|python|javascript|typescript|java|rust|c\+\+|c#|sql|regex|bug|compile[rn]?|programm\w*|refactor\w*|algorithm\w*|api|json|html|css)\b/i;
const REASONING_WORDS =
  /\b(beweis\w*|berechne\w*|rechne\w*|herleit\w*|schritt f[üu]r schritt|logik\w*|mathe\w*|gleichung\w*|prove|calculate|derive|step by step|reason\w*)\b/i;

/** Aufgaben-Signale aus dem Text der neuen Nachricht (einfache Stichwörter, kein Verstehen). */
export function detectSignals(
  text: string,
  base: Pick<TaskSignals, 'images' | 'tools' | 'contextTokens'> & {
    /** Der Code-Bereich zählt immer als Code. */
    codeArea?: boolean;
  },
): TaskSignals {
  return {
    images: base.images,
    tools: base.tools,
    code: base.codeArea === true || CODE_WORDS.test(text),
    reasoning: REASONING_WORDS.test(text),
    contextTokens: base.contextTokens,
  };
}

/** „14.8B“ → 14.8, „595.78M“ → 0.59578; unbekannt → 0 (Milliarden Parameter). */
export function billions(parameterSize: string | undefined): number {
  const match = /^([\d.]+)\s*([KMBT])?/i.exec(parameterSize ?? '');
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = (match[2] ?? 'B').toUpperCase();
  return unit === 'T'
    ? value * 1000
    : unit === 'M'
      ? value / 1000
      : unit === 'K'
        ? value / 1e6
        : value;
}

const FIT_SCORE: Record<FitLevel, number> = {
  gpu: 100,
  partial: 40,
  cpu: 30,
  no: -1000,
};
const FIT_REASON: Partial<Record<FitLevel, ReasonKey>> = {
  gpu: 'fitsGpu',
  partial: 'partial',
  cpu: 'cpu',
};
const CODER_NAME = /coder|code|devstral|codestral|starcoder/i;

function canChat(model: ModelInfo): boolean {
  return (
    model.capabilities.length === 0 || model.capabilities.includes('completion')
  );
}

/**
 * Wählt das passendste Modell. Harte Anforderungen (Bilder → Vision, Werkzeuge → Werkzeug-Fähigkeit,
 * passt in den Speicher) filtern; danach zählen: Fähigkeiten, Größe, bereits geladen, Kontext.
 * Gibt es kein vollständig passendes Modell, gewinnt das am wenigsten unpassende (ohne Gründe dafür).
 * `null` = keine Modelle.
 */
export function pickModel(
  models: ModelInfo[],
  signals: TaskSignals,
  hardware: Hardware,
  loaded: string[] = [],
): AutoPick | null {
  const candidates = models.filter(canChat);
  if (candidates.length === 0) return null;

  const scored = candidates.map((model) => {
    const reasons: ReasonKey[] = [];
    let score = 0;
    const vision = model.capabilities.includes('vision');
    const tools = model.capabilities.includes('tools');
    // Server ohne Größenangabe (OpenAI-kompatibel): neutral behandeln.
    const level: FitLevel =
      model.sizeBytes > 0
        ? fitModel(
            model.sizeBytes,
            hardware,
            Math.max(4096, signals.contextTokens),
          ).level
        : 'gpu';

    if (signals.images) {
      if (vision) {
        score += 200;
        reasons.push('vision');
      } else score -= 500;
    }
    if (signals.tools) {
      if (tools) {
        score += 150;
        reasons.push('tools');
      } else score -= 400;
    }
    score += FIT_SCORE[level];
    const fit = FIT_REASON[level];
    if (fit) reasons.push(fit);

    // Größer ist besser – aber nur sanft, damit „passt gut“ vor „riesig und halb auf der CPU“ liegt.
    score += 10 * Math.log1p(billions(model.parameterSize));
    if (signals.code && CODER_NAME.test(model.name)) {
      score += 30;
      reasons.push('code');
    }
    if (signals.reasoning && model.capabilities.includes('thinking')) {
      score += 12;
      reasons.push('thinking');
    }
    if (loaded.includes(model.name)) {
      score += 20;
      reasons.push('loaded');
    }
    if (model.contextLength && model.contextLength < signals.contextTokens)
      score -= 60;
    return { model, score, reasons };
  });

  scored.sort(
    (a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name),
  );
  const best = scored[0];
  const biggest = Math.max(
    ...scored.map((s) => billions(s.model.parameterSize)),
  );
  const reasons = [...best.reasons];
  if (
    biggest > 0 &&
    billions(best.model.parameterSize) === biggest &&
    scored.length > 1 &&
    !reasons.includes('loaded')
  )
    reasons.push('largest');
  return {
    model: best.model.name,
    reasons,
    ranked: scored.filter((s) => s.score > -400).map((s) => s.model.name),
  };
}
