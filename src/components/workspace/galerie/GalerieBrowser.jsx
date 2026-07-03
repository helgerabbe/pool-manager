import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonitorPlay, CheckCircle2 } from 'lucide-react';

/**
 * Sortiert und filtert die Galerie-Einträge:
 * - Sobald mindestens ein Eintrag `galerie_sichtbar === true` trägt, werden
 *   NUR diese gezeigt (Manifest v2). Solange das Manifest noch nicht
 *   erweitert ist, werden übergangsweise alle Einträge angezeigt.
 */
export function sichtbareGalerieEintraege(aktivitaeten = []) {
  const hatFlag = aktivitaeten.some((a) => a?.galerie_sichtbar === true);
  const liste = hatFlag ? aktivitaeten.filter((a) => a?.galerie_sichtbar === true) : aktivitaeten;
  return [...liste].sort((a, b) => {
    const ra = a?.reihenfolge ?? 9999;
    const rb = b?.reihenfolge ?? 9999;
    if (ra !== rb) return ra - rb;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
}

/**
 * Linke Spalte des Galerie-Modals: auswählbare Liste der Galerie-Aktivitäten.
 */
export default function GalerieBrowser({ eintraege, selectedId, onSelect, onShowDemo }) {
  if (!eintraege || eintraege.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic px-2 py-8 text-center">
        Keine Aktivitäten in der Galerie gefunden.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {eintraege.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            className={cn(
              'w-full text-left rounded-lg border p-3 transition-all',
              isSelected
                ? 'border-primary ring-2 ring-primary/25 bg-primary/5'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{entry.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {entry.id}
                  </Badge>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                {entry.kurzbeschreibung && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {entry.kurzbeschreibung}
                  </p>
                )}
              </div>
              {entry.demo_html && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 shrink-0 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDemo(entry);
                  }}
                >
                  <MonitorPlay className="w-3 h-3" /> Demo
                </Button>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}