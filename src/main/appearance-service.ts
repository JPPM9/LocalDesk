import { ipcMain, nativeTheme } from 'electron';
import { IpcChannels } from '../shared/api';
import { isThemeChoice, type ThemeChoice } from '../shared/appearance';
import type { AppSettingsRepository } from './db/app-settings-repository';

const THEME_KEY = 'appearance.theme';

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
}
