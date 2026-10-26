import { ipcMain } from 'electron';
import { IpcChannels } from '../shared/api';
import type { TemplateRepository } from './db/template-repository';

/** Vorlagen für die Oberfläche: auflisten, speichern, löschen. */
export function registerTemplateHandlers(templates: TemplateRepository) {
  ipcMain.handle(IpcChannels.listTemplates, () => templates.listTemplates());

  // Die Prüfung der Eingabe übernimmt das Repository.
  ipcMain.handle(IpcChannels.saveTemplate, (_event, input: unknown) =>
    templates.saveTemplate(input),
  );

  ipcMain.handle(IpcChannels.deleteTemplate, (_event, templateId: unknown) => {
    if (typeof templateId === 'string') templates.deleteTemplate(templateId);
  });
}
