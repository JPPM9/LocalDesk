import { useCallback, useEffect, useState } from 'react';
import type { SkillInput, SkillView } from '../../shared/skills';
import type { Result } from '../../shared/api';

/** Skills aus dem Skill-Ordner – `reload` liest neu (z. B. nach Änderungen von außen). */
export function useSkills() {
  const [skills, setSkills] = useState<SkillView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const result = await window.api.listSkills();
    if (result.ok) {
      setSkills(result.value);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoaded(true);
    return result;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async (input: SkillInput): Promise<Result<SkillView>> => {
    const result = await window.api.saveSkill(input);
    if (result.ok) await reload();
    return result;
  };

  const remove = async (id: string): Promise<Result<void>> => {
    const result = await window.api.deleteSkill(id);
    await reload();
    return result;
  };

  return { skills, loaded, error, reload, save, remove };
}
