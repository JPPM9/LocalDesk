// Kleines Signal innerhalb der Oberfläche: „Der aktive Ollama-Server hat sich geändert.“
// Die Statusanzeige hört darauf und prüft sofort neu, statt bis zu 5 Sekunden zu warten.
const SERVER_CHANGED = 'localdesk:server-changed';

export function notifyServerChanged() {
  window.dispatchEvent(new Event(SERVER_CHANGED));
}

export function onServerChanged(listener: () => void): () => void {
  window.addEventListener(SERVER_CHANGED, listener);
  return () => window.removeEventListener(SERVER_CHANGED, listener);
}
