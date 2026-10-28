import { useEffect, useState } from 'react';
import { useChatModels } from '../hooks/useChatModels';

const MODEL_KEY = 'localdesk.mailModel';
/** Zuletzt im Chat genutztes Modell (siehe ChatPage) – als Vorschlag. */
const CHAT_MODEL_KEY = 'localdesk.lastModel';

function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Modell für Mail-Aufgaben: zuletzt hier gewählt, sonst das aus dem Chat, sonst das erste. */
export function useMailModel() {
  const { models } = useChatModels();
  const [model, setModel] = useState('');

  useEffect(() => {
    if (model || models.length === 0) return;
    const names = models.map((m) => m.name);
    const preferred = [remembered(MODEL_KEY), remembered(CHAT_MODEL_KEY)].find(
      (name) => name && names.includes(name),
    );
    setModel(preferred ?? names[0]);
  }, [models, model]);

  const choose = (name: string) => {
    setModel(name);
    try {
      localStorage.setItem(MODEL_KEY, name);
    } catch {
      // ohne Speicher gilt die Wahl nur bis zum Neustart
    }
  };

  return { models, model, choose };
}
