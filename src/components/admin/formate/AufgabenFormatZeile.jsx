import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Check, Undo2, Trash2 } from 'lucide-react';

const HERKUNFT_LABEL = {
  poolmanager: 'Im Pool-Manager gebaut',
  mbk: 'Aus dem Kursbau',
  manuell: 'Von Hand eingetragen',
};

/**
 * Eine Zeile der internen Aufgabengalerie. Fehlt die Beschreibung, wird das
 * ausdrücklich gesagt — ohne sie wird das Format später nie gefunden.
 */
export default function AufgabenFormatZeile({
  format, onVorschau, onBearbeiten, onStatusWechsel, onLoeschen, isPending,
}) {
  const freigegeben = format.status === 'freigegeben';
  const fehltBeschreibung = !String(format.beschreibung || '').trim();

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {format.name || 'Unbenanntes Format'}
          </span>
          <Badge variant="outline" className="text-[10px] font-normal">
            {HERKUNFT_LABEL[format.herkunft] || 'Unbekannte Herkunft'}
          </Badge>
          {format.verwendungen > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {format.verwendungen}× verwendet
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {fehltBeschreibung
            ? 'Noch keine Beschreibung — dieses Format kann nicht gefunden werden.'
            : format.beschreibung}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onVorschau}>
          <Eye className="w-3.5 h-3.5" /> Ansehen
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBearbeiten}>
          <Pencil className="w-3.5 h-3.5" /> Bearbeiten
        </Button>
        {freigegeben ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onStatusWechsel}
            disabled={isPending}
            title="Aus der offiziellen Galerie zurückziehen"
          >
            <Undo2 className="w-3.5 h-3.5" /> Zurückziehen
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onStatusWechsel}
            disabled={isPending || fehltBeschreibung || !format.name}
            title={fehltBeschreibung
              ? 'Bitte zuerst Name und Beschreibung ergänzen.'
              : 'In die offizielle Galerie aufnehmen'}
          >
            <Check className="w-3.5 h-3.5" /> Freigeben
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={onLoeschen}
          disabled={isPending}
          title="Format löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}