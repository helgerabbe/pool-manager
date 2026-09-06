import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye } from 'lucide-react';

/**
 * Auswahlliste der freigegebenen Aufgabenformate der EIGENEN Galerie.
 *
 * Ersetzt den früheren Browser über das Galerie-Verzeichnis der MBK: Angeboten
 * wird nur, was hier angesehen und freigegeben wurde — sonst würden Lehrkräfte
 * fremde, ungeprüfte Mechaniken zur Wahl bekommen.
 */
export default function EigeneFormatListe({ formate, selectedId, onSelect, onAnsehen }) {
  if (!formate || formate.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic px-2 py-8 text-center">
        In der Aufgabengalerie ist noch kein Format freigegeben.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {formate.map((format) => {
        const isSelected = format.id === selectedId;
        return (
          <button
            key={format.id}
            type="button"
            onClick={() => onSelect(format.id)}
            className={cn(
              'w-full text-left rounded-lg border p-3 transition-all',
              isSelected
                ? 'border-primary ring-2 ring-primary/25 bg-primary/5'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{format.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                {format.beschreibung && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                    {format.beschreibung}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0"
                onClick={(e) => { e.stopPropagation(); onAnsehen(format); }}
              >
                <Eye className="w-3 h-3" /> Ansehen
              </Button>
            </div>
          </button>
        );
      })}
    </div>
  );
}