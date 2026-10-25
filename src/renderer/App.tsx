import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { ModelsPage } from './pages/ModelsPage';
import { SettingsPage } from './pages/SettingsPage';

// HashRouter statt BrowserRouter: Die fertige App wird als Datei (file://) geladen,
// dort funktionieren nur Adressen hinter dem # (z. B. index.html#/chat).
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
