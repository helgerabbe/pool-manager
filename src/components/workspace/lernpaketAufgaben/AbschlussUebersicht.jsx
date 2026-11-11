import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Übersicht eines Abschluss-Elements mit Varianten (z. B. Test) im
 * Inhaltsfenster. Hat das Element mehrere Varianten, bekommt jeder Schüler
 * zufällig eine davon. Geändert wird erst über „Bearbeiten" – dann erscheint
 * die Bearbeitungsansicht (`children`).
 */
export default function AbschlussUebersicht({ name, paketTitel, varianten = [], kannBearbeiten, onZurueck, onVarianteOeffnen, children }) {
  const [bearbeitet, setBearbeitet] = useState(false);

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{paketTitel}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold">Abschluss: {name}</h2>
          <Badge variant="outline">{varianten.length} {varianten.length === 1 ? 'Variante' : 'Varianten'}</Badge>
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