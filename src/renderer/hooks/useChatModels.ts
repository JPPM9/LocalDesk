import { useEffect, useState } from 'react';
import type { ModelInfo } from '../../shared/api';

/** Reine Embedding-Modelle können nicht chatten und gehören nicht in die Auswahl. */
function canChat(model: ModelInfo) {
  return (
    model.capabilities.length === 0 || model.capabilities.includes('completion')
  );
}

/** Die installierten Modelle, mit denen man chatten kann (einmal beim Öffnen geladen). */
export function useChatModels() {
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.api.listModels().then((result) => {
      if (result.ok) setModels(result.value.filter(canChat));
      else setError(result.error);
    });
  }, []);

  // `loaded` unterscheidet „noch nicht geladen“ von „keine Modelle“.
  return { models: models ?? [], loaded: models !== null, error };
}
