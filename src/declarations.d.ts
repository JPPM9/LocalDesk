/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';
/** pdf.js liefert für seinen Worker keine Typen – wir nutzen ihn nur als Ganzes. */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
