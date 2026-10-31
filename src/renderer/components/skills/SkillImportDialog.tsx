import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Upload } from 'lucide-react';
import type {
  SkillCandidateView,
  SkillImportPreview,
} from '../../../shared/skill-import';
import { skillDescriptionHint, type SkillView } from '../../../shared/skills';
import { formatBytes } from '../../utils/format';
import { messageLocale } from '../../../shared/messages';
import { SkillFindings } from './SkillFindings';

interface SkillImportDialogProps {
  /** Dateien, die schon abgelegt wurden (leer = der Dialog wartet auf Dateien). */
  initialFiles: File[];
  onClose: () => void;
  /** Nach dem Hinzufügen: die neuen Skills. */
  onInstalled: (skills: SkillView[]) => void;
}

const hasWarning = (c: SkillCandidateView) =>
  c.findings.some((f) => f.severity === 'warn');

/**
 * „Skill hinzufügen“: Dateien ablegen (.md, .zip, .skill) → Vorschau mit
 * Sicherheitsprüfung → Auswahl → Hinzufügen. Vorher wird nichts gespeichert.
 */
export function SkillImportDialog({
  initialFiles,
  onClose,
  onInstalled,
}: SkillImportDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'checking' | 'adding' | null>(null);
  const [preview, setPreview] = useState<SkillImportPreview | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [read, setRead] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const check = async (files: File[]) => {
    if (files.length === 0 || busy) return;
    setBusy('checking');
    setError(null);
    setFailed([]);
    try {
      const sent = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      const result = await window.api.inspectSkillFiles(sent);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result.value);
      // Vorausgewählt: alles ohne Fehler und ohne Warnung – Auffälliges wählst du selbst.
      setPicked(
        new Set(
          result.value.candidates
            .filter((c) => !c.error && !hasWarning(c))
            .map((c) => c.index),
        ),
      );
      setRead(new Set());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(null);
    }
  };

  // Dateien, die schon auf die Seite gezogen wurden, gleich prüfen.
  useEffect(() => {
    if (initialFiles.length > 0) void check(initialFiles);
    // Nur beim Öffnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (set: Set<number>, index: number) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  };

  const ready = preview
    ? [...picked].filter((index) => {
        const candidate = preview.candidates[index];
        return candidate && (!hasWarning(candidate) || read.has(index));
      })
    : [];
  const blocked = picked.size > ready.length;

  const add = async () => {
    if (!preview || ready.length === 0 || busy) return;
    setBusy('adding');
    setError(null);
    const result = await window.api.installSkills(preview.importId, ready);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.value.failed.length > 0) setFailed(result.value.failed);
    if (result.value.installed.length > 0) onInstalled(result.value.installed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-import-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOver(false);
          void check([...event.dataTransfer.files]);
        }}
      >
        <h2 id="skill-import-title" className="font-semibold">
          {t('skills.import.title')}
        </h2>
        <p className="text-sm text-muted">{t('skills.import.intro')}</p>

        {!preview && (
          <>
            <div
              onDragEnter={() => setOver(true)}
              onDragLeave={() => setOver(false)}
              className={`grid place-items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted ${
                over ? 'border-accent bg-accent-soft' : 'border-border'
              }`}
            >
              {busy === 'checking' ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={16} className="animate-spin" />
                  {t('skills.import.checking')}
                </span>
              ) : (
                <>
                  <Upload size={20} />
                  <span>{t('skills.import.drop')}</span>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-text hover:bg-surface-hover"
                  >
                    {t('skills.import.choose')}
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".md,.zip,.skill"
                className="hidden"
                onChange={(event) => {
                  void check([...(event.target.files ?? [])]);
                  event.target.value = '';
                }}
              />
            </div>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
              <li>{t('skills.import.formatMd')}</li>
              <li>{t('skills.import.formatZip')}</li>
              <li>{t('skills.import.noScripts')}</li>
            </ul>
          </>
        )}

        {preview && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {preview.notices.map((notice, index) => (
              <p
                key={index}
                className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs"
              >
                {notice}
              </p>
            ))}
            {preview.candidates.length === 0 && (
              <p className="text-sm text-muted">{t('skills.import.none')}</p>
            )}
            {preview.candidates.map((candidate) => (
              <article
                key={candidate.index}
                className="space-y-2 rounded-xl border border-border bg-bg px-4 py-3"
              >
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={picked.has(candidate.index)}
                    disabled={!!candidate.error}
                    onChange={() => setPicked(toggle(picked, candidate.index))}
                    className="mt-1 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{candidate.name}</span>
                    <span className="block truncate text-xs text-subtle">
                      {candidate.source}
                    </span>
                  </span>
                </label>
                {candidate.error ? (
                  <p className="rounded border border-error/40 bg-error/10 px-2.5 py-1.5 text-xs text-error">
                    {candidate.error}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      {candidate.description || t('skills.noDescription')}
                    </p>
                    <p className="text-xs text-subtle">
                      {t('skills.import.size', {
                        tokens:
                          candidate.tokens.toLocaleString(messageLocale()),
                        chars:
                          candidate.bodyLength.toLocaleString(messageLocale()),
                      })}
                      {candidate.files.length > 0 &&
                        ` · ${t('skills.import.files', { count: candidate.files.length })}`}
                    </p>
                    {candidate.duplicate && (
                      <p className="text-xs text-warn">
                        {t('skills.import.duplicate')}
                      </p>
                    )}
                    {skillDescriptionHint(candidate.description) && (
                      <p className="text-xs text-warn">
                        {t(
                          skillDescriptionHint(candidate.description) ===
                            'missing'
                            ? 'skills.descMissing'
                            : 'skills.descShort',
                        )}
                      </p>
                    )}
                    <SkillFindings findings={candidate.findings} />
                    {candidate.files.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer select-none text-muted">
                          {t('skills.import.files', {
                            count: candidate.files.length,
                          })}
                        </summary>
                        <ul className="mt-1 space-y-0.5 font-mono">
                          {candidate.files.map((file) => (
                            <li key={file.path} className="flex gap-3">
                              <span className="min-w-0 flex-1 truncate">
                                {file.path}
                              </span>
                              <span className="text-subtle">
                                {formatBytes(file.size)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {candidate.skipped.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer select-none text-muted">
                          {t('skills.import.skipped', {
                            count: candidate.skipped.length,
                          })}
                        </summary>
                        <ul className="mt-1 space-y-0.5">
                          {candidate.skipped.map((file) => (
                            <li key={file.path}>
                              <span className="font-mono">{file.path}</span> –{' '}
                              {file.reason}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer select-none text-muted">
                        {t('skills.import.showText')}
                      </summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-border bg-surface p-2 font-mono text-[12px]">
                        {candidate.bodyPreview}
                        {candidate.bodyLength > candidate.bodyPreview.length &&
                          `\n\n${t('skills.import.cut', {
                            count:
                              candidate.bodyLength.toLocaleString(
                                messageLocale(),
                              ),
                          })}`}
                      </pre>
                    </details>
                    {hasWarning(candidate) && (
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={read.has(candidate.index)}
                          onChange={() =>
                            setRead(toggle(read, candidate.index))
                          }
                          className="accent-accent"
                        />
                        {t('skills.import.ack')}
                      </label>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        {failed.map((message, index) => (
          <p
            key={index}
            className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
          >
            {message}
          </p>
        ))}

        <div className="flex items-center justify-end gap-2 pt-1">
          {preview && blocked && (
            <span className="mr-auto text-xs text-muted">
              {t('skills.import.needAck')}
            </span>
          )}
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFailed([]);
              }}
              className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
            >
              {t('skills.import.other')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm hover:bg-surface-hover"
          >
            {t('dialog.cancel')}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => void add()}
              disabled={ready.length === 0 || blocked || busy !== null}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'adding' && (
                <LoaderCircle size={15} className="animate-spin" />
              )}
              {t('skills.import.add', { count: ready.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
