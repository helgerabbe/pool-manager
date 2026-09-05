/**
 * LernlandkartePreviewModal.jsx
 *
 * Lehrer-Vorschau des Standard-Elements „Lernlandkarte" (sys_map_full /
 * sys_map_reduced). Zeigt im iPad-Rahmen exakt die Seite, die Schüler im
 * Arbeitsplan aufrufen — gefüttert mit den echten Themenfeldern, Lernpaketen
 * und Lernzielen der Einheit.
 *
 * Reine Vorschau: Es wird nichts erzeugt und nichts gespeichert.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Map as MapIcon } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import LernlandkarteVorschauInhalt from '@/components/lernpfade/preview/LernlandkarteVorschauInhalt';

export default function LernlandkartePreviewModal({
  open, onOpenChange, einheitId, einheitTitel,
}) {
  const enabled = !!open && !!einheitId;

  const themenfelderQ = useQuery({
    queryKey: ['lernlandkarte-preview-themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled,
  });

  const lernpaketeQ = useQuery({
    queryKey: ['lernlandkarte-preview-lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled,
  });

  const pakete = lernpaketeQ.data || [];
  const paketIdsKey = pakete.map((p) => p.id).sort().join(',');

  const lernzieleQ = useQuery({
    queryKey: ['lernlandkarte-preview-lernziele', paketIdsKey],
    queryFn: async () => {
      const lists = await Promise.all(
        pakete.map((p) => base44.entities.Lernziele.filter({ lernpaket_id: p.id }))
      );
      return lists.flat();
    },
    enabled: enabled && pakete.length > 0,
  });

  const loading =
    themenfelderQ.isLoading || lernpaketeQ.isLoading ||
    (pakete.length > 0 && lernzieleQ.isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-primary" />
            Vorschau: Lernlandkarte
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            So sieht die Lernlandkarte deiner Einheit
            {einheitTitel ? ` „${einheitTitel}"` : ''} für die Schüler aus. Die
            Einschätzungen hier sind nur zum Ausprobieren — es wird nichts
            gespeichert.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin mb-3 text-primary" />
              <p className="text-sm font-medium">Lade Lernziele der Einheit …</p>
            </div>
          ) : (
            <IPadFrame
              lernpaketTitel={einheitTitel || 'Einheit'}
              phaseLabel="Lernlandkarte"
              scale={0.72}
            >
              <LernlandkarteVorschauInhalt
                themenfelder={themenfelderQ.data || []}
                lernpakete={pakete}
                lernziele={lernzieleQ.data || []}
              />
            </IPadFrame>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}