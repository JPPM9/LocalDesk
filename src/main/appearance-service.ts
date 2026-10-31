import { app, ipcMain, nativeTheme } from 'electron';
import { IpcChannels } from '../shared/api';
import { isThemeChoice, type ThemeChoice } from '../shared/appearance';
import {
  isLanguageChoice,
  resolveLanguage,
  type Language,
  type LanguageChoice,
  type LanguageState,
} from '../shared/language';
import { setMessageLanguage } from '../shared/messages';
import type { AppSettingsRepository } from './db/app-settings-repository';

const THEME_KEY = 'appearance.theme';
const LANGUAGE_KEY = 'appearance.language';

/**
 * Hell / Dunkel / wie Windows. Stellt Electrons nativeTheme um – dadurch folgen
 * prefers-color-scheme in der Oberfläche, Bildlaufleisten und Kontextmenüs.
 * Die Wahl wird gespeichert und beim nächsten Start sofort wieder gesetzt.
 */
export function registerAppearanceHandlers(settings: AppSettingsRepository) {
  const stored = settings.get(THEME_KEY);
  nativeTheme.themeSource = isThemeChoice(stored) ? stored : 'system';

  ipcMain.handle(
    IpcChannels.getTheme,
    (): ThemeChoice => nativeTheme.themeSource,
  );

  ipcMain.handle(IpcChannels.setTheme, (_event, theme: unknown) => {
    if (!isThemeChoice(theme)) return;
    nativeTheme.themeSource = theme;
    settings.set(THEME_KEY, theme);
  });

  // Sprache: gespeichert wird die Wahl („wie Windows“ bleibt dynamisch),
  // die Oberfläche bekommt die aufgelöste Sprache.
  const readChoice = (): LanguageChoice => {
    const value = settings.get(LANGUAGE_KEY);
    return isLanguageChoice(value) ? value : 'system';
  };
  const resolve = (choice: LanguageChoice): Language =>
    resolveLanguage(choice, [
      ...app.getPreferredSystemLanguages(),
      app.getLocale(),
    ]);

  // Meldungen aus dem Hauptprozess folgen derselben Sprache – ab dem Start.
  setMessageLanguage(resolve(readChoice()));

  ipcMain.handle(IpcChannels.getLanguage, (): LanguageState => {
    const choice = readChoice();
    return { choice, language: resolve(choice) };
  });

  ipcMain.handle(
    IpcChannels.setLanguage,
    (_event, choice: unknown): Language => {
      if (!isLanguageChoice(choice)) return resolve(readChoice());
      settings.set(LANGUAGE_KEY, choice);
      const language = resolve(choice);
      setMessageLanguage(language);
      return language;
    },
  );
}
