// Alle sichtbaren Texte kommen aus Sprachdateien statt direkt aus dem Code.
// So bleibt Deutsch an einer Stelle, und Englisch kann später als en.json dazukommen.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './de.json';

void i18n.use(initReactI18next).init({
  resources: { de: { translation: de } },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false }, // React schützt bereits vor eingeschleustem HTML
});

export default i18n;
