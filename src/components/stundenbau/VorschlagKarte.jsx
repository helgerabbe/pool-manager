import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Loader2, Undo2 } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Eine Entscheidung: Vorschlag, „Anders“ per Sprache, der Assistent passt den Vorschlag sofort an. */
export default function VorschlagKarte({ nr, f, onAnpassen, onZurueck }) {
  const [offen, setOffen] = React.useState(false);
  const [wunsch, setWunsch] = React.useState('');
  const [laedt, setLaedt] = React.useState(false);
  const uebernehmen = async () => { setLaedt(true); try { await onAnpassen(wunsch); setOffen(false); setWunsch(''); } finally { setLaedt(false); } };
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-sm font-semibold">{nr}. {f.frage}</p>
      <p className="text-sm rounded-md bg-muted/50 px-3 py-2"><span className="text-xs text-muted-foreground">{f.vorher ? 'Neuer Vorschlag: ' : 'Vorschlag: '}</span>{f.vorschlag}</p>
      {offen ? (
        <div className="space-y-1">
          <FreitextMitSprache rows={2} value={wunsch} onChange={setWunsch} placeholder="Sag oder schreib, wie es stattdessen sein soll." />
          <div className="flex gap-2">
            <Button size="sm" onClick={uebernehmen} disabled={laedt || !wunsch.trim()}>{laedt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Übernehmen</Button>
            <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-green-700"><Check className="h-3.5 w-3.5" /> Passt so</span>
          {f.vorher && <Button size="sm" variant="ghost" onClick={onZurueck}><Undo2 className="h-3.5 w-3.5" /> Doch den vorherigen Vorschlag nehmen</Button>}
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOffen(true)}><Pencil className="h-3.5 w-3.5" /> Anders</Button>
        </div>
      )}
    </div>
  );
}