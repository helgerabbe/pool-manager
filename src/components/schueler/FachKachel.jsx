import { getFortschrittStufe } from '@/lib/fortschrittsBadge';
import { AlertCircle, ChevronRight } from 'lucide-react';

/**
 * Eine Fach-Kachel im Cockpit: Fach-Name, grobe Fortschritts-Stufe (Badge
 * statt Prozent) und – falls länger nicht bearbeitet – ein dezenter
 * Vernachlässigungs-Hinweis. Klick führt später zu den Einheiten des Fachs.
 */
export default function FachKachel({ fach, stufe, zuletztVor, onClick }) {
  const s = getFortschrittStufe(stufe);
  const vernachlaessigt = zuletztVor && /Woche/.test(zuletztVor);

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col gap-2 justify-between"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fach.farbe || '#94a3b8' }} />
          <span className="font-semibold text-foreground truncate text-sm">{fach.name}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
          {s.label}
        </span>
        {zuletztVor && (
          <span className={`flex items-center gap-1 text-xs ${vernachlaessigt ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {vernachlaessigt && <AlertCircle className="w-3 h-3" />}
            {zuletztVor}
          </span>
        )}
      </div>
    </button>
  );
}