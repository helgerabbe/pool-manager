/**
 * ExportContentTimestamp.jsx
 *
 * Zeigt im Info-Tab des Export-Centers EINEN Zeitstempel: "Stand der
 * Inhalte". Da die Air-Gap-Payloads immer LIVE aus den aktuellen Daten
 * gebaut werden (es gibt keine zwischengespeicherten, veraltbaren Prompts),
 * ist der ehrlichste "Wann wurden die Prompts zuletzt erstellt?"-Wert der
 * jüngste Änderungszeitpunkt aller exportrelevanten Datensätze der Einheit.
 *
 * Genau das beantwortet die Sorge der Lehrkraft: "Steht da noch was Altes
 * drin?" – Nein, alles ist auf dem Stand des angezeigten Zeitpunkts.
 *
 * Reine Präsentation + leichte Lese-Queries.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function maxUpdated(records) {
  let max = 0;
  for (const r of records) {
    const t = new Date(r?.updated_date || r?.created_date || 0).getTime();
    if (t > max) max = t;
  }
  return max;
}

export default function ExportContentTimestamp({ einheit }) {
  const einheitId = einheit?.id;

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });
  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const stand = useMemo(() => {
    const t = Math.max(
      maxUpdated([einheit || {}]),
      maxUpdated(themenfelder),
      maxUpdated(lernpakete),
      maxUpdated(allgemeineAufgaben)
    );
    return t > 0 ? new Date(t) : null;
  }, [einheit, themenfelder, lernpakete, allgemeineAufgaben]);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
      <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-blue-900">
          Stand der Inhalte:{' '}
          {stand
            ? format(stand, "dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })
            : 'unbekannt'}
        </p>
        <p className="text-xs text-blue-700/80 mt-0.5">
          Alle Übergabe-Pakete werden beim Kopieren live aus den aktuellen
          Daten gebaut – sie sind immer auf diesem Stand. Es gibt keine
          gespeicherten, veralteten Prompts.
        </p>
      </div>
    </div>
  );
}