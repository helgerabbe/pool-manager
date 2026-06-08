import { getFortschrittStufe } from '@/lib/fortschrittsBadge';
import { AlertCircle, ChevronRight } from 'lucide-react';

/**
 * Eine Fach-Kachel im Cockpit. Feste, einheitliche Struktur (immer gleich groß):
 *  1. Fach-Name (oben)
 *  2. Fortschritts-Badge
 *  3. Zeit-Info „zuletzt vor …" – oder „Noch nie" falls noch nicht bearbeitet.
 * Klick führt später zu den Einheiten des Fachs.
 */
export default function FachKachel({ fach, stufe, zuletztVor, onClick }) {
  const s = getFortschrittStufe(stufe);
  const vernachlaessigt = zuletztVor && /Woche/.test(zuletztVor);

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col gap-2.5"
    >
      {/* 1. Fach-Name */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fach.farbe || '#94a3b8' }} />
          <span className="font-semibold text-foreground truncate text-sm">{fach.name}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>

      {/* 2. Fortschritts-Badge */}
      <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
        {s.label}
      </span>

      {/* 3. Zeit-Info (immer vorhanden, Fallback „Noch nie") */}
      <span className={`flex items-center gap-1 text-xs ${vernachlaessigt ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {vernachlaessigt && <AlertCircle className="w-3 h-3" />}
        {zuletztVor || 'Noch nie'}
      </span>
    </button>
  );
}