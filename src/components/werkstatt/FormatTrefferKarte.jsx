import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Check } from 'lucide-react';

const PASSUNG_LABEL = { hoch: 'passt gut', mittel: 'könnte passen' };

/**
 * Ein Treffer aus der internen Aufgabengalerie. Die Begründung steht bewusst
 * dabei: Die Lehrkraft soll sehen, WARUM ihr dieses Format vorgeschlagen wird,
 * statt einer Liste zu vertrauen.
 */
export default function FormatTrefferKarte({ treffer, onAnsehen, onNehmen, disabled, herkunftLabel = null }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{treffer.name}</span>
            {treffer.passung && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {PASSUNG_LABEL[treffer.passung] || treffer.passung}
              </Badge>
            )}
            {herkunftLabel && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {herkunftLabel}
              </span>
            )}
          </div>
          {treffer.begruendung && (
            <p className="text-xs text-muted-foreground mt-1">{treffer.begruendung}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Ansehen gibt es nur, wo es etwas zu sehen gibt: Galerie-Formate
              bringen ihr HTML mit, Katalogformate nicht. */}
          {onAnsehen && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onAnsehen}>
              <Eye className="w-3.5 h-3.5" /> Ansehen
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={onNehmen} disabled={disabled}>
            <Check className="w-3.5 h-3.5" /> Nehmen
          </Button>
        </div>
      </div>
    </div>
  );
}