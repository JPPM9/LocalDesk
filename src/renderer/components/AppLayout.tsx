import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { matchShortcut, type ShortcutId } from '../shortcuts/keymap';
import { triggerShortcut } from '../shortcuts/useShortcut';
import { ShortcutHelp } from './ShortcutHelp';
import { Sidebar } from './Sidebar';

/** Kürzel, die etwas auf der Chat-Seite tun – von anderen Seiten aus wird erst dorthin gewechselt. */
const CHAT_SHORTCUTS: ShortcutId[] = ['search', 'focusInput', 'chatSettings'];

// Grundrahmen jeder Seite: links die Seitenleiste, rechts der Inhalt der aktuellen Seite.
// <Outlet /> ist der Platzhalter, an dem React Router die jeweilige Seite einsetzt.
// Außerdem nimmt der Rahmen alle Tastenkürzel entgegen und verteilt sie.
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Aktueller Stand für den Tasten-Handler, der nur einmal angemeldet wird.
  const state = useRef({ helpOpen, pathname: location.pathname });
  state.current = { helpOpen, pathname: location.pathname };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (state.current.helpOpen && event.key === 'Escape') {
        event.preventDefault();
        setHelpOpen(false);
        return;
      }
      const id = matchShortcut(event);
      if (!id) return;
      event.preventDefault();

      switch (id) {
        case 'newChat':
          navigate('/chat');
          triggerShortcut('focusInput');
          break;
        case 'settings':
          navigate('/settings');
          break;
        case 'toggleSidebar':
          setCollapsed((c) => !c);
          break;
        case 'help':
          setHelpOpen((open) => !open);
          break;
        default:
          if (
            CHAT_SHORTCUTS.includes(id) &&
            !state.current.pathname.startsWith('/chat')
          ) {
            navigate('/chat');
          }
          triggerShortcut(id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
