import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/workspace/panels/SharedUI';

/**
 * Einheitlicher Kopf aller Ansichten im Bereich Lernpakete (Vorbild: die
 * Lernpaket-Übersicht). Immer gleich aufgebaut:
 *   Zeile 1: Herkunft · Titel · Status · Zusatzangaben   | rechts: Bearbeiten
 *   Trennlinie
 *   Zeile 2: links Rücksprung                            | rechts: Vorschau und weitere Aktionen
 */
export default function ElementKopf({
  overline, titel, status, badges = null, beschreibung = '',
  rechts = null, onZurueck = null, zurueckLabel = 'Zum Lernpaket', aktionen = null,
}) {
  return (
    <div className="space-y-3">
      <div className="pb-3 border-b flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {overline && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{overline}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{titel}</h2>
            <StatusBadge status={status} />
            {badges}
          </div>
          {beschreibung && <p className="text-xs text-muted-foreground mt-1">{beschreibung}</p>}
        </div>
        {rechts && <div className="flex items-center gap-2 shrink-0">{rechts}</div>}
      </div>
      {(onZurueck || aktionen) && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {onZurueck ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onZurueck}>
              <ArrowLeft /> {zurueckLabel}
            </Button>
          ) : <span />}
          <div className="flex items-center justify-end gap-2 flex-wrap">{aktionen}</div>
        </div>
      )}
    </div>
  );
}