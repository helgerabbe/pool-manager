/**
 * AufgabenstellungBilderFeld.jsx
 *
 * Mehrere Bilder zur Aufgabenstellung: per Strg+V aus der Zwischenablage
 * eingefügt oder als Datei ausgewählt. Kontrolliert — der Wert ist ein Array
 * von URLs und wird über onChange nach oben gegeben; gespeichert wird mit dem
 * Eltern-Formular (field_values).
 */

import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ImagePlus, X, Clipboard } from 'lucide-react';
import { toast } from 'sonner';

export default function AufgabenstellungBilderFeld({ value = [], onChange, disabled = false }) {
  const bilder = Array.isArray(value) ? value : [];
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const hochladen = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('Bitte ein Bild einfügen oder auswählen.');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...bilder, file_url]);
    } catch (err) {
      toast.error(err?.message || 'Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); hochladen(file); return; }
      }
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={disabled ? -1 : 0}
      className={`rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2 focus:outline-none focus:ring-1 focus:ring-ring ${disabled ? 'opacity-60' : ''}`}
    >
      {bilder.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bilder.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt={`Bild ${i + 1}`} className="h-24 w-auto rounded-md border border-border bg-card object-contain" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(bilder.filter((_, idx) => idx !== i))}
                  title="Bild entfernen"
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-card border border-border p-0.5 text-muted-foreground hover:text-destructive shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) hochladen(f); e.target.value = ''; }}
        className="hidden"
        disabled={disabled}
      />

      {uploading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Bild wird hochgeladen…
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clipboard className="w-3.5 h-3.5" />
            Bild hier <strong className="font-semibold text-foreground">einfügen (Strg+V)</strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="gap-1.5 text-xs h-7 ml-auto"
          >
            <ImagePlus className="w-3.5 h-3.5" /> oder Bild auswählen
          </Button>
        </div>
      )}
    </div>
  );
}