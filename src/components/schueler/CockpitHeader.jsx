import { useState, useEffect } from 'react';
import { ungefaehreUhrzeit } from '@/lib/fortschrittsBadge';

/**
 * Ruhige Begrüßung oben im Cockpit + menschliche, unscharfe Uhrzeit
 * ("ungefähr Viertel vor fünf") statt einer tickenden Maschinen-Uhr.
 */
export default function CockpitHeader({ name }) {
  const [uhrzeit, setUhrzeit] = useState(ungefaehreUhrzeit());

  useEffect(() => {
    const t = setInterval(() => setUhrzeit(ungefaehreUhrzeit()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const vorname = (name || '').split(' ')[0] || 'da';

  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Hallo {vorname}.
        </h1>
        <p className="text-muted-foreground mt-1">Schön, dass du da bist.</p>
      </div>
      <p className="text-sm text-muted-foreground italic">Es ist {uhrzeit}.</p>
    </div>
  );
}