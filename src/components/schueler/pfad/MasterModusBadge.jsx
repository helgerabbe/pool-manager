import { Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASTER_MODUS } from '@/lib/masterAufgabenModus';

/**
 * Kleines Badge für die Lernpaket-Übersicht, das bei masterfähigen Aktivitäten
 * mit MEHREREN MasterAufgaben den Modus verdeutlicht:
 *   - sequenziell: „x von y" (Zähler des Fortschritts).
 *   - shuffle:     Shuffle-Symbol + Anzahl der Aufgaben.
 * Bei genau einer (oder keiner) MasterAufgabe wird nichts gerendert.
 */
export default function MasterModusBadge({ erledigt, gesamt, modus }) {
  if (!gesamt || gesamt < 2) return null;

  if (modus === MASTER_MODUS.SHUFFLE) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold px-2 py-0.5">
        <Shuffle className="w-3 h-3" /> {gesamt}
      </span>
    );
  }

  const fertig = erledigt >= gesamt;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-[11px] font-bold px-2 py-0.5',
        fertig ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'
      )}
    >
      {erledigt} von {gesamt}
    </span>
  );
}