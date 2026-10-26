import { useCallback, useEffect, useState } from 'react';
import type { ChatTemplate, TemplateInput } from '../../shared/api';

/** Alle Vorlagen, alphabetisch. */
export function useTemplates() {
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setTemplates(await window.api.listTemplates());
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: TemplateInput) => {
      const result = await window.api.saveTemplate(input);
      await refresh();
      return result;
    },
    [refresh],
  );

  const remove = useCallback(
    async (templateId: string) => {
      await window.api.deleteTemplate(templateId);
      await refresh();
    },
    [refresh],
  );

  return { templates, loaded, refresh, save, remove };
}
