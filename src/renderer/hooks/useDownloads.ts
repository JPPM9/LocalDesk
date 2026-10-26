import { useEffect, useRef, useState } from 'react';
import type { DownloadState } from '../../shared/api';
import { addSample, speed, type Sample } from '../utils/downloadSpeed';

export interface DownloadView extends DownloadState {
  /** Bytes pro Sekunde (gemittelt), null = noch unbekannt. */
  bytesPerSecond: number | null;
}

/**
 * Alle Downloads mit Tempo. `onFinished` wird aufgerufen, wenn ein Download
 * gerade erfolgreich fertig geworden ist (z. B. um die Modellliste neu zu laden).
 */
export function useDownloads(onFinished?: (model: string) => void) {
  const [downloads, setDownloads] = useState<DownloadView[]>([]);
  const samples = useRef(new Map<string, Sample[]>());
  const lastPhase = useRef(new Map<string, string>());
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const apply = (list: DownloadState[]) => {
      const now = Date.now();
      setDownloads(
        list.map((download) => {
          const history = addSample(samples.current.get(download.model) ?? [], {
            at: now,
            bytes: download.completedBytes,
          });
          samples.current.set(download.model, history);

          const before = lastPhase.current.get(download.model);
          if (
            download.phase === 'done' &&
            before !== undefined &&
            before !== 'done'
          ) {
            onFinishedRef.current?.(download.model);
          }
          lastPhase.current.set(download.model, download.phase);

          return {
            ...download,
            bytesPerSecond:
              download.phase === 'downloading' ? speed(history) : null,
          };
        }),
      );
    };

    void window.api.listDownloads().then(apply);
    return window.api.onDownloadsChanged(apply);
  }, []);

  return downloads;
}
