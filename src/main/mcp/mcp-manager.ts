import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig, McpServerStatus } from '../../shared/api';
import { buildCommand, toToolInfo } from './server-kinds';

/** Wie viele Zeilen der Server-Meldungen wir für die Fehlersuche aufheben. */
const LOG_LINES = 30;
/** npx lädt den Server beim ersten Start herunter – das darf etwas dauern. */
const CONNECT_TIMEOUT_MS = 60_000;

interface Session {
  client: Client | null;
  status: McpServerStatus;
}

/**
 * Startet und stoppt MCP-Server und merkt sich ihren Zustand und ihre Tools.
 * Jede Änderung meldet `onChange` (damit die Oberfläche aktuell bleibt).
 */
export class McpManager {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly onChange: () => void) {}

  statuses(): McpServerStatus[] {
    return [...this.sessions.values()].map((s) => s.status);
  }

  status(serverId: string): McpServerStatus {
    return (
      this.sessions.get(serverId)?.status ?? {
        id: serverId,
        state: 'stopped',
        log: [],
        tools: [],
      }
    );
  }

  async start(config: McpServerConfig): Promise<void> {
    await this.stop(config.id);
    const session: Session = {
      client: null,
      status: { id: config.id, state: 'starting', log: [], tools: [] },
    };
    this.sessions.set(config.id, session);
    this.onChange();

    const update = (patch: Partial<McpServerStatus>) => {
      // Nur den aktuellen Lauf aktualisieren, nicht einen inzwischen ersetzten.
      if (this.sessions.get(config.id) !== session) return;
      session.status = { ...session.status, ...patch };
      this.onChange();
    };

    const { command, args } = buildCommand(config);
    const transport = new StdioClientTransport({
      command,
      args,
      stderr: 'pipe',
    });
    transport.stderr?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString('utf8').split(/\r?\n/).filter(Boolean);
      update({ log: [...session.status.log, ...lines].slice(-LOG_LINES) });
    });

    const client = new Client({ name: 'LocalDesk', version: '0.1.0' });
    session.client = client;
    try {
      await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });
      const { tools } = await client.listTools();
      update({
        state: 'running',
        error: undefined,
        tools: tools.map(toToolInfo),
      });
    } catch (error) {
      update({
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      await client.close().catch(() => undefined);
      session.client = null;
      return;
    }

    // Beendet sich der Server von selbst (Absturz), sieht man das in der Oberfläche.
    client.onclose = () => {
      if (session.status.state === 'running') {
        update({
          state: 'error',
          error: 'Server wurde unerwartet beendet',
          tools: [],
        });
      }
    };
  }

  async stop(serverId: string): Promise<void> {
    const session = this.sessions.get(serverId);
    if (!session) return;
    this.sessions.delete(serverId);
    session.status = { ...session.status, state: 'stopped', tools: [] };
    if (session.client) {
      session.client.onclose = undefined;
      await session.client.close().catch(() => undefined);
    }
    this.onChange();
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((id) => this.stop(id)));
  }

  /** Verbindung zu einem laufenden Server, um Tools aufzurufen. */
  getClient(serverId: string): Client | null {
    const session = this.sessions.get(serverId);
    return session?.status.state === 'running' ? session.client : null;
  }
}
