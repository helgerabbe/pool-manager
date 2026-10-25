import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Übungen aus dem Fundament anbieten, oder eine eigene benennen. */
export default function UebungWahl({ fundament, onWahl }) {
  const [eigen, setEigen] = React.useState('');
  const gruppen = [['Kernaufgaben', fundament.kernaufgaben || []], ['Mögliche Teilaufgaben', fundament.teilaufgaben || []]];
  return (
    <div className="space-y-5">
      {gruppen.map(([titel, liste]) => (
        <div key={titel}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chart-3">{titel}</p>
          {liste.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {liste.map((a, i) => (
                <button key={i} onClick={() => onWahl({ titel: a.titel, beschreibung: a.text })} className="rounded-lg border p-3 text-left text-sm hover:border-chart-3 hover:bg-chart-3/5">
                  <span className="font-medium">{a.titel || 'Ohne Titel'}</span>
                  {a.text && <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{a.text}</span>}
                </button>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Noch keine im Fundament.</p>}
        </div>
      ))}
      <div className="flex gap-2 border-t pt-4">
        <Input value={eigen} onChange={(e) => setEigen(e.target.value)} placeholder="Eigene Übung benennen" />
        <Button disabled={!eigen.trim()} onClick={() => onWahl({ titel: eigen.trim() })}>Hinzufügen</Button>
      </div>
    </div>
  );
}