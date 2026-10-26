import type { GpuStatus, Result, RunningModel } from '../../shared/api';
import { usePolling } from './usePolling';

/** Welche Modelle gerade geladen sind (regelmäßig neu abgefragt). */
export function useRunningModels(intervalMs: number) {
  return usePolling<Result<RunningModel[]>>(
    () => window.api.listRunningModels(),
    intervalMs,
  );
}

/** Messwerte der Grafikkarte (regelmäßig neu abgefragt). */
export function useGpuStatus(intervalMs: number) {
  return usePolling<GpuStatus>(() => window.api.getGpuStatus(), intervalMs);
}
