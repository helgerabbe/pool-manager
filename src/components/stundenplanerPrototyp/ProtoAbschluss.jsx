import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Ende des Stundenplaners. */
export default function ProtoAbschluss({ name, onZurueck, onAnsehen, onFeinplanung, onStundenbau }) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
      <div>
        <p className="font-display text-lg font-bold">Deine Stunde steht.</p>
        <p className="text-sm text-muted-foreground">„{name}“ ist fertig: Phasen, Zeiten, Umsetzung sowie Impulse, Arbeitsaufträge und Materialien sind ausgearbeitet.</p>
      </div>
      <p className="text-xs text-muted-foreground">Die Stunde ist gespeichert und in deiner Unterrichtseinheit zu finden.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onStundenbau && <Button onClick={onStundenbau}>Weiter zum Stundenbau</Button>}
        <Button variant={onStundenbau ? 'outline' : 'default'} onClick={onAnsehen}>Ausarbeitung ansehen</Button>
        <Button variant="outline" onClick={onFeinplanung}>Feinplanung ansehen</Button>
        <Button variant="outline" onClick={onZurueck}>Zurück zur Übersicht</Button>
      </div>
    </div>
  );
}