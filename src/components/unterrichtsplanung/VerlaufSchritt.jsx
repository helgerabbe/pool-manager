import React, { useState } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';
import VerlaufAbschnitt from './VerlaufAbschnitt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/** Schritt 3: didaktischer Verlauf (ohne Zeit); im Gespräch anpassbar. */
export default function VerlaufSchritt({ planung, planen, speichern }) {
  const [wunsch, setWunsch] = useState('');
  const letzte = [...(planung.gespraech || [])].reverse().find((m) => m.role === 'assistant');
  const entfernen = (index) => {
    if (!window.confirm('Diesen Abschnitt aus dem Verlauf streichen?')) return;
    speichern.mutate({ verlauf: planung.verlauf.filter((_, i) => i !== index).map((s, i) => ({ ...s, nr: i + 1 })) });
  };
  const senden = () => planen.mutate({ planung_id: planung.id, wunsch }, { onSuccess: () => setWunsch('') });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">3 · Verlauf der Einheit</h2>
        <p className="text-xs text-muted-foreground">Die didaktische Abfolge — die Zeit planst du im nächsten Schritt.</p>
        {letzte?.content && <p className="mt-2 rounded-lg bg-primary/5 p-3 text-sm">{letzte.content}</p>}
      </div>
      <ol className="space-y-2">
        {planung.verlauf.map((s, i) => (
          <VerlaufAbschnitt key={i} abschnitt={s} index={i}>
            <Button variant="ghost" size="sm" onClick={() => entfernen(i)} className="mt-1 gap-1 text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Abschnitt streichen
            </Button>
          </VerlaufAbschnitt>
        ))}
      </ol>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Wünsche zum Verlauf</span>
          <SpeechInputButton value={wunsch} onResult={setWunsch} maxSeconds={60} label="Spracheingabe" />
        </div>
        <Textarea rows={2} value={wunsch} onChange={(e) => setWunsch(e.target.value)} placeholder="z. B. „Bitte vor der Überprüfung noch eine Vertiefung einbauen.“" />
        <Button onClick={senden} disabled={planen.isPending || !wunsch.trim()} size="sm" className="gap-2">
          {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Verlauf anpassen
        </Button>
      </div>
    </section>
  );
}