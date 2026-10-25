import type { LocalDeskApi } from '../shared/api';

// Macht TypeScript bekannt, dass das Preload-Skript `window.api` bereitstellt.
declare global {
  interface Window {
    api: LocalDeskApi;
  }
}
