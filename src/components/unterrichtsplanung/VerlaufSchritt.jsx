import React, { useState } from 'react';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import VerlaufAbschnitt from './VerlaufAbschnitt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Schritt 3: Verlauf Stunde für Stunde; im Gespräch anpassbar. */
export default function VerlaufSchritt({ planung, planen, speichern }) {
  const [wunsch, setWunsch] = useState('');
  const letzte = [...(planung.gespraech || [])].reverse().find((m) => m.role === 'assistant');
  const geaendert = planung.verlauf.some((s) => s.gewichtung && s.gewichtung !== 'passt');
  const setzeGewicht = (index, gewichtung) =>
    speichern.mutate({ verlauf: planung.verlauf.map((s, i) => (i === index ? { ...s, gewichtung } : s)) });
  const neuBerechnen = () => planen.mutate({ planung_id: planung.id, neu_berechnen: true });
  const senden = () => planen.mutate({ planung_id: planung.id, wunsch }, { onSuccess: () => setWunsch('') });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">3 · Verlauf der Einheit</h2>
        {letzte?.content && <p className="mt-1 rounded-lg bg-primary/5 p-3 text-sm">{letzte.content}</p>}
      </div>
      <ol className="space-y-2">
        {planung.verlauf.map((s, i) => (
          <VerlaufAbschnitt key={i} abschnitt={s} index={i} onGewichtung={(g) => setzeGewicht(i, g)} />
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
        <Button onClick={neuBerechnen} disabled={planen.isPending || !geaendert} size="sm" className="gap-2">
          {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Nach meinen Gewichtungen neu berechnen
        </Button>
        <span className="text-xs text-muted-foreground">
          {geaendert ? 'Kann ein bis zwei Minuten dauern.' : 'Markiere Abschnitte mit „Mehr Zeit“ oder „Weniger wichtig“.'}
        </span>
      </div>
      <div className="space-y-2">
        <Textarea
          rows={2}
          value={wunsch}
          onChange={(e) => setWunsch(e.target.value)}
          placeholder="z. B. „Für die Kommasetzung bitte mehr Zeit, dafür die Wiederholung in Stunde 6 streichen.“"
        />
        <Button onClick={senden} disabled={planen.isPending || !wunsch.trim()} size="sm" className="gap-2">
          {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Verlauf anpassen
        </Button>
      </div>
    </section>
  );
}