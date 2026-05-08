/**
 * NomenklaturDefinitionRow.jsx
 *
 * Eine einzelne Zeile im Definitionen-Grid (Begriff + Konvention + Lösch-Icon).
 * Schmal gehalten, damit sie sich später in eine Drag&Drop-Liste einbetten
 * lässt, falls wir Sortierung anbieten wollen.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default function NomenklaturDefinitionRow({
  definition,
  index,
  onChange,
  onRemove,
  disabled,
  autoFocusKey,
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
      <Input
        value={definition.key}
        onChange={(e) => onChange(index, { ...definition, key: e.target.value })}
        placeholder="z.B. Y-Achsenabschnitt"
        disabled={disabled}
        autoFocus={autoFocusKey}
        maxLength={200}
      />
      <Input
        value={definition.value}
        onChange={(e) => onChange(index, { ...definition, value: e.target.value })}
        placeholder="z.B. Variable n (nicht b)"
        disabled={disabled}
        maxLength={200}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        disabled={disabled}
        title="Eintrag entfernen"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}