import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Schritt 3: Verlauf Stunde für Stunde; im Gespräch anpassbar. */
export default function VerlaufSchritt({ planung, planen }) {
  const [wunsch, setWunsch] = useState('');
  const letzte = [...(planung.gespraech || [])].reverse().find((m) => m.role === 'assistant');
  const senden = () => planen.mutate({ planung_id: planung.id, wunsch }, { onSuccess: () => setWunsch('') });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">3 · Verlauf der Einheit</h2>
        {letzte?.content && <p className="mt-1 rounded-lg bg-primary/5 p-3 text-sm">{letzte.content}</p>}
      </div>
      <ol className="space-y-2">
        {planung.verlauf.map((s) => (
          <li key={s.nr} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Stunde {s.nr}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {s.art === 'doppel' ? 'Doppelstunde' : 'Einzelstunde'} · {s.minuten} Min.
              </span>
            </div>
            <p className="text-sm font-semibold">{s.titel}</p>
            <p className="text-xs text-foreground/80">{s.lernziel}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.vorschlag}</p>
          </li>
        ))}
      </ol>
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