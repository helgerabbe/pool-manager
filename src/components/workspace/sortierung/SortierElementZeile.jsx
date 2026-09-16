/**
 * Eine Zeile der Sortierliste: Text und optional ein Bildausschnitt, der per
 * Strg+V direkt im Textfeld eingefügt wird. Sortiert wird die Zeile als Ganzes.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { elementText, elementBild, mitText, mitBild } from '@/lib/sortierElemente';

export default function SortierElementZeile({ element, index, onChange, onRemove, readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const bild = elementBild(element);

  const bildEinfuegen = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(mitBild(element, file_url));
    } catch (err) {
      toast.error(err?.message || 'Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    if (readOnly) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); bildEinfuegen(file); return; }
      }
    }
  };

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          value={elementText(element)}
          onChange={(e) => onChange(mitText(element, e.target.value))}
          onPaste={handlePaste}
          placeholder={bild ? 'Beschriftung (optional)' : `Element ${index + 1} — Text oder Bild mit Strg+V`}
          className="h-8 flex-1 text-sm"
          disabled={readOnly}
        />
        {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        {!readOnly && (
          <button
            onClick={onRemove}
            className="shrink-0 p-1 text-muted-foreground hover:text-destructive rounded"
            title="Element löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {bild ? (
        <div className="relative inline-block">
          <img src={bild} alt={`Element ${index + 1}`} className="max-h-28 w-auto rounded-md border border-border bg-card object-contain" />
          {!readOnly && (
            <button
              onClick={() => onChange(mitBild(element, ''))}
              title="Bild entfernen"
              className="absolute -top-1.5 -right-1.5 rounded-full bg-card border border-border p-0.5 text-muted-foreground hover:text-destructive shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : !readOnly && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ImagePlus className="w-3 h-3" /> Bildausschnitt mit Strg+V in das Feld einfügen
        </p>
      )}
    </div>
  );
}