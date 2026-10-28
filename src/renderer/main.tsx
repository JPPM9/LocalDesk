import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './i18n';
// Schrift Inter – liegt in der App, wird nicht aus dem Internet geladen.
import '@fontsource-variable/inter';
import './index.css';
import './styles/markdown.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
