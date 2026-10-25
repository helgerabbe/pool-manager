import React from 'react';
import { base44 } from '@/api/base44Client';
import { raumAbonnieren } from '@/lib/liveRaum';

/** Lädt einen Live-Raum und hält ihn per Echtzeit-Abo aktuell. */
export function useLiveRaum(raumId) {
  const [raum, setRaum] = React.useState(undefined);
  React.useEffect(() => {
    if (!raumId) return undefined;
    base44.entities.LiveRaum.get(raumId).then(setRaum).catch(() => setRaum(null));
    return raumAbonnieren(raumId, setRaum);
  }, [raumId]);
  return raum;
}

/** Meldungen der Schüler im Raum (nur für die Lehrkraft), live. */
export function useLiveMeldungen(raumId) {
  const [meldungen, setMeldungen] = React.useState([]);
  React.useEffect(() => {
    if (!raumId) return undefined;
    base44.entities.LiveMeldung.filter({ raum_id: raumId }, '-created_date', 500).then(setMeldungen);
    return base44.entities.LiveMeldung.subscribe((e) => {
      if (e.data?.raum_id !== raumId) return;
      setMeldungen((alt) => (e.type === 'delete' ? alt.filter((m) => m.id !== e.id) : [e.data, ...alt.filter((m) => m.id !== e.id)]));
    });
  }, [raumId]);
  return meldungen;
}