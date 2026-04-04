import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function WizardStepLernziele({ einheitId, onDone }) {
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!einheitId
  });

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const lernzieleCount = lernziele.filter(lz => 
    paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 4: Lernziele definieren</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Definieren Sie für jedes Lernpaket die zu erreichenden Lernziele in Fachsprache 
          und ggf. in einer Schülergerechten Übersetzung.
        </p>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Status</p>
          <p className="text-sm text-muted-foreground mt-2">
            {paketeFuerEinheit.length} Lernpakete · {lernzieleCount} Lernziele definiert
          </p>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Sie können die Lernziele später im Workspace bearbeiten und verfeinern.
        </p>
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={() => onDone?.()} className="gap-2">
          <ChevronRight className="w-4 h-4" />
          Weiter zu Phasen-Konfiguration
        </Button>
      </div>
    </div>
  );
}