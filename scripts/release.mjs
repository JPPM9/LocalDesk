// Bereitet ein Release vor: prüfen, bauen, Dateien und Notizen kontrollieren.
//   npm run release              → alles vorbereiten, NICHTS veröffentlichen
//   npm run release -- --publish → zusätzlich als GitHub-Release hochladen (gh)
// Veröffentlichen ist nicht rückgängig zu machen – nur nach ausdrücklicher Freigabe.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  changelogSection,
  parseLatestYml,
  sha512Base64,
  VERSION_PATTERN,
} from './release-lib.mjs';

const REPO = 'JPPM9/LocalDesk';
const BRANCH = 'master';
const root = path.resolve(import.meta.dirname, '..');
const installerDir = path.join(root, 'out', 'installer');
const publish = process.argv.includes('--publish');

// Nur npm braucht unter Windows die Shell (npm.cmd). git und gh laufen ohne – sonst
// würden Argumente mit Leerzeichen (Titel, Pfade) auseinandergerissen. An npm geben
// wir nur feste Wörter ohne Leerzeichen.
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: cmd === 'npm' && process.platform === 'win32',
    ...options,
  });
const step = (text) => console.log(`\n▶ ${text}`);
const fail = (text) => {
  console.error(`\n✖ ${text}`);
  process.exit(1);
};

const { version } = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const tag = `v${version}`;
console.log(
  `LocalDesk ${version} – ${publish ? 'Release VERÖFFENTLICHEN' : 'Probelauf (nichts wird veröffentlicht)'}`,
);

step('Version und Änderungen');
if (!VERSION_PATTERN.test(version))
  fail(`Ungültige Version „${version}“ in package.json.`);
const notes = changelogSection(
  readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'),
  version,
);
if (!notes) fail(`CHANGELOG.md hat keinen Abschnitt „## ${version} – …“.`);
console.log(`  CHANGELOG.md: Abschnitt für ${version} gefunden.`);

step('Git-Stand');
if (run('git', ['status', '--porcelain']).trim()) {
  fail('Es gibt nicht eingecheckte Änderungen – erst committen.');
}
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (branch !== BRANCH)
  fail(`Releases nur von „${BRANCH}“ (gerade: „${branch}“).`);
run('git', ['fetch', '--quiet', 'origin', BRANCH]);
const head = run('git', ['rev-parse', 'HEAD']).trim();
if (head !== run('git', ['rev-parse', `origin/${BRANCH}`]).trim()) {
  fail('Lokaler Stand und GitHub unterscheiden sich – erst pushen bzw. holen.');
}
if (run('git', ['tag', '--list', tag]).trim())
  fail(`Tag ${tag} gibt es schon – Version erhöhen.`);
try {
  run('gh', ['release', 'view', tag, '--repo', REPO], { stdio: 'pipe' });
  fail(`Auf GitHub gibt es schon ein Release ${tag} – Version erhöhen.`);
} catch (error) {
  // „release not found“ ist hier der gute Fall; andere Fehler (gh fehlt, offline) stoppen.
  const message = String(error.stderr ?? error.message);
  if (!/not found/i.test(message))
    fail(`GitHub nicht erreichbar: ${message.trim()}`);
}
console.log(
  `  Sauber, auf ${BRANCH} = GitHub (${head.slice(0, 7)}), ${tag} noch frei.`,
);

step('Prüfungen (Typen, Lint, Tests)');
run('npm', ['run', 'typecheck'], { stdio: 'inherit' });
run('npm', ['run', 'lint'], { stdio: 'inherit' });
run('npm', ['test'], { stdio: 'inherit' });

step('Bauen (npm run dist)');
run('npm', ['run', 'dist'], { stdio: 'inherit' });

step('Installer-Dateien kontrollieren');
const latestPath = path.join(installerDir, 'latest.yml');
if (!existsSync(latestPath)) fail('out/installer/latest.yml fehlt.');
const latest = parseLatestYml(readFileSync(latestPath, 'utf8'));
if (latest.version !== version) {
  fail(`latest.yml nennt Version ${latest.version}, package.json ${version}.`);
}
const setupPath = path.join(installerDir, latest.path ?? '');
const blockmapPath = `${setupPath}.blockmap`;
if (!latest.path || !existsSync(setupPath))
  fail(`Installer ${latest.path} fehlt.`);
if (!existsSync(blockmapPath)) fail(`${path.basename(blockmapPath)} fehlt.`);
if (sha512Base64(readFileSync(setupPath)) !== latest.sha512) {
  fail('Prüfsumme in latest.yml passt nicht zum Installer.');
}
const notesPath = path.join(installerDir, 'release-notes.md');
writeFileSync(notesPath, `${notes}\n`);
console.log(`  ${latest.path} – Prüfsumme stimmt.`);
console.log(`  Release-Notizen: out/installer/release-notes.md`);

const files = [setupPath, blockmapPath, latestPath];
const ghArgs = [
  'release',
  'create',
  tag,
  ...files,
  '--repo',
  REPO,
  '--target',
  head,
  '--title',
  `LocalDesk ${version}`,
  '--notes-file',
  notesPath,
];

if (!publish) {
  step('Fertig – nichts veröffentlicht');
  console.log(
    '  Veröffentlichen (erst nach Freigabe): npm run release -- --publish',
  );
  console.log(
    `  Das führt aus: gh ${ghArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`,
  );
  process.exit(0);
}

step(`Veröffentlichen als ${tag} auf ${REPO}`);
run('gh', ghArgs, { stdio: 'inherit' });
run('git', ['fetch', '--quiet', '--tags', 'origin']);
console.log(
  `\n✔ Release ${tag} veröffentlicht: https://github.com/${REPO}/releases/tag/${tag}`,
);
