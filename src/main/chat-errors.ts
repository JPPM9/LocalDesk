/**
 * Macht aus Ollamas (englischen) Fehlermeldungen einen verständlichen Hinweis.
 * Bei bekannten Fällen bleibt die Originalmeldung angehängt – die hilft bei der Fehlersuche.
 */
export function describeChatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // "registry.ollama.ai/library/<modell> does not support tools"
  if (message.includes('does not support tools')) {
    return 'Dieses Modell kann keine Tools benutzen – schalte die MCP-Server für diesen Chat aus (Stecker-Symbol oben).';
  }
  // Absturz beim Laden, z. B. "llama-server process has terminated: … CUDA error",
  // oder zu wenig Speicher – meist, weil noch ein anderes Modell den Grafikspeicher belegt.
  if (
    message.includes('process has terminated') ||
    message.includes('requires more system memory') ||
    /out of memory/i.test(message)
  ) {
    return `Ollama konnte das Modell nicht laden. Häufigste Ursache: Der Grafikspeicher ist noch von einem anderen Modell belegt – auf der Status-Seite nachsehen und es erneut versuchen. (${message})`;
  }
  return message;
}
