import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import StrukturBoardEmbedded from '@/components/workspace/StrukturBoardEmbedded';
import { useQueryClient } from '@tanstack/react-query';

export default function WizardStep3Generator({ einheitId, onDone }) {
  const queryClient = useQueryClient();

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId
  });

  const einheit = einheiten.find(e => e.id === einheitId);
  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div>
        <h2 className="text-lg font-semibold">Schritt 3: Struktur-Bearbeitung</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bearbeiten Sie Ihre Struktur aus Schritt 2. Sie können Themenfelder und Lernpakete hinzufügen, löschen oder anpassen.
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        {einheit && themenfelder.length > 0 ? (
          <StrukturBoardEmbedded
            einheitId={einheitId}
            einheit={einheit}
            lernpakete={paketeFuerEinheit}
            themenfelder={themenfelder}
            queryClient={queryClient}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Struktur wird geladen...</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={() => onDone(paketeFuerEinheit)} className="gap-2">
          <ChevronRight className="w-4 h-4" />
          Weiter zu Phase-Konfiguration
        </Button>
      </div>
    </div>
  );
}