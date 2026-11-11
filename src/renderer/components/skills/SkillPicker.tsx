import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ScrollText } from 'lucide-react';
import { OLLAMA_DEFAULT_CONTEXT } from '../../../shared/context';
import { fitSkillCatalog, type SkillView } from '../../../shared/skills';
import { messageLocale } from '../../../shared/messages';
import { PickerButton } from '../PickerButton';

interface SkillPickerProps {
  /** Kennungen der eingeschalteten Skills. */
  selected: string[];
  onChange: (skillIds: string[]) => void;
  /** Kontextlänge dieses Chats: Bei wenig Platz sieht das Modell nicht alle Skills. */
  contextLength?: number;
  /** Kann das gewählte Modell Werkzeuge? Sonst lädt es Skills nicht selbst. */
  modelSupportsTools?: boolean;
}

/** Häkchen-Liste der Skills – im Chat, in Vorlagen und Projekten. */
export function SkillPicker({
  selected,
  onChange,
  contextLength,
  modelSupportsTools,
}: SkillPickerProps) {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillView[] | null>(null);

  useEffect(() => {
    void window.api
      .listSkills()
      .then((result) => setSkills(result.ok ? result.value : []));
  }, []);

  if (!skills)
    return <p className="text-xs text-muted">{t('status.loading')}</p>;

  if (skills.length === 0) {
    return (
      <p className="text-xs text-muted">
        {t('skillPicker.none')}{' '}
        <Link to="/skills" className="text-accent-text underline">
          {t('skillPicker.toSkills')}
        </Link>
      </p>
    );
  }

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...selected, id] : selected.filter((s) => s !== id));

  // Skills, die das Modell selbst laden darf (nicht eingeschaltet, ohne Fehler) – passen alle in den Katalog?
  const offered = skills.filter((s) => !s.error && !selected.includes(s.id));
  const fit =
    contextLength !== undefined && modelSupportsTools !== false
      ? fitSkillCatalog(offered, contextLength)
      : null;

  return (
    <>
      {modelSupportsTools === false && (
        <p className="mb-2 text-xs text-warn">{t('skillPicker.noTools')}</p>
      )}
      {fit && fit.hidden > 0 && (
        <p className="mb-2 text-xs text-warn">
          {t('skillPicker.hidden', {
            context: (contextLength ?? OLLAMA_DEFAULT_CONTEXT).toLocaleString(
              messageLocale(),
            ),
            shown: fit.skills.length,
            total: offered.length,
          })}
        </p>
      )}
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {skills.map((skill) => (
          <li key={skill.id}>
            <label
              className={`flex items-start gap-2 rounded px-2 py-1 ${
                skill.error
                  ? 'opacity-60'
                  : 'cursor-pointer hover:bg-surface-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(skill.id)}
                disabled={Boolean(skill.error) && !selected.includes(skill.id)}
                onChange={(e) => toggle(skill.id, e.target.checked)}
                className="mt-1 accent-[var(--ld-accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{skill.name}</span>
                <span
                  className={`block line-clamp-2 text-xs ${
                    skill.error ? 'text-error' : 'text-subtle'
                  }`}
                >
                  {skill.error ??
                    (skill.description || t('skills.noDescription'))}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Schalter „Skills“ im Eingabefeld: welche Anleitungen in diesem Chat gelten. */
export function SkillsButton(props: SkillPickerProps) {
  const { t } = useTranslation();
  return (
    <PickerButton
      icon={ScrollText}
      label={t('skillPicker.button')}
      chipText={t('skillPicker.chip')}
      count={props.selected.length}
      title={t('skillPicker.title')}
      intro={t('skillPicker.intro')}
    >
      <SkillPicker {...props} />
      <Link
        to="/skills"
        className="block text-xs text-accent-text hover:underline"
      >
        {t('skillPicker.manage')}
      </Link>
    </PickerButton>
  );
}
