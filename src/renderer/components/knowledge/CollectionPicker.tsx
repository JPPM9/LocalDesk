import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Library } from 'lucide-react';
import { useCollections } from '../../hooks/useCollections';
import { PickerButton } from '../PickerButton';

interface CollectionPickerProps {
  /** IDs der gewählten Sammlungen. */
  selected: string[];
  onChange: (collectionIds: string[]) => void;
}

/** Häkchen-Liste der Wissenssammlungen – genutzt im Chat und im Vorlagen-Editor. */
export function CollectionPicker({
  selected,
  onChange,
}: CollectionPickerProps) {
  const { t } = useTranslation();
  // Projekt-Dokumente gehören zum Projekt und werden dort automatisch durchsucht.
  const collections = useCollections()?.filter((c) => !c.config.projectId);

  if (!collections)
    return <p className="text-xs text-muted">{t('status.loading')}</p>;

  if (collections.length === 0) {
    return (
      <p className="text-xs text-muted">
        {t('knowledgePicker.none')}{' '}
        <Link to="/knowledge" className="text-accent underline">
          {t('knowledgePicker.toKnowledge')}
        </Link>
      </p>
    );
  }

  const toggle = (collectionId: string, on: boolean) => {
    onChange(
      on
        ? [...selected, collectionId]
        : selected.filter((id) => id !== collectionId),
    );
  };

  return (
    <ul className="space-y-1">
      {collections.map(({ config, stats }) => (
        <li key={config.id}>
          <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-surface-hover">
            <input
              type="checkbox"
              checked={selected.includes(config.id)}
              onChange={(e) => toggle(config.id, e.target.checked)}
              className="mt-1 accent-[var(--ld-accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{config.name}</span>
              <span
                className={`block truncate text-[11px] ${
                  stats.chunks === 0 ? 'text-warn' : 'text-muted'
                }`}
              >
                {stats.chunks === 0
                  ? t('knowledgePicker.empty')
                  : t('knowledge.summary', {
                      count: stats.documents,
                      chunks: stats.chunks,
                    })}
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Wissen-Knopf im Chat-Kopf: welche Sammlungen vor jeder Antwort durchsucht werden. */
export function KnowledgeButton(props: CollectionPickerProps) {
  const { t } = useTranslation();
  return (
    <PickerButton
      icon={Library}
      label={t('knowledgePicker.button')}
      count={props.selected.length}
      title={t('knowledgePicker.title')}
      intro={t('knowledgePicker.intro')}
    >
      <CollectionPicker {...props} />
    </PickerButton>
  );
}
