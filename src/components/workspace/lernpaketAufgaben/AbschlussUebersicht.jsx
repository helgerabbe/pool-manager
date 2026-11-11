import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MasterAnzeigeModusToggle from '@/components/workspace/MasterAnzeigeModusToggle';

/**
 * Übersicht eines Abschluss-Elements mit Varianten (z. B. Test) im
 * Inhaltsfenster: Varianten und ihre Auswahl für die Schüler. Geändert wird
 * erst über „Bearbeiten" – dann erscheint die Bearbeitungsansicht (`children`).
 */
export default function AbschlussUebersicht({ activity, name, paketTitel, varianten = [], kannBearbeiten, onZurueck, onVarianteOeffnen, children }) {
  const queryClient = useQueryClient();
  const [bearbeitet, setBearbeitet] = useState(false);
  const [modus, setModus] = useState(activity.master_anzeige_modus || 'shuffle');

  const modusSpeichern = useMutation({
    mutationFn: (neu) => base44.entities.LernpaketPhaseAktivitaet.update(activity.id, { master_anzeige_modus: neu }),
    onSuccess: (_, neu) => { setModus(neu); queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] }); },
    onError: () => toast.error('Die Auswahl konnte nicht gespeichert werden.'),
  });

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{paketTitel}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold">Abschluss: {name}</h2>
          <Badge variant="outline">{varianten.length} {varianten.length === 1 ? 'Variante' : 'Varianten'}</Badge>
          {varianten.length >= 2 && <Badge variant="outline">{modus === 'alle' ? 'Alle bearbeiten' : '1 zufällig'}</Badge>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onZurueck}>
          <ArrowLeft /> Zum Lernpaket
        </Button>
        {kannBearbeiten && (bearbeitet ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setBearbeitet(false)}>
            <Check /> Fertig
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setBearbeitet(true)}
            className="gap-2 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900">
            <PenLine /> Bearbeiten
          </Button>
        ))}
      </div>

      {bearbeitet ? children : (
        <div className="space-y-2">
          {varianten.length >= 2 && (
            <MasterAnzeigeModusToggle value={modus} onChange={(neu) => modusSpeichern.mutate(neu)}
              saving={modusSpeichern.isPending} disabled={!kannBearbeiten} />
          )}
          {varianten.length === 0 && <p className="text-xs text-muted-foreground italic">Noch keine Variante angelegt.</p>}
          {varianten.map((v, i) => {
            const fertig = v.content_status === 'approved' || v.is_complete === true;
            return (
              <button key={v.id} type="button" onClick={() => onVarianteOeffnen(v)}
                className="w-full flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                <span className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-xs font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-sm font-semibold">{v.titel?.trim() || `Variante ${i + 1}`}</span>
                <span className={fertig ? 'text-[11px] text-muted-foreground' : 'text-[11px] text-amber-700'}>
                  {fertig ? 'Vollständig' : 'Noch unvollständig'}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}