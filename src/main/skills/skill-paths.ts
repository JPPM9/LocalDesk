/** Reservierte Gerätenamen von Windows (CON, NUL, COM1 …) – als Dateiname nicht erlaubt. */
const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * Prüft einen Pfad aus einer abgelegten Datei oder ZIP (alle Wege hierher kommen von
 * außen) und gibt ihn mit „/“ zurück – oder null, wenn er unzulässig ist: absolut,
 * mit Laufwerk, „..“, „:“ (Windows-Datenströme), Sonderzeichen, Punkt oder Leerzeichen
 * am Ende, Gerätename oder zu lang.
 */
export function safeSkillPath(raw: string): string | null {
  const text = raw.replace(/\\/g, '/');
  if (text.startsWith('/') || /^[a-zA-Z]:/.test(text)) return null;
  const parts = text.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.length === 0) return null;
  for (const part of parts) {
    if (part === '..' || part.includes(':') || part.length > 100) return null;
    const odd = [...part].some((c) => {
      const code = c.charCodeAt(0);
      return code < 32 || code === 127 || '<>"|?*'.includes(c);
    });
    if (odd) return null;
    if (/[. ]$/.test(part) || DEVICE.test(part.split('.')[0])) return null;
  }
  return parts.join('/');
}

/** Mac-Reste („__MACOSX“) und versteckte Dateien in ZIPs – werden still übergangen. */
export function isJunkPath(raw: string): boolean {
  return raw
    .replace(/\\/g, '/')
    .split('/')
    .some(
      (part) =>
        part === '__MACOSX' ||
        (part.startsWith('.') && part !== '.' && part !== '..'),
    );
}
