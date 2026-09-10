/**
 * MbkGelostePunkte — eingeklappter Bereich mit den bereits entschiedenen
 * MBK-Hinweisen (behoben, bewusst gelassen, Widerspruch).
 *
 * Grund (MBK-Nachtrag 2026-09-10): Die Lehrkraft soll auf einen Blick zwei
 * Zahlen sehen — was noch zu klären ist und was schon gelöst wurde. Die
 * gelösten Punkte verschwinden dabei nicht, sie liegen nur zusammengeklappt
 * darunter.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

const LABELS = {
  behoben: 'Behoben',
  bewusst: 'Soll so bleiben',
  widerspruch: 'Widerspruch',
};

export default function MbkGelostePunkte({ befunde = [] }) {
  const [offen, setOffen] = useState(false);
  if (befunde.length === 0) return null;

  return (
    <div className="rounded-lg border bg-slate-50/60">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-sm"
        onClick={() => setOffen((v) => !v)}
      >
        {offen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Check className="w-4 h-4 text-emerald-600" />
        {befunde.length} schon gelöst
      </Button>
      {offen && (
        <ul className="px-4 pb-3 space-y-2">
          {befunde.map((b) => (
            <li key={b.id} className="text-sm border-t pt-2">
              <span className="font-medium">{LABELS[b.entscheidung] || 'Entschieden'}</span>
              {' · '}
              <span className="text-muted-foreground">{b.fundort || b.ziel_titel || '—'}</span>
              <p className="text-muted-foreground mt-0.5">{b.befund}</p>
              {b.kommentar && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">„{b.kommentar}"</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}