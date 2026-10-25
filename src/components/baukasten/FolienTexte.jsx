import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown } from 'lucide-react';

/** Texte einzelner Folien direkt korrigieren (Titel, Satz, Bild-Adresse). */
export default function FolienTexte({ folien, onFolien }) {
  const [offen, setOffen] = React.useState(false);
  if (!folien.length) return null;
  const setze = (i, k, w) => onFolien(folien.map((f, j) => (j === i ? { ...f, [k]: w } : f)));
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOffen(!offen)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold">
        Texte und Bilder der Folien bearbeiten <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && (
        <div className="space-y-3 border-t p-3">
          {folien.map((f, i) => (
            <div key={f.id || i} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
              <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
              <div className="space-y-1.5">
                <Input value={f.titel || ''} onChange={(e) => setze(i, 'titel', e.target.value)} placeholder="Titel" className="h-8 text-sm" />
                <Textarea rows={2} value={f.satz ?? f.text ?? ''} onChange={(e) => setze(i, f.satz !== undefined ? 'satz' : 'text', e.target.value)} placeholder="Text" className="text-sm" />
                <Input value={f.bild || ''} onChange={(e) => setze(i, 'bild', e.target.value)} placeholder="Bild-Adresse (optional)" className="h-8 text-xs" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}