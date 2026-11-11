import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { statusFarbe } from './statusFarbe';

/**
 * Einheitlicher Kopf aller Ansichten im Bereich Lernpakete (Vorbild: die
 * Lernpaket-Übersicht). Immer gleich aufgebaut:
 *   Zeile 1: Herkunft · Titel (Farbe = Stand) · Zusatzangaben   | rechts: Bearbeiten
 *            mit `details` lässt sich der Kopf aufklappen
 *   Trennlinie
 *   Zeile 2: links Rücksprung                                   | rechts: Vorschau und weitere Aktionen
 */
export default function ElementKopf({
  overline, titel, status, badges = null, beschreibung = '', details = null,
  rechts = null, onZurueck = null, zurueckLabel = 'Zum Lernpaket', aktionen = null,
}) {
  const [offen, setOffen] = useState(false);
  const farbe = statusFarbe(status);
  const Titel = details ? 'button' : 'div';
  return (
    <div className="space-y-3">
      <div className="pb-3 border-b">
        <div className="flex items-start gap-3">
          <Titel
            {...(details ? { type: 'button', onClick: () => setOffen((v) => !v), title: 'Weitere Informationen ein- oder ausblenden' } : {})}
            className="flex-1 min-w-0 flex items-start gap-2 text-left"
          >
            {details && (
              <ChevronRight className={cn('w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform', offen && 'rotate-90')} />
            )}
            <div className="min-w-0">
              {overline && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{overline}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={cn('text-lg font-bold', farbe.klasse)} title={farbe.hinweis}>{titel}</h2>
                {badges}
              </div>
              {beschreibung && <p className="text-xs text-muted-foreground mt-1">{beschreibung}</p>}
            </div>
          </Titel>
          {rechts && <div className="flex items-center gap-2 shrink-0">{rechts}</div>}
        </div>
        {details && offen && details}
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