/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';
/** Bilder, die Vite als Datei mitliefert (z. B. das App-Symbol in der Leiste). */
declare module '*.png' {
  const url: string;
  export default url;
}
/** pdf.js liefert für seinen Worker keine Typen – wir nutzen ihn nur als Ganzes. */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
