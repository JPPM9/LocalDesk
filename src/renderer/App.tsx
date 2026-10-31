import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { ProjectPage } from './pages/ProjectPage';
import { ModelsPage } from './pages/ModelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MailPage } from './pages/MailPage';
import { CodePage } from './pages/CodePage';
import { SkillsPage } from './pages/SkillsPage';
import { StatusPage } from './pages/StatusPage';
import { TemplatesPage } from './pages/TemplatesPage';

// HashRouter statt BrowserRouter: Die fertige App wird als Datei (file://) geladen,
// dort funktionieren nur Adressen hinter dem # (z. B. index.html#/chat).
export function App() {
  return (
    <HashRouter>
      <ConfirmProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            {/* Eine Route mit optionaler ID: So bleibt die Chat-Seite beim Wechsel
              von „neuer Chat“ zu „gespeicherter Chat“ dieselbe und verliert
              keine gerade laufende Antwort. */}
            <Route path="chat/:chatId?" element={<ChatPage />} />
            <Route path="templates/:templateId?" element={<TemplatesPage />} />
            <Route
              path="knowledge/:collectionId?"
              element={<KnowledgePage />}
            />
            <Route path="skills/:skillId?" element={<SkillsPage />} />
            <Route path="mail/:messageId?" element={<MailPage />} />
            <Route path="code/:sessionId?" element={<CodePage />} />
            <Route path="projects/:projectId" element={<ProjectPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </HashRouter>
  );
}
