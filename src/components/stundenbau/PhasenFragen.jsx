import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Hammer, Check, Pencil } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Entscheidungen mit Vorschlag des Assistenten: „Passt so“ oder per (Sprach-)Eingabe ändern. */
export default function PhasenFragen({ stand, onBauen, baut }) {
  const [anders, setAnders] = React.useState({});
  const fragen = stand.fragen || [];
  const bauen = () => onBauen(fragen.map((f, i) => `${i + 1}. ${f.frage} → ${anders[i]?.trim() || f.vorschlag}`).join('\n'));
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-sm">{stand.einleitung}</p>
      <p className="text-sm font-semibold">Meine Vorschläge – passt alles, oder möchtest du etwas anders?</p>
      {fragen.map((f, i) => (
        <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
          <p className="text-sm font-semibold">{i + 1}. {f.frage}</p>
          <p className="text-sm rounded-md bg-muted/50 px-3 py-2"><span className="text-xs text-muted-foreground">Vorschlag: </span>{f.vorschlag}</p>
          {anders[i] === undefined ? (
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-green-700"><Check className="h-3.5 w-3.5" /> Passt so</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAnders({ ...anders, [i]: '' })}><Pencil className="h-3.5 w-3.5" /> Anders</Button>
            </div>
          ) : (
            <div className="space-y-1">
              <FreitextMitSprache rows={2} value={anders[i]} onChange={(v) => setAnders({ ...anders, [i]: v })} placeholder="Sag oder schreib, wie es stattdessen sein soll." />
              <Button size="sm" variant="ghost" onClick={() => { const n = { ...anders }; delete n[i]; setAnders(n); }}>Doch den Vorschlag nehmen</Button>
            </div>
          )}
        </div>
      ))}
      <Button onClick={bauen} disabled={baut}>{baut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} Folien damit füllen</Button>
    </div>
  );
}