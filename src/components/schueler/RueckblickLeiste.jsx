import { History } from 'lucide-react';

/**
 * Schmale Zeitleiste der letzten Poolzeiten – echte Tagebuch-Zeilen statt
 * abstrakter Diagramme. Beantwortet "Was war?".
 *
 * eintraege: [{ tag, fach, minuten, erledigt }]
 */
export default function RueckblickLeiste({ eintraege = [] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Deine letzten Poolzeiten
        </h2>
      </div>
      {eintraege.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Einträge – deine erste Poolzeit wartet auf dich.</p>
      ) : (
        <div className="space-y-2">
          {eintraege.map((e, i) => (
            <div key={i} className="flex items-center gap-3 text-sm rounded-lg bg-muted/40 px-4 py-2.5">
              <span className="font-semibold text-foreground w-10 shrink-0">{e.tag}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-foreground">{e.minuten} Min {e.fach}</span>
              {e.erledigt && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground truncate">{e.erledigt}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}