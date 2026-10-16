import React from 'react';
import { MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Sprechblase des Assistenten. Zeigt mit dem Pfeil auf eine Phase (links) oder steht über der Stunde. */
export default function TippBlase({ tipp, zeigtAufPhase, onAnnehmen, onVerwerfen }) {
  const [offen, setOffen] = React.useState(false);
  const [laedt, setLaedt] = React.useState(false);
  const annehmen = async () => { setLaedt(true); await onAnnehmen(tipp); setLaedt(false); };
  return (
    <div className="relative">
      {zeigtAufPhase && <span className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-accent/40 bg-accent/5" />}
      <div className="relative rounded-xl border border-accent/40 bg-accent/5 p-3 text-xs shadow-sm">
        <button onClick={() => setOffen((o) => !o)} className="flex w-full items-start gap-2 text-left">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span className="font-semibold text-foreground">{tipp.titel}</span>
        </button>
        {offen && (
          <div className="mt-2 space-y-2 pl-6">
            <p className="text-muted-foreground">{tipp.text}</p>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={laedt} onClick={annehmen}>
                {laedt ? <Loader2 className="animate-spin" /> : <Check />} Ja, mach in die Richtung
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={laedt} onClick={() => onVerwerfen(tipp)}><X /> Nein danke</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}