/** Ein Messpunkt: Zeitpunkt (ms) und bis dahin geladene Bytes. */
export interface Sample {
  at: number;
  bytes: number;
}

/** Über wie viele Sekunden das Tempo gemittelt wird – glättet Schwankungen. */
const WINDOW_MS = 5000;

/** Hängt einen Messpunkt an und wirft alles weg, was älter als das Zeitfenster ist. */
export function addSample(samples: Sample[], sample: Sample): Sample[] {
  return [...samples, sample].filter((s) => sample.at - s.at <= WINDOW_MS);
}

/** Bytes pro Sekunde über das Zeitfenster; null, solange zu wenig gemessen wurde. */
export function speed(samples: Sample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const seconds = (last.at - first.at) / 1000;
  if (seconds < 1) return null;
  return Math.max(0, (last.bytes - first.bytes) / seconds);
}

/** Geschätzte Restzeit als Text, z. B. „noch 2 Min.“ – null, wenn unbekannt. */
export function remaining(
  totalBytes: number,
  doneBytes: number,
  bytesPerSecond: number | null,
): string | null {
  if (!bytesPerSecond || bytesPerSecond <= 0 || totalBytes <= 0) return null;
  const seconds = Math.round((totalBytes - doneBytes) / bytesPerSecond);
  if (seconds < 60) return `noch ${Math.max(seconds, 1)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `noch ${minutes} Min.`;
  return `noch ${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.`;
}
