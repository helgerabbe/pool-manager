/**
 * Materialien einer Stunden-Phase: Liste hochgeladener Dateien (Arbeitsblatt-Scan,
 * PDF, Bild, Audio, Video) mit Upload und Entfernen. Speichert nicht selbst.
 */
import React, { useState } from 'react';
import MaterialDateiFeld from '@/components/allgemeineAufgaben/MaterialDateiFeld';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Paperclip } from 'lucide-react';

export default function StundenPhaseMaterialListe({ materialien = [], onChange, disabled = false }) {
  const [neuerName, setNeuerName] = useState('');

  const hinzufuegen = (url) => {
    if (!url) return;
    onChange([...materialien, { url, name: neuerName.trim() || 'Material' }]);
    setNeuerName('');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" /> Materialien dieser Phase
      </Label>

      {materialien.length > 0 && (
        <ul className="space-y-1.5">
          {materialien.map((m, i) => (
            <li key={`${m.url}-${i}`} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate">
                {m.name || 'Material'}
              </a>
              {!disabled && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-6 w-6 shrink-0"
                  title="Material entfernen"
                  onClick={() => onChange(materialien.filter((_, idx) => idx !== i))}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="space-y-2">
          <Input
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            placeholder="Bezeichnung des Materials (z. B. Arbeitsblatt 1)"
          />
          <MaterialDateiFeld value="" onChange={hinzufuegen} materialTyp="bild" />
        </div>
      )}
    </div>
  );
}