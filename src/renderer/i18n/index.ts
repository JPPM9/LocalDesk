// Alle sichtbaren Texte kommen aus Sprachdateien statt direkt aus dem Code.
// Deutsch (de.json) ist die Vorlage, Englisch (en.json) hat dieselben Schlüssel –
// ein Test hält beide gleich.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '../../shared/language';
import de from './de.json';
import en from './en.json';

void i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false }, // React schützt bereits vor eingeschleustem HTML
});

/** Stellt die Oberfläche auf die Sprache um (sofort, ohne Neustart). */
export async function applyLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

/** Beim Start: gespeicherte Sprache vom Main-Prozess holen, bevor etwas angezeigt wird. */
export async function loadLanguage(): Promise<void> {
  try {
    await applyLanguage((await window.api.getLanguage()).language);
  } catch {
    // Dann bleibt es bei Deutsch.
  }
}

export default i18n;
