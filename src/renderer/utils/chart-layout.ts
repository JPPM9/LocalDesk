/**
 * Rechnen für die Diagramme aus Tabellen (siehe TableChartView): schöne Achsenwerte und
 * Tortenstücke. Reine Funktionen – gezeichnet wird in der Komponente.
 */

/** Schrittweite mit „runder“ Zahl (1, 2, 5 · 10^n), damit die Achse ungefähr `count` Striche hat. */
function niceStep(range: number, count: number): number {
  const raw = range / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

export interface Axis {
  /** Aufsteigende Achsenwerte, von `min` bis `max` (beide dabei). */
  ticks: number[];
  min: number;
  max: number;
}

/**
 * Die Wertachse eines Balken- oder Liniendiagramms: umfasst alle Werte und – bei Balken – die Null.
 * Gleiche Werte (oder nur eine Null) ergeben trotzdem eine gültige Achse.
 */
export function valueAxis(
  values: number[],
  options: { includeZero: boolean; count?: number } = { includeZero: true },
): Axis {
  const count = options.count ?? 5;
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (options.includeZero) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (low === high) {
    // Nur ein Wert: etwas Luft, bei null von 0 bis 1.
    if (low === 0) high = 1;
    else {
      const pad = Math.abs(low) * 0.1;
      low -= pad;
      high += pad;
    }
  }
  const step = niceStep(high - low, count);
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  // Ganzzahlig zählen: So häufen sich keine Rundungsfehler an (0.1 + 0.2 …).
  const first = Math.round(min / step);
  const last = Math.round(max / step);
  for (let i = first; i <= last; i++) ticks.push(roundTo(i * step, step));
  return { ticks, min: ticks[0], max: ticks[ticks.length - 1] };
}

/** Rundet auf so viele Stellen, wie die Schrittweite braucht (0.30000000000000004 → 0.3). */
function roundTo(value: number, step: number): number {
  const digits = Math.max(0, 1 - Math.floor(Math.log10(step)));
  return Number(value.toFixed(Math.min(digits, 12)));
}

export interface PieSlice {
  index: number;
  /** Anteil an der Summe (0 bis 1). */
  share: number;
  /** Winkel in Radiant, 0 = oben, im Uhrzeigersinn. */
  start: number;
  end: number;
}

/** Die Tortenstücke: nur Werte über null, der Reihe nach, zusammen ein Vollkreis. */
export function pieSlices(values: number[]): PieSlice[] {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total <= 0) return [];
  const slices: PieSlice[] = [];
  let angle = 0;
  values.forEach((value, index) => {
    if (value <= 0) return;
    const share = value / total;
    const end = angle + share * Math.PI * 2;
    slices.push({ index, share, start: angle, end });
    angle = end;
  });
  return slices;
}

/** SVG-Pfad eines Tortenstücks (Mittelpunkt cx/cy, Radius r); ein Vollkreis wird in zwei Hälften gezeichnet. */
export function slicePath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const point = (angle: number) =>
    `${(cx + r * Math.sin(angle)).toFixed(2)} ${(cy - r * Math.cos(angle)).toFixed(2)}`;
  // Fast ein ganzer Kreis: Anfang und Ende fielen zusammen und nichts würde gezeichnet.
  if (end - start >= Math.PI * 2 - 1e-6) {
    return `M ${point(0)} A ${r} ${r} 0 1 1 ${point(Math.PI)} A ${r} ${r} 0 1 1 ${point(0)} Z`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${point(start)} A ${r} ${r} 0 ${large} 1 ${point(end)} Z`;
}

/** Kürzt eine Beschriftung auf `max` Zeichen mit „…“. */
export function shortLabel(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}
