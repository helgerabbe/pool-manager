import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Hammer } from 'lucide-react';
import VorschlagKarte from './VorschlagKarte';

/** Alle Entscheidungen für den ganzen Foliensatz der Phase, gruppiert nach Folie. */
export default function PhasenFragen({ stand, onBauen, onFragen, onAnpassen, baut }) {
  const fragen = stand.fragen || [];
  const titel = (n) => stand.folien?.[n - 1]?.titel;
  const gruppen = [...new Set(fragen.map((f) => f.folie || 0))].sort((a, b) => a - b);
  const setze = (i, patch) => onFragen(fragen.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const bauen = () => onBauen(fragen.map((f, i) => `${i + 1}. (Folie ${f.folie || '-'}) ${f.frage} → ${f.vorschlag}`).join('\n'));
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm">{stand.einleitung}</p>
      <p className="text-sm font-semibold">Meine Vorschläge für alle {stand.folien?.length || ''} Folien dieser Phase – passt alles, oder möchtest du etwas anders?</p>
      {gruppen.map((g) => (
        <div key={g} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{g ? `Folie ${g}${titel(g) ? ` · ${titel(g)}` : ''}` : 'Allgemein'}</p>
          {fragen.map((f, i) => (f.folie || 0) === g && (
            <VorschlagKarte key={i} nr={i + 1} f={f}
              onAnpassen={async (w) => setze(i, { vorschlag: await onAnpassen(f, w), vorher: f.vorschlag })}
              onZurueck={() => setze(i, { vorschlag: f.vorher, vorher: null })} />
          ))}
        </div>
      ))}
      <Button onClick={bauen} disabled={baut}>{baut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} {baut ? 'Ich fülle die Folien …' : 'Alle Folien damit füllen'}</Button>
    </div>
  );
}