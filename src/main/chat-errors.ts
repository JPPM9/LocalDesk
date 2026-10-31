import { tr } from '../shared/messages';

/**
 * Macht aus Ollamas (englischen) Fehlermeldungen einen verständlichen Hinweis.
 * Bei bekannten Fällen bleibt die Originalmeldung angehängt – die hilft bei der Fehlersuche.
 */
export function describeChatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // "registry.ollama.ai/library/<modell> does not support tools"
  if (message.includes('does not support tools')) {
    return tr('chat.noTools');
  }
  // Absturz beim Laden, z. B. "llama-server process has terminated: … CUDA error",
  // oder zu wenig Speicher – meist, weil noch ein anderes Modell den Grafikspeicher belegt.
  if (
    message.includes('process has terminated') ||
    message.includes('requires more system memory') ||
    /out of memory/i.test(message)
  ) {
    return tr('chat.cannotLoad', { message });
  }
  return message;
}
