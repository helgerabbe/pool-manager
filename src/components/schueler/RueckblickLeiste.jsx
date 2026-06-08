import { History } from 'lucide-react';

/**
 * Schmaler Streifen der letzten Poolzeiten – echte Tagebuch-Zeilen statt
 * abstrakter Diagramme. Beantwortet "Was war?". Horizontal angeordnet,
 * damit er unten im Cockpit nur wenig Höhe braucht (iPad, kein Scrollen).
 *
 * eintraege: [{ tag, fach, minuten, erledigt }]
 */
export default function RueckblickLeiste({ eintraege = [] }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
          Zuletzt
        </h2>
      </div>
      {eintraege.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Einträge – deine erste Poolzeit wartet auf dich.</p>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          {eintraege.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/40 px-3 py-1.5 shrink-0">
              <span className="font-semibold text-foreground">{e.tag}</span>
              <span className="font-medium text-foreground">{e.minuten} Min {e.fach}</span>
              {e.erledigt && (
                <span className="text-muted-foreground hidden md:inline truncate max-w-[14rem]">· {e.erledigt}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}