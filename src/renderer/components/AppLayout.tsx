import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

// Grundrahmen jeder Seite: links die Seitenleiste, rechts der Inhalt der aktuellen Seite.
// <Outlet /> ist der Platzhalter, an dem React Router die jeweilige Seite einsetzt.
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
