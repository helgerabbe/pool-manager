import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePruefbefunde } from '@/hooks/usePruefung';
import { Zeile, zeit } from '@/components/workspace/panels/LernpaketKopfDetails';

// Zeitstempel ohne Zeitzone sind UTC.
const ms = (wert) => (wert ? new Date(/Z|[+-]\d\d:\d\d$/.test(wert) ? wert : `${wert}Z`).getTime() : 0);

/**
 * Stimmt dieses Element gerade mit dem Stand in Moodle überein?
 * Nicht synchron = nach dem letzten Export geändert. Ausnahme: Die letzte
 * Änderung hat einen Hinweis des Moodle-Teams erledigt, bei dem der Kurs schon
 * voraus war – damit sind beide Seiten wieder auf demselben Stand.
 */
export default function MoodleStandZeile({ record, einheitId }) {
  const { data: einheit } = useQuery({
    queryKey: ['einheit-export-stand', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });
  const { data: befunde = [] } = usePruefbefunde(einheitId);

  const angeglichen = befunde
    .filter((b) => b.ziel_id === record.id && b.quelle === 'mbk' && b.entscheidung === 'behoben'
      && b.kurs_umgehung && b.kurs_umgehung !== 'keine' && b.entschieden_am)
    .sort((a, b) => ms(b.entschieden_am) - ms(a.entschieden_am))[0];
  const exportAm = record.last_synced_at || einheit?.last_exported_at;
  const geaendert = ms(record.updated_date);

  let farbe = 'text-muted-foreground';
  let text = 'noch nicht nach Moodle übertragen';
  if (angeglichen && geaendert <= ms(angeglichen.entschieden_am) + 120000) {
    farbe = 'text-green-700';
    text = `synchron – am ${zeit(angeglichen.entschieden_am)} an den Stand im Kurs angeglichen`;
  } else if (exportAm && (geaendert > ms(exportAm) || record.sync_status === 'modified')) {
    farbe = 'text-orange-600';
    text = `nicht synchron – geändert nach dem letzten Export (${zeit(exportAm)})`;
  } else if (exportAm) {
    farbe = 'text-green-700';
    text = `synchron – Stand des letzten Exports (${zeit(exportAm)})`;
  }

  return (
    <Zeile label="Stand in Moodle">
      <span className={`font-medium ${farbe}`}>{text}</span>
    </Zeile>
  );
}