import React, { useState } from 'react';
import { Loader2, Send, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import NeuStartenLeiste from './NeuStartenLeiste';
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
  const verschieben = (i, d) => {
    const v = [...planung.verlauf];
    [v[i], v[i + d]] = [v[i + d], v[i]];
    speichern.mutate({ verlauf: v.map((s, n) => ({ ...s, nr: n + 1 })) });
  };
  const senden = () => planen.mutate({ planung_id: planung.id, wunsch }, { onSuccess: () => setWunsch('') });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">3 · Verlauf der Einheit</h2>
        <p className="text-xs text-muted-foreground">Die didaktische Abfolge — die Zeit planst du im nächsten Schritt.</p>
        {letzte?.content && <p className="mt-2 rounded-lg bg-primary/5 p-3 text-sm">{letzte.content}</p>}
      </div>
      <NeuStartenLeiste
        text="Verlauf neu erstellen"
        warnung
        hinweis="Achtung: Erstellt den Verlauf aus deiner Inhaltsauswahl komplett neu. Deine Verschiebungen, Streichungen und Anpassungen gehen dabei verloren."
        laeuft={planen.isPending}
        onClick={() => window.confirm('Verlauf wirklich neu erstellen? Deine Änderungen gehen verloren.') && planen.mutate({ planung_id: planung.id })}
      />
      <ol className="space-y-2">
        {planung.verlauf.map((s, i) => (
          <VerlaufAbschnitt
            key={`${s.titel}-${i}`}
            abschnitt={s}
            index={i}
            kopfZusatz={
              <span className="flex">
                <button type="button" title="Nach oben" disabled={i === 0} onClick={() => verschieben(i, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" title="Nach unten" disabled={i === planung.verlauf.length - 1} onClick={() => verschieben(i, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </span>
            }
          >
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