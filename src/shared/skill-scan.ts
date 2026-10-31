import { tr } from './messages';
import type { SkillFinding, SkippedFile } from './skill-import';

/**
 * Sicherheitsprüfung für fremde Skills. Eine Heuristik: Sie sucht nach auffälligen
 * Mustern und zeigt sie an – sie ist KEIN Beweis, dass ein Skill harmlos ist.
 * Ein Skill ist nur Text; die Gefahr ist, dass er das Modell zu etwas überredet.
 */

const SNIPPET_MAX = 80;
const HOSTS_MAX = 8;

/** Unsichtbare Zeichen und solche, die die Leserichtung umkehren oder Text verstecken (Unicode-Tags). */
const HIDDEN = /[​-‏‪-‮⁠-⁤⁦-⁩﻿\u{E0000}-\u{E007F}]/u;

/** Sätze, die dem Modell andere Regeln aufdrängen wollen. */
const OVERRIDE: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|guidelines)\b/i,
  /\b(reveal|show|print|repeat|leak)\b[^.\n]{0,30}\b(system prompt|hidden instructions)\b/i,
  /\byou are now\b[^.\n]{0,40}\b(dan|jailbroken|unrestricted|developer mode)\b/i,
  /(ignoriere|vergiss|missachte|überschreibe)[^.\n]{0,40}(vorherigen|bisherigen|obigen|früheren|alle)[^.\n]{0,30}(anweisungen|regeln|vorgaben|instruktionen)/i,
];

/** Befehle, die auf dem PC etwas laden, ausführen oder löschen würden. */
const COMMANDS: RegExp[] = [
  /\b(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^\n|]{0,200}\|\s*(sh|bash|zsh|iex|invoke-expression|powershell|pwsh)\b/i,
  /\b(invoke-expression|iex)\b/i,
  /(^|\s)-(encodedcommand|enc)\b/i,
  /\brm\s+-[a-z]*r[a-z]*f\b|\brm\s+-[a-z]*f[a-z]*r\b/i,
  /\bremove-item\b[^\n]*-recurse[^\n]*-force|\bremove-item\b[^\n]*-force[^\n]*-recurse/i,
  /\bformat\s+[a-z]:/i,
  /\b(certutil|bitsadmin)\b[^\n]*(urlcache|transfer)/i,
  /\breg\s+(add|delete)\b/i,
  /\bschtasks\b[^\n]*\/create/i,
  /\bdel\s+\/[fqs]\b/i,
  /\bnet\s+user\b/i,
];

const BASE64 = /[A-Za-z0-9+/]{200,}={0,2}/;

/** „schick … Passwort“ und Ähnliches. */
const SECRETS =
  /(?<![\p{L}\p{N}])(send|upload|post|e-?mail|mail|forward|exfiltrate|schick\w*|send\w*|übermittle\w*|hochlad\w*)(?![\p{L}\p{N}])[^.\n]{0,80}(?<![\p{L}\p{N}])(passwords?|passwort|passwörter|api[ -]?keys?|secrets?|tokens?|credentials?|zugangsdaten|private keys?|ssh keys?)(?![\p{L}\p{N}])/iu;

const URL_HOST = /https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi;

const snippet = (text: string) =>
  text.replace(/\s+/g, ' ').trim().slice(0, SNIPPET_MAX);

/**
 * Prüft Anleitung und Zusatzdateien eines Skills. `skipped` sind die Dateien, die
 * nicht übernommen werden (Skripte u. a.) – Skripte erscheinen als Hinweis.
 */
export function scanSkillFiles(
  files: { path: string; text: string }[],
  skipped: SkippedFile[] = [],
): SkillFinding[] {
  const findings: SkillFinding[] = [];
  const hosts = new Set<string>();

  for (const file of files) {
    const text = file.text.replace(/^﻿/, '');
    const where = file.path;

    if (HIDDEN.test(text)) {
      findings.push({
        severity: 'warn',
        message: tr('scan.hidden', { where }),
      });
    }
    const override = OVERRIDE.map((re) => re.exec(text)).find(Boolean);
    if (override) {
      findings.push({
        severity: 'warn',
        message: tr('scan.override', { where, text: snippet(override[0]) }),
      });
    }
    const command = COMMANDS.map((re) => re.exec(text)).find(Boolean);
    if (command) {
      findings.push({
        severity: 'warn',
        message: tr('scan.command', { where, text: snippet(command[0]) }),
      });
    }
    if (BASE64.test(text)) {
      findings.push({
        severity: 'warn',
        message: tr('scan.base64', { where }),
      });
    }
    const secret = SECRETS.exec(text);
    if (secret) {
      findings.push({
        severity: 'warn',
        message: tr('scan.secrets', { where, text: snippet(secret[0]) }),
      });
    }
    for (const match of text.matchAll(URL_HOST)) {
      hosts.add(match[1].toLowerCase());
    }
  }

  if (hosts.size > 0) {
    const list = [...hosts].sort();
    findings.push({
      severity: 'info',
      message: tr('scan.urls', {
        hosts:
          list.slice(0, HOSTS_MAX).join(', ') +
          (list.length > HOSTS_MAX ? ` (+${list.length - HOSTS_MAX})` : ''),
      }),
    });
  }
  const programs = skipped.filter(
    (s) => s.reason === tr('skills.import.skipScript'),
  );
  if (programs.length > 0) {
    findings.push({
      severity: 'info',
      message: tr('scan.skipped', {
        count: programs.length,
        names: programs
          .slice(0, 5)
          .map((s) => s.path)
          .join(', '),
      }),
    });
  }
  return findings;
}
