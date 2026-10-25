import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Hammer } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Alle Fragen des Assistenten auf einmal, eine gemeinsame (Sprach-)Antwort. */
export default function PhasenFragen({ stand, onBauen, baut }) {
  const [antworten, setAntworten] = React.useState(stand.antworten || '');
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm">{stand.einleitung}</p>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold mb-2">Bevor ich baue, beantworte mir bitte noch folgende Fragen:</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm">{stand.fragen.map((f, i) => <li key={i}>{f}</li>)}</ol>
      </div>
      <FreitextMitSprache rows={6} value={antworten} onChange={setAntworten}
        placeholder="Zum Beispiel: Zu 1: … Zu 2: … Zu 3 weiß ich noch nicht." />
      <p className="text-xs text-muted-foreground">Was du nicht weißt, kannst du weglassen. Ich entscheide dann selbst, und du kannst es danach ändern.</p>
      <Button onClick={() => onBauen(antworten)} disabled={baut}>
        {baut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} Folien bauen
      </Button>
    </div>
  );
}