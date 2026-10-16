import React from 'react';
import { CheckCircle2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Ende des Stundenplaners – Übergang zum (eigenen) Feinplanungs-Assistenten. */
export default function ProtoAbschluss({ name, onZurueck }) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
      <div>
        <p className="font-display text-lg font-bold">Deine Stunde steht.</p>
        <p className="text-sm text-muted-foreground">„{name}“ ist als Grobplanung fertig. Phasen, Zeiten und Zielbezug stehen.</p>
      </div>
      <div className="mx-auto max-w-md rounded-xl border bg-card p-4 text-left text-sm text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Nicht Teil dieser Grobplanung:</p>
        Konkrete Aufgaben, Materialien, wörtliche Phasenimpulse sowie die analoge/digitale Umsetzung.
        Das übernimmt später der <span className="font-semibold text-foreground">Feinplanungs-Assistent</span>.
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onZurueck}>Zurück zur Übersicht</Button>
        <Button onClick={() => toast.info('Der Feinplanungs-Assistent ist im Prototyp noch nicht gebaut.')}><Wand2 /> Weiter zur Feinplanung</Button>
      </div>
    </div>
  );
}