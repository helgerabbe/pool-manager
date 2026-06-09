import { CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MasterModusBadge from './MasterModusBadge';
import { ermittleMasterModus, masterFortschritt } from '@/lib/masterAufgabenModus';

const PHASE_LABEL = { Input: 'Erklärung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

/**
 * Eine einzelne Aktivitäts-Zeile in der Lernpaket-Übersicht (Schüleransicht).
 * Zeigt – wenn im Katalog hinterlegt – ein kleines schülergerechtes Thumbnail,
 * den Status (erledigt/gesperrt/offen), Phase + Name sowie den Aktions-Button.
 */
export default function LernpaketAktivitaetItem({
  aktivitaet,
  kat,
  nummer,
  lernpaketInstanceId,
  fortschrittByCompositeId,
  erledigt,
  gesperrt,
  onOeffnen,
}) {
  const thumb = kat?.thumbnail_url;

  return (
    <li
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        gesperrt ? 'border-border bg-muted/30 opacity-70' : 'border-border bg-card',
        erledigt && 'border-emerald-200 bg-emerald-50/60'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status / Nummer */}
        <span className="shrink-0">
          {erledigt ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : gesperrt ? (
            <Lock className="w-5 h-5 text-muted-foreground" />
          ) : (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {nummer}
            </span>
          )}
        </span>

        {/* Thumbnail (optional) */}
        {thumb && (
          <span className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted/40 border border-border">
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          </span>
        )}

        {/* Titel */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {PHASE_LABEL[aktivitaet.phase] || aktivitaet.phase}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <p className={cn('text-sm font-semibold truncate', erledigt ? 'text-emerald-700' : 'text-foreground')}>
              {kat?.name || 'Aktivität'}
            </p>
            <MasterModusBadge
              modus={ermittleMasterModus(aktivitaet)}
              {...masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId)}
            />
          </div>
        </div>

        {/* Aktion */}
        {!gesperrt && (
          <Button
            size="sm"
            variant={erledigt ? 'outline' : 'default'}
            className={cn('shrink-0', !erledigt && 'bg-primary hover:bg-primary/90')}
            onClick={onOeffnen}
          >
            {erledigt ? 'Nochmal machen' : 'Jetzt machen'}
          </Button>
        )}
      </div>
    </li>
  );
}