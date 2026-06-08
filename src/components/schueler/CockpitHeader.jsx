import { useState, useEffect } from 'react';
import SchueleransichtVerlassenButton from '@/components/schueler/SchueleransichtVerlassenButton';

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function formatDatum(d) {
  return `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
}
function formatUhrzeit(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
}

/**
 * Ruhige Begrüßung oben im Cockpit + echtes Datum und genaue Uhrzeit,
 * damit der Schüler weiß, welcher Tag ist und wie spät es ist.
 */
export default function CockpitHeader({ name }) {
  const [jetzt, setJetzt] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setJetzt(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const vorname = (name || '').split(' ')[0] || 'da';

  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Hallo {vorname}.
        </h1>
        <p className="text-muted-foreground text-sm">Schön, dass du da bist.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{formatDatum(jetzt)}</p>
          <p className="text-sm text-muted-foreground">Es ist {formatUhrzeit(jetzt)}</p>
        </div>
        <SchueleransichtVerlassenButton />
      </div>
    </div>
  );
}