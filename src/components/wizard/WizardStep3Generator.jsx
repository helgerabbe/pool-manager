import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight, SkipForward } from 'lucide-react';
import KILernpaketAssistent from '@/components/einheiten/KILernpaketAssistent';

export default function WizardStep3Generator({ einheitId, initialBraindump, onDone, onSkipAll }) {
  const [done, setDone] = useState(false);

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const einheit = einheiten.find(e => e.id === einheitId);
  const existingCount = lernpakete.filter(lp => lp.einheit_id === einheitId).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Schritt 3: Lernpakete & Lernziele anlegen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Der KI-Assistent strukturiert Ihren Entwurf und legt alle Lernpakete und Ebene-1-Lernziele auf Knopfdruck an.
        </p>
      </div>

      <KILernpaketAssistent
        einheitId={einheitId}
        einheit={einheit}
        existingPaketeCount={existingCount}
        initialBraindump={initialBraindump}
        onCreated={() => setDone(true)}
      />

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onSkipAll} className="gap-2 text-muted-foreground border-dashed">
          <SkipForward className="w-4 h-4" />
          Überspringen & Leer starten
        </Button>
        {done && (
          <Button onClick={() => onDone(lernpakete.filter(lp => lp.einheit_id === einheitId))} className="gap-2">
            <ChevronRight className="w-4 h-4" />
            Weiter: Basis-Befüllung
          </Button>
        )}
      </div>
    </div>
  );
}