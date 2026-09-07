/**
 * KiBilderSammlung.jsx
 *
 * Bilder, die die KI in den Foliensatz einbauen darf. Ohne Bezeichnung nützt
 * ein Bild nichts — die KI sieht es nicht, sie liest nur, was draufsteht.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function KiBilderSammlung({ bilder, onAdd, onRemove, disabled }) {
  const fileRef = useRef(null);
  const [laedt, setLaedt] = useState(false);

  const hochladen = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('Bitte eine Bilddatei auswählen.');
      return;
    }
    setLaedt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onAdd({ url: file_url, label: file.name.replace(/\.[^.]+$/, '') });
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Bilder für die Folien {bilder.length > 0 && `(${bilder.length})`}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          disabled={disabled || laedt}
          onClick={() => fileRef.current?.click()}
        >
          {laedt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          Bild hochladen
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) hochladen(f); e.target.value = ''; }}
      />
      {bilder.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ohne Bilder baut die KI reine Textfolien. Lade Bilder hoch und beschreibe im Gespräch, wo sie hingehören.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bilder.map((b) => (
            <div key={b.url} className="relative w-16 group">
              <img src={b.url} alt={b.label} className="w-16 h-12 object-cover rounded border border-border" />
              <input
                value={b.label}
                onChange={(e) => { onRemove(b.url); onAdd({ url: b.url, label: e.target.value }); }}
                placeholder="Bezeichnung"
                className="mt-0.5 w-full text-[10px] px-1 py-0.5 rounded border border-border bg-background"
              />
              <button
                type="button"
                onClick={() => onRemove(b.url)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="Bild entfernen"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}