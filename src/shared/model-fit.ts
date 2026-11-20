// „Passt das Modell auf diesen PC?“ – eine Schätzung, kein Versprechen.
// Gewichte + Kontext-Speicher (KV-Cache) + etwas Reserve gegen Grafikspeicher und Arbeitsspeicher.

export type FitLevel = 'gpu' | 'partial' | 'cpu' | 'no';

export interface Hardware {
  /** Grafikspeicher in Byte; null = unbekannt oder keine NVIDIA-Karte. */
  vramBytes: number | null;
  /** Gesamter Arbeitsspeicher in Byte. */
  ramBytes: number;
}

/** Standard-Kontext, mit dem die Rechnung läuft (Ollama-Standard). */
export const FIT_CONTEXT = 4096;

/** Anteil des Grafikspeichers, den ein Modell höchstens belegen soll (Rest: Windows, Anzeige). */
const VRAM_USABLE = 0.92;
/** Anteil des Arbeitsspeichers, der für ein Modell übrig bleibt (Rest: Windows, andere Programme). */
const RAM_USABLE = 0.75;

/**
 * Grober Speicherbedarf: Dateigröße (Gewichte) + 8 % Reserve + KV-Cache.
 * Der KV-Cache wächst mit dem Kontext; ohne Modell-Daten nehmen wir 4 % der Dateigröße je 4096 Token.
 */
export function estimateNeedBytes(
  fileBytes: number,
  contextLength = FIT_CONTEXT,
): number {
  const kv = fileBytes * 0.04 * (contextLength / FIT_CONTEXT);
  return Math.round(fileBytes * 1.08 + kv);
}

/**
 * gpu = passt ganz in den Grafikspeicher · partial = Rest läuft auf dem Prozessor (langsam) ·
 * cpu = keine Grafikkarte erkannt, läuft im Arbeitsspeicher (langsam) · no = passt nicht.
 */
export function fitModel(
  fileBytes: number,
  hardware: Hardware,
  contextLength = FIT_CONTEXT,
): { level: FitLevel; needBytes: number } {
  const needBytes = estimateNeedBytes(fileBytes, contextLength);
  const vram = hardware.vramBytes;
  const ram = hardware.ramBytes * RAM_USABLE;
  if (vram && vram > 0) {
    if (needBytes <= vram * VRAM_USABLE) return { level: 'gpu', needBytes };
    if (needBytes <= vram * VRAM_USABLE + ram)
      return { level: 'partial', needBytes };
    return { level: 'no', needBytes };
  }
  return { level: needBytes <= ram ? 'cpu' : 'no', needBytes };
}
