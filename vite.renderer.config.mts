import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Content-Security-Policy für die fertige App: Die Oberfläche darf nur eigene
// Skripte laden und selbst keine Netzwerkverbindungen aufbauen – alles Netzwerk
// (z. B. Ollama) läuft über den Main-Prozess. Im Entwicklungsmodus lassen wir die
// Regel weg, weil Vite dort Inline-Skripte für das Neuladen braucht.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Keine Bilder aus dem Internet – auch nicht in Antworten eines Modells (Tracking).
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  // Was die Oberfläche nie braucht, ist ganz verboten.
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'localdesk-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
});
