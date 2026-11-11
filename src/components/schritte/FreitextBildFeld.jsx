import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

/**
 * Optionales Bild zu einer Freitextfrage (aufgabe.bild_url, 2026-11-11).
 * Es steht bei den Schülern direkt über der Aufgabenstellung, damit sie
 * nicht im Buch nachschlagen oder zurückblättern müssen. Öffentlich
 * gespeichert, weil Schüler aus Moodle kein Konto haben.
 */
export default function FreitextBildFeld({ url, onChange }) {
  const [laedt, setLaedt] = useState(false);

  const hochladen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLaedt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Bild zur Aufgabe (optional – steht über der Aufgabenstellung)</Label>
      {url && (
        <img src={url} alt="Bild zur Aufgabe" className="max-h-48 w-auto max-w-full rounded-lg border border-border" />
      )}
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2 cursor-pointer">
          <label>
            {laedt ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {url ? 'Bild ersetzen' : 'Bild hochladen'}
            <input type="file" accept="image/*" className="hidden" onChange={hochladen} disabled={laedt} />
          </label>
        </Button>
        {url && (
          <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => onChange('')}>
            <Trash2 className="w-4 h-4" /> Entfernen
          </Button>
        )}
      </div>
    </div>
  );
}