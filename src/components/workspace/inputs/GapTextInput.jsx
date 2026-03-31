import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';

export default function GapTextInput({ value = '', onChange, placeholder = '' }) {
  const textareaRef = useRef(null);

  const handleInsertGap = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newValue = value.substring(0, start) + '[' + selectedText + ']' + value.substring(end);
      onChange(newValue);
    } else {
      const newValue = value.substring(0, start) + '[Lücke]' + value.substring(start);
      onChange(newValue);
    }

    // Fokus zurück auf Textarea
    setTimeout(() => textarea.focus(), 0);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Text mit Lücken eingeben...'}
          className="w-full px-3 py-2 rounded-lg border border-input text-sm min-h-[150px] font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleInsertGap}
        >
          [Lücke einfügen]
        </Button>
        <p className="text-xs text-muted-foreground">
          Markiere Text und klicke auf den Button, um [Klammern] hinzuzufügen.
        </p>
      </div>
      {value && (
        <div className="p-3 rounded-lg bg-slate-50 border border-border text-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Vorschau:</p>
          <p className="whitespace-pre-wrap">{value}</p>
        </div>
      )}
    </div>
  );
}