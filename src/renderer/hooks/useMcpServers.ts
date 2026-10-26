import { useEffect, useState } from 'react';
import type { McpServerView } from '../../shared/api';

/** Alle MCP-Server mit Zustand – aktualisiert sich, sobald der Main-Prozess etwas meldet. */
export function useMcpServers() {
  const [servers, setServers] = useState<McpServerView[] | null>(null);

  useEffect(() => {
    void window.api.listMcpServers().then(setServers);
    return window.api.onMcpChanged(setServers);
  }, []);

  return servers;
}
