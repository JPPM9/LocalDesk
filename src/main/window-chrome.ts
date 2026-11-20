import { nativeTheme, type BrowserWindow, type Input } from 'electron';

/** Höhe der eigenen Titelleiste (DESIGN.md: --titlebar-h). */
export const TITLEBAR_HEIGHT = 40;

const SYMBOL_LIGHT = '#302d2b';
const SYMBOL_DARK = '#ebe7e4';

/** Fensterknöpfe (Windows) im Ton des Designs; die Fläche bleibt durchsichtig. */
export function overlayOptions() {
  return {
    color: '#00000000',
    symbolColor: nativeTheme.shouldUseDarkColors ? SYMBOL_DARK : SYMBOL_LIGHT,
    height: TITLEBAR_HEIGHT,
  };
}

/** Funktionen der entfallenen Menüzeile (JOURNEY.md „Menüzeile: Verbleib der Funktionen“). */
export type WindowCommand =
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'fullscreen'
  | 'devtools'
  | 'reload'
  | 'reloadHard';

export function runWindowCommand(win: BrowserWindow, cmd: WindowCommand) {
  const wc = win.webContents;
  switch (cmd) {
    case 'zoomIn':
      wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 5));
      break;
    case 'zoomOut':
      wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -5));
      break;
    case 'zoomReset':
      wc.setZoomLevel(0);
      break;
    case 'fullscreen':
      win.setFullScreen(!win.isFullScreen());
      break;
    case 'devtools':
      wc.toggleDevTools();
      break;
    case 'reload':
      wc.reload();
      break;
    case 'reloadHard':
      wc.reloadIgnoringCache();
      break;
  }
}

/** Welche Funktion gehört zu diesem Tastendruck? Reine Funktion, damit sie testbar ist. */
export function commandForInput(input: Input): WindowCommand | null {
  if (input.type !== 'keyDown' || input.alt || input.meta) return null;
  const key = input.key;
  if (key === 'F11' && !input.control) return 'fullscreen';
  if (!input.control) return null;
  if (key === '+' || key === '=') return 'zoomIn';
  if (key === '-' || key === '_') return 'zoomOut';
  if (key === '0') return 'zoomReset';
  const lower = key.toLowerCase();
  if (lower === 'i' && input.shift) return 'devtools';
  if (lower === 'r') return input.shift ? 'reloadHard' : 'reload';
  return null;
}

/** Ohne Menüzeile gelten diese Kürzel nur noch, weil wir sie hier selbst abfangen. */
export function applyWindowChrome(win: BrowserWindow) {
  win.webContents.on('before-input-event', (event, input) => {
    const cmd = commandForInput(input);
    if (!cmd) return;
    event.preventDefault();
    runWindowCommand(win, cmd);
  });
  // Hell/Dunkel wechselt → die Symbole der Fensterknöpfe müssen mit.
  const onTheme = () => {
    if (!win.isDestroyed()) win.setTitleBarOverlay(overlayOptions());
  };
  nativeTheme.on('updated', onTheme);
  win.on('closed', () => nativeTheme.off('updated', onTheme));
}
