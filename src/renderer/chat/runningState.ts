import { useEffect, useState } from 'react';

// Läuft gerade eine Antwort? Die Chat-Seite meldet es, die Palette zeigt dann „Antwort stoppen“.
const EVENT = 'localdesk:running';
let running = false;

export function setChatRunning(value: boolean) {
  running = value;
  window.dispatchEvent(new Event(EVENT));
}

export function useChatRunning(): boolean {
  const [value, setValue] = useState(running);
  useEffect(() => {
    const onChange = () => setValue(running);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return value;
}
