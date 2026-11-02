import { useEffect, useState } from 'react';
import type { ModelInfo } from '../../shared/api';
import { onServerChanged } from '../serverEvents';

/** Reine Embedding-Modelle können nicht chatten und gehören nicht in die Auswahl. */
function canChat(model: ModelInfo) {
  return (
    model.capabilities.length === 0 || model.capabilities.includes('completion')
  );
}

interface Loaded {
  models: ModelInfo[];
  /** Zählt, wie oft die Liste nach einem Serverwechsel neu geladen wurde (0 = nur das erste Laden). */
  epoch: number;
}

/**
 * Die installierten Modelle, mit denen man chatten kann – beim Öffnen geladen und neu,
 * wenn der aktive Server wechselt (z. B. über den Ausweich-Hinweis im Chat).
 */
export function useChatModels() {
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = (afterSwitch: boolean) =>
      void window.api.listModels().then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setError(null);
        setState((prev) => ({
          models: result.value.filter(canChat),
          epoch: (prev?.epoch ?? 0) + (afterSwitch ? 1 : 0),
        }));
      });
    load(false);
    return onServerChanged(() => load(true));
  }, []);

  // `loaded` unterscheidet „noch nicht geladen“ von „keine Modelle“.
  return {
    models: state?.models ?? [],
    loaded: state !== null,
    error,
    epoch: state?.epoch ?? 0,
  };
}
