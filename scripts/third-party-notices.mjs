// Sammelt die Lizenzen aller Pakete, die mit LocalDesk ausgeliefert werden
// (dependencies aus package.json und deren Abhängigkeiten), in THIRD_PARTY_NOTICES.md.
// Aufruf: npm run notices        – Datei neu schreiben
//         npm run notices -- --check – nur prüfen, ob sie aktuell ist
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt|markdown))?$/i;

/** Pakete der Auslieferung, nach Name sortiert. */
export function collectPackages(root) {
  const found = new Map();
  const visit = (name, fromDir) => {
    const dir = resolvePackage(name, fromDir, root);
    if (!dir) return; // optionale Abhängigkeit, auf diesem System nicht installiert
    const pkg = JSON.parse(
      readFileSync(path.join(dir, 'package.json'), 'utf8'),
    );
    const key = `${pkg.name}@${pkg.version}`;
    if (found.has(key)) return;
    found.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: licenseOf(pkg),
      dir,
    });
    for (const dep of Object.keys({
      ...pkg.dependencies,
      ...pkg.optionalDependencies,
    })) {
      visit(dep, dir);
    }
  };
  const own = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const dep of Object.keys(own.dependencies ?? {})) visit(dep, root);
  return [...found.values()].sort(
    (a, b) =>
      a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  );
}

/** Wie Node ein Paket findet: node_modules im eigenen Ordner, dann darüber. */
function resolvePackage(name, fromDir, root) {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (dir === root || path.dirname(dir) === dir) return null;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses))
    return pkg.licenses.map((l) => l.type).join(' OR ');
  return 'unbekannt';
}

function licenseText(dir) {
  const files = readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f))
    .sort();
  return files
    .map((f) =>
      readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n').trim(),
    )
    .join('\n\n');
}

export function renderNotices(packages) {
  const parts = [
    '# Lizenzen von Drittanbietern',
    '',
    'LocalDesk selbst steht unter der MIT-Lizenz (siehe LICENSE). Mit LocalDesk werden die',
    'folgenden Pakete ausgeliefert. Electron und Chromium bringen ihre Lizenztexte selbst mit',
    '(LICENSE und LICENSES.chromium.html im Programmordner).',
    '',
    'Diese Datei wird mit `npm run notices` erzeugt – nicht von Hand bearbeiten.',
    '',
  ];
  for (const p of packages) {
    const text = licenseText(p.dir);
    parts.push(`## ${p.name} ${p.version}`, '', `Lizenz: ${p.license}`, '');
    parts.push(
      text
        ? ['```text', text.replace(/```/g, "'''"), '```', ''].join('\n')
        : '_Kein Lizenztext im Paket enthalten._\n',
    );
  }
  return parts.join('\n');
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = path.join(root, 'THIRD_PARTY_NOTICES.md');
  const packages = collectPackages(root);
  const content = renderNotices(packages);
  if (process.argv.includes('--check')) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== content) {
      console.error(
        'THIRD_PARTY_NOTICES.md ist veraltet – bitte „npm run notices“ ausführen.',
      );
      process.exit(1);
    }
    console.log(
      `THIRD_PARTY_NOTICES.md ist aktuell (${packages.length} Pakete).`,
    );
  } else {
    writeFileSync(target, content, 'utf8');
    const unknown = packages.filter((p) => !licenseText(p.dir));
    console.log(
      `${packages.length} Pakete, davon ${unknown.length} ohne Lizenztext.`,
    );
  }
}
