// Nach dem Signieren (SignPath): aus dem signierten Installer die Release-Dateien machen.
//   node scripts/finalize-signed.mjs <signierter-Installer.exe> <Ausgabeordner>
// Schreibt latest.yml (neue Prüfsumme!), release-notes.md und kopiert den Installer dorthin.
// Eine .blockmap gibt es bewusst nicht: Die des unsignierten Installers würde nicht mehr passen;
// ohne sie lädt der Update-Knopf den Installer vollständig (statt nur die Unterschiede).
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  changelogSection,
  latestYml,
  sha512Base64,
  SIGNING_NOTE,
  VERSION_PATTERN,
} from './release-lib.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [installer, outDir] = process.argv.slice(2);
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};
if (!installer || !outDir)
  fail(
    'Aufruf: node scripts/finalize-signed.mjs <Installer.exe> <Ausgabeordner>',
  );

const version = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
).version;
if (!VERSION_PATTERN.test(version)) fail(`Ungültige Version: ${version}`);
const fileName = path.basename(installer);
if (fileName !== `LocalDesk-Setup-${version}.exe`)
  fail(
    `Der Installer heißt ${fileName}, erwartet LocalDesk-Setup-${version}.exe.`,
  );

const notes = changelogSection(
  readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'),
  version,
);
if (!notes) fail(`In CHANGELOG.md fehlt der Abschnitt „## ${version}“.`);

mkdirSync(outDir, { recursive: true });
copyFileSync(installer, path.join(outDir, fileName));
const bytes = readFileSync(installer);
writeFileSync(
  path.join(outDir, 'latest.yml'),
  latestYml({
    version,
    fileName,
    sha512: sha512Base64(bytes),
    size: statSync(installer).size,
    releaseDate: new Date().toISOString(),
  }),
);
writeFileSync(
  path.join(outDir, 'release-notes.md'),
  `${notes}\n\n---\n${SIGNING_NOTE}\n`,
);
console.log(`✔ ${fileName}, latest.yml und release-notes.md in ${outDir}`);
