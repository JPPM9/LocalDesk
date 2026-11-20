import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { matchShortcut, type ShortcutId } from '../shortcuts/keymap';
import { triggerShortcut } from '../shortcuts/useShortcut';
import { useChatList } from '../chat/useChatList';
import { useTheme } from '../hooks/useTheme';
import { CommandPalette, type PaletteScope } from './CommandPalette';
import { ShortcutHelp } from './ShortcutHelp';
import { Sidebar } from './Sidebar';

/** Kürzel, die etwas auf der Chat-Seite tun – von anderen Seiten aus wird erst dorthin gewechselt. */
const CHAT_SHORTCUTS: ShortcutId[] = ['focusInput', 'chatSettings'];

const SIDEBAR_KEY = 'localdesk.sidebarCollapsed';
/** Unter dieser Fensterbreite ist die Leiste immer schmal (Ausklappen = Überlagerung). */
const NARROW_QUERY = '(max-width: 1099px)';

/** Was Seiten vom Rahmen bekommen (über React Routers Outlet-Kontext). */
export interface LayoutContext {
  /** Chats und Projekte der Seitenleiste – eine Liste für Leiste und Chat-Seite. */
  chatList: ReturnType<typeof useChatList>;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

// Grundrahmen jeder Seite: oben die Titelleiste, links die Seitenleiste, rechts der Inhalt.
// <Outlet /> ist der Platzhalter, an dem React Router die jeweilige Seite einsetzt.
// Außerdem nimmt der Rahmen alle Tastenkürzel entgegen und verteilt sie.
export function AppLayout() {
  const [stored, setStored] = useState(readCollapsed);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(NARROW_QUERY).matches,
  );
  const [overlay, setOverlay] = useState(false);
  const [palette, setPalette] = useState<PaletteScope | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [newProjectTick, setNewProjectTick] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const chatList = useChatList();
  const [, setTheme] = useTheme();

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Eine Auswahl in der Überlagerung schließt sie.
  useEffect(() => setOverlay(false), [location.pathname]);

  const toggleSidebar = () => {
    if (narrow) {
      setOverlay((open) => !open);
      return;
    }
    setStored((value) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1');
      } catch {
        // Ohne Speicher gilt es nur bis zum Neustart.
      }
      return !value;
    });
  };

  // Aktueller Stand für den Tasten-Handler, der nur einmal angemeldet wird.
  const state = useRef({ helpOpen, pathname: location.pathname, palette });
  state.current = { helpOpen, pathname: location.pathname, palette };
  const toggleRef = useRef(toggleSidebar);
  toggleRef.current = toggleSidebar;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (state.current.helpOpen && event.key === 'Escape') {
        event.preventDefault();
        setHelpOpen(false);
        return;
      }
      const id = matchShortcut(event);
      if (!id) return;
      // Bei offener Palette gehört Esc der Palette.
      if (id === 'stop' && state.current.palette) return;
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
          toggleRef.current();
          break;
        case 'search':
          setPalette((open) => (open ? null : 'all'));
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

  const sidebarProps = {
    onToggle: toggleSidebar,
    onOpenPalette: setPalette,
    chatList,
    newProjectTick,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Titelleiste: Ziehfläche + leiser Name; die Fensterknöpfe zeichnet Windows rechts darüber. */}
      <div
        className="flex shrink-0 items-center px-4 text-xs text-muted select-none [-webkit-app-region:drag]"
        style={{ height: 'var(--titlebar-h)' }}
      >
        LocalDesk
      </div>
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={narrow || stored} {...sidebarProps} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet context={{ chatList } satisfies LayoutContext} />
        </main>
      </div>
      {narrow && overlay && (
        <div
          className="dialog-scrim fixed inset-x-0 top-[var(--titlebar-h)] bottom-0 z-40"
          onMouseDown={() => setOverlay(false)}
          onKeyDown={(event) => event.key === 'Escape' && setOverlay(false)}
        >
          <div
            className="h-full bg-[var(--background)] shadow-[var(--shadow-4)]"
            style={{ width: 272 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Sidebar collapsed={false} {...sidebarProps} />
          </div>
        </div>
      )}
      {palette && (
        <CommandPalette
          scope={palette}
          chats={chatList.chats}
          folders={chatList.folders}
          onClose={() => setPalette(null)}
          onToggleSidebar={toggleSidebar}
          onNewProject={() => {
            setOverlay(narrow);
            setNewProjectTick((n) => n + 1);
          }}
          onHelp={() => setHelpOpen(true)}
          onTheme={setTheme}
        />
      )}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
