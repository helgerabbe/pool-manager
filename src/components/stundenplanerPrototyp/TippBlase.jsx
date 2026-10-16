import React from 'react';
import { Check, X, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tippArt } from '@/lib/tippArten';

/** Hinweis des Assistenten, farbig nach Eingriffstiefe. Hintergrund und Vorher/Nachher klappen auf. */
export default function TippBlase({ tipp, zeigtAufPhase, onAnnehmen, onVerwerfen }) {
  const [offen, setOffen] = React.useState(false);
  const [mehr, setMehr] = React.useState(false);
  const [laedt, setLaedt] = React.useState(false);
  const art = tippArt(tipp.art);
  const annehmen = async () => { setLaedt(true); await onAnnehmen(tipp); setLaedt(false); };
  return (
    <div className="relative">
      {zeigtAufPhase && <span className="absolute -left-3 top-5 hidden h-px w-3 bg-border lg:block" />}
      <div className={`rounded-lg border border-l-4 ${art.rand} ${offen ? art.bg : 'bg-card'} p-3 text-xs shadow-sm transition-colors`}>
        <button onClick={() => setOffen((o) => !o)} className="flex w-full items-start gap-2 text-left">
          <art.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${art.icon}`} />
          <span className="flex-1">
            <span className={`block text-[10px] font-semibold uppercase tracking-wide ${art.icon}`}>{art.name}</span>
            <span className="font-semibold text-foreground">{tipp.titel}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${offen ? 'rotate-180' : ''}`} />
        </button>
        {offen && (
          <div className="mt-2 space-y-2 pl-6">
            <p className="text-foreground/80">{tipp.text}</p>
            {(tipp.hintergrund || tipp.vorher) && (
              <button onClick={() => setMehr((m) => !m)} className="text-[11px] font-medium text-primary hover:underline">{mehr ? 'Weniger anzeigen' : 'Mehr dazu'}</button>
            )}
            {mehr && (
              <div className="space-y-1.5 rounded-md bg-card/70 p-2 text-[11px] text-muted-foreground">
                {tipp.vorher && <p><span className="font-semibold text-foreground">Bisher:</span> {tipp.vorher}<br /><span className="font-semibold text-foreground">Danach:</span> {tipp.nachher}</p>}
                {tipp.hintergrund && <p><span className="font-semibold text-foreground">Warum:</span> {tipp.hintergrund}</p>}
                {tipp.aufwand && <p><span className="font-semibold text-foreground">Aufwand:</span> {tipp.aufwand}</p>}
              </div>
            )}
            {tipp.art !== 'achtung' || tipp.aenderung ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-7 text-xs" disabled={laedt} onClick={annehmen}>
                  {laedt ? <Loader2 className="animate-spin" /> : <Check />} Ja, mach in die Richtung
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={laedt} onClick={() => onVerwerfen(tipp)}><X /> Nein danke</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onVerwerfen(tipp)}><Check /> Verstanden</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}