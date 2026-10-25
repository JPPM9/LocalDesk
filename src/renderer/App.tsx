import { useEffect, useState } from 'react';
import type { AppInfo } from '../shared/api';

// Platzhalter für Phase 0: zeigt, dass React läuft und die Brücke zum Main-Prozess funktioniert.
export function App() {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.api.getAppInfo().then(setInfo);
  }, []);

  return (
    <main className="placeholder">
      <h1>LocalDesk</h1>
      <p>Grundgerüst läuft.</p>
      {info ? (
        <dl>
          <dt>Version</dt>
          <dd>{info.version}</dd>
          <dt>Electron</dt>
          <dd>{info.electron}</dd>
          <dt>Node</dt>
          <dd>{info.node}</dd>
          <dt>Chromium</dt>
          <dd>{info.chrome}</dd>
        </dl>
      ) : (
        <p>Verbinde mit Main-Prozess …</p>
      )}
    </main>
  );
}
