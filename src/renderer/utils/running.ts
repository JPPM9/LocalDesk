import type { RunningModel } from '../../shared/api';

/**
 * Wie viel eines geladenen Modells liegt auf der GPU, wie viel auf der CPU?
 * Gerundet wie bei `ollama ps`. Alles, was nicht in den VRAM passt, rechnet die
 * CPU – das macht die Antworten deutlich langsamer.
 */
export function gpuSplit(model: RunningModel): { gpu: number; cpu: number } {
  if (model.sizeBytes <= 0) return { gpu: 0, cpu: 0 };
  const gpu = Math.round((model.vramBytes / model.sizeBytes) * 100);
  return { gpu, cpu: 100 - gpu };
}

/** Kurztext wie bei `ollama ps`: „100 % GPU“, „100 % CPU“ oder „62 % GPU / 38 % CPU“. */
export function gpuSplitLabel(model: RunningModel): string {
  const { gpu, cpu } = gpuSplit(model);
  if (gpu === 100) return '100 % GPU';
  if (gpu === 0) return '100 % CPU';
  return `${gpu} % GPU / ${cpu} % CPU`;
}

/** Summe des belegten Grafikspeichers aller geladenen Modelle. */
export function totalVram(models: RunningModel[]): number {
  return models.reduce((sum, model) => sum + model.vramBytes, 0);
}

/**
 * Wie lange bleibt das Modell noch geladen, wenn niemand es benutzt?
 * Ollama entlädt standardmäßig nach 5 Minuten ohne Anfrage.
 */
export function expiresIn(
  expiresAt: string | undefined,
  now: number,
): string | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const seconds = Math.round((end - now) / 1000);
  // Sehr weit in der Zukunft = „bleibt geladen“ (keep_alive -1 → Jahr 2318 o. Ä.)
  if (seconds > 7 * 24 * 3600) return 'dauerhaft';
  if (seconds <= 0) return 'gleich';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  return `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.`;
}
