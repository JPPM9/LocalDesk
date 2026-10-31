import { useTranslation } from 'react-i18next';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { SkillFinding } from '../../../shared/skill-import';

/**
 * Ergebnis der Sicherheitsprüfung eines Skills: Warnungen zuerst. Die Prüfung ist
 * eine Heuristik – das steht immer dabei, damit „keine Auffälligkeiten“ nicht als
 * „sicher“ gelesen wird.
 */
export function SkillFindings({ findings }: { findings: SkillFinding[] }) {
  const { t } = useTranslation();
  const sorted = [...findings].sort(
    (a, b) => Number(b.severity === 'warn') - Number(a.severity === 'warn'),
  );
  return (
    <div className="space-y-1 text-xs">
      <p className="flex items-center gap-1.5 font-medium">
        {findings.some((f) => f.severity === 'warn') ? (
          <ShieldAlert size={13} className="text-warn" />
        ) : (
          <ShieldCheck size={13} className="text-ok" />
        )}
        {t('skills.scan.title')}
      </p>
      {findings.length === 0 && (
        <p className="text-muted">{t('skills.scan.ok')}</p>
      )}
      <ul className="space-y-0.5">
        {sorted.map((finding, index) => (
          <li
            key={index}
            className={
              finding.severity === 'warn'
                ? 'rounded border border-warn/40 bg-warn/10 px-2 py-1'
                : 'px-2 py-0.5 text-muted'
            }
          >
            {finding.message}
          </li>
        ))}
      </ul>
      <p className="text-subtle">{t('skills.scan.note')}</p>
    </div>
  );
}
