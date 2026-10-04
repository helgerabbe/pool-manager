import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone } from 'lucide-react';
import KursAnsichtDialog from './KursAnsichtDialog';

/**
 * Zeigt an einer Stelle, dass der Kurs hier eine eigene, von der MBK gelieferte
 * Ansicht hat — und öffnet sie. Rendert nichts, wenn es keine gibt.
 */
export default function KursAnsichtHinweis({ zielId, schrittId }) {
  const [offen, setOffen] = React.useState(false);
  const { data: ansichten = [] } = useQuery({
    queryKey: ['kursAnsicht', zielId],
    queryFn: () => base44.entities.KursAnsicht.filter({ ziel_id: zielId }),
    enabled: !!zielId,
  });
  const ansicht = ansichten.find((a) => !schrittId || (a.schritt_id || '') === schrittId) || null;
  if (!ansicht) return null;

  return (
    <div className="rounded-lg border border-chart-2/40 bg-accent/10 px-3 py-2 text-sm flex items-start gap-3">
      <MonitorSmartphone className="w-4 h-4 mt-0.5 text-accent shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Im Kurs sieht diese Stelle anders aus{ansicht.darstellung ? ` (${ansicht.darstellung})` : ''}.</p>
        {ansicht.beschreibung && <p className="text-xs text-muted-foreground mt-0.5">{ansicht.beschreibung}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">
          Die Schüler sehen die Kurs-Ansicht. Änderst du die Stelle bewusst und gibst sie neu frei, baut die MBK sie wieder nach deiner Fassung.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => setOffen(true)}>Kurs-Ansicht zeigen</Button>
      <KursAnsichtDialog open={offen} onOpenChange={setOffen} ansicht={ansicht} />
    </div>
  );
}