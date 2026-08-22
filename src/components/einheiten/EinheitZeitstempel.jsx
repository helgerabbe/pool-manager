/**
 * EinheitZeitstempel.jsx
 *
 * Kompakte Zeitstempel-Zeile einer Einheit:
 *   „Bearbeitet: 22. Aug 2026"  ·  „Exportiert: 22. Aug 2026, 22:10"
 *
 * Wird in der Einheiten-Kachel (Bibliothek) und in Tab 1 („Einheit
 * verwalten") verwendet, damit sofort sichtbar ist, ob seit dem letzten
 * Export weitergearbeitet wurde.
 */
import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Pencil, Send } from 'lucide-react';

function fmt(iso, withTime) {
  if (!iso) return null;
  try {
    return format(new Date(iso), withTime ? "dd. MMM yyyy, HH:mm" : 'dd. MMM yyyy', {
      locale: de,
    });
  } catch {
    return null;
  }
}

export default function EinheitZeitstempel({ einheit, className = '' }) {
  const bearbeitet = fmt(einheit?.updated_date || einheit?.created_date, false);
  const exportIso = einheit?.last_synced_at || einheit?.export_published_at;
  const exportiert = fmt(exportIso, true);

  return (
    <div className={`flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground ${className}`}>
      {bearbeitet && (
        <span className="inline-flex items-center gap-1" title="Letzte Bearbeitung im Pool-Manager">
          <Pencil className="w-3 h-3" />
          Bearbeitet: {bearbeitet}
        </span>
      )}
      <span
        className={`inline-flex items-center gap-1 ${exportiert ? '' : 'text-muted-foreground/70 italic'}`}
        title={
          exportiert
            ? 'Zeitpunkt des letzten Exports an Moodle/MBK'
            : 'Diese Einheit wurde noch nie exportiert.'
        }
      >
        <Send className="w-3 h-3" />
        {exportiert ? `Exportiert: ${exportiert}` : 'Noch nie exportiert'}
      </span>
    </div>
  );
}