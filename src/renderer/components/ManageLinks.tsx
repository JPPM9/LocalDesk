import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

/** Wege zu Wissen, Skills und E-Mail – sie stehen nicht mehr in der Seitenleiste. */
export function ManageLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      {(
        [
          ['/knowledge', 'palette.manageKnowledge'],
          ['/skills', 'palette.manageSkills'],
          ['/mail', 'palette.manageMail'],
        ] as const
      ).map(([to, key]) => (
        <Link key={to} to={to} onClick={onNavigate} className="btn btn-quiet">
          {t(key)}
        </Link>
      ))}
    </div>
  );
}
