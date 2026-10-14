import React from 'react';
import { STUFEN } from '@/lib/methodenStufen';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SCHALTER = [
  ['auch_kurzform', 'Auch als Kurzform', 'An: Die Methode lässt sich auch eine Stufe kleiner durchführen, z. B. als kurzer Baustein statt als ganze Phase. Aus: Sie funktioniert nur in der eingestellten Stufe.'],
  ['ausbaubar', 'Ausbaubar', 'An: Die Methode lässt sich auch eine Stufe größer durchführen, z. B. über eine ganze Stunde statt nur eine Phase. Aus: Ein größerer Umfang ist nicht sinnvoll.'],
  ['stufe_pruefen', 'Einordnung prüfen', 'An: Die Stufe ist noch unsicher und sollte fachlich geprüft werden. In der Liste erscheint dann „prüfen“. Aus: Die Einordnung gilt als bestätigt.'],
];

/** Stufe des Methodenrasters und Zusatzvermerke einer Methode. */
export default function StufenAuswahl({ werte, setze }) {
  const s = STUFEN[werte.stufe];
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Einordnung im Methodenraster</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STUFEN).map(([k, v]) => (
          <button key={k} onClick={() => setze('stufe', Number(k))}
            className={`rounded-lg border px-3 py-1.5 text-sm ${werte.stufe === Number(k) ? `${v.cls} border-transparent font-semibold` : 'hover:bg-muted'}`}>
            Stufe {k}: {v.name}
          </button>
        ))}
      </div>
      {s && <p className="text-xs text-muted-foreground">{s.frage}</p>}
      <div className="flex flex-wrap gap-6 text-sm">
        {SCHALTER.map(([feld, label, tipp]) => (
          <div key={feld} className="flex items-center gap-2">
            <Switch checked={!!werte[feld]} onCheckedChange={(v) => setze(feld, v)} /> {label}
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 cursor-help text-muted-foreground" /></TooltipTrigger>
              <TooltipContent className="max-w-xs">{tipp}</TooltipContent></Tooltip></TooltipProvider>
          </div>
        ))}
      </div>
    </div>
  );
}