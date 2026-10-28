import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { PickerButton } from '../PickerButton';
import { McpServerPicker } from './McpServerPicker';

interface McpButtonProps {
  selected: string[];
  onChange: (serverIds: string[]) => void;
  modelSupportsTools: boolean | undefined;
}

/**
 * MCP-Button im Chat-Kopf (wie bei LocalAI): zeigt, wie viele Server dieser Chat
 * nutzt, und öffnet die Auswahl.
 */
export function McpButton({
  selected,
  onChange,
  modelSupportsTools,
}: McpButtonProps) {
  const { t } = useTranslation();
  return (
    <PickerButton
      icon={Plug}
      label={t('mcpPicker.button')}
      chipText={t('mcpPicker.chip')}
      count={selected.length}
      title={t('mcpPicker.title')}
      intro={t('mcpPicker.intro')}
    >
      <McpServerPicker
        selected={selected}
        onChange={onChange}
        modelSupportsTools={modelSupportsTools}
      />
    </PickerButton>
  );
}
