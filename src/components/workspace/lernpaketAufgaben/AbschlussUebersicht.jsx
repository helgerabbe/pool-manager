import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ElementKopf from '@/components/workspace/kopf/ElementKopf';
import ElementDetails from '@/components/workspace/kopf/ElementDetails';
import BearbeitenKnopf from '@/components/workspace/kopf/BearbeitenKnopf';
import { variantenVollstaendig } from '@/lib/variantenStatus';
import { Badge } from '@/components/ui/badge';

/**
 * Übersicht eines Abschluss-Elements mit Varianten (z. B. Test) im
 * Inhaltsfenster. Hat das Element mehrere Varianten, bekommt jeder Schüler
 * zufällig eine davon. Geändert wird erst über „Bearbeiten" – dann erscheint
 * die Bearbeitungsansicht (`children`).
 */
export default function AbschlussUebersicht({ activity = null, paket = null, name, paketTitel, varianten = [], kannBearbeiten, onZurueck, onVarianteOeffnen, children }) {
  const [bearbeitet, setBearbeitet] = useState(false);

  return (
    <div className="space-y-4">
      <ElementKopf
        overline={paketTitel}
        titel={`Abschluss: ${name}`}
        status={activity?.content_status === 'approved' || activity?.is_complete === true || variantenVollstaendig(varianten) ? 'green' : 'red'}
        details={activity && <ElementDetails record={activity} resourceType="LernpaketPhaseAktivitaet" paket={paket} />}
        badges={<Badge variant="outline">{varianten.length} {varianten.length === 1 ? 'Variante' : 'Varianten'}</Badge>}
        rechts={kannBearbeiten && <BearbeitenKnopf aktiv={bearbeitet} onClick={() => setBearbeitet((v) => !v)} />}
        onZurueck={onZurueck}
      />

      {bearbeitet ? children : (
        <div className="space-y-2">
          {varianten.length >= 2 && (
            <p className="text-xs text-muted-foreground">Jeder Schüler bekommt zufällig eine der {varianten.length} Varianten.</p>
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