import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ladeKompetenzkarte } from '@/lib/kompetenzkarte';
import { kompetenzVerweise, kompetenzkarteBauen } from '@/lib/kiKompetenzkarte';
import { onlineTestKontext } from '@/lib/kiOnlineTest';

/** Lädt, bearbeitet und speichert die Kompetenzkarte einer Einheit (Pragmatiker). */
export default function useKompetenzkarte({ einheit, sektoren, aufgabenById, offen }) {
  const qc = useQueryClient();
  const key = ['kompetenzkarte', einheit?.id];
  const { data: karte, isLoading } = useQuery({ queryKey: key, enabled: offen && !!einheit?.id, queryFn: () => ladeKompetenzkarte(einheit.id) });
  const { data: verweise = [] } = useQuery({
    queryKey: ['kompetenzVerweise', einheit?.id, sektoren],
    enabled: offen && !!einheit?.id,
    queryFn: () => kompetenzVerweise({ sektoren, aufgabenById }),
  });
  const [entwurf, setEntwurf] = React.useState(null);
  const [geaendert, setGeaendert] = React.useState(false);
  const [laedt, setLaedt] = React.useState(false);
  const [speichert, setSpeichert] = React.useState(false);
  React.useEffect(() => { if (!geaendert) setEntwurf(karte || null); }, [karte]); // eslint-disable-line react-hooks/exhaustive-deps

  const sichern = async (daten) => {
    const voll = { einheit_id: einheit.id, lerntyp: 'pragmatiker', ...daten };
    const neu = karte ? await base44.entities.Kompetenzkarte.update(karte.id, voll) : await base44.entities.Kompetenzkarte.create(voll);
    qc.setQueryData(key, neu);
    setEntwurf(neu);
    setGeaendert(false);
  };
  const aendern = (k) => { setEntwurf(k); setGeaendert(true); };
  const speichern = async () => {
    setSpeichert(true);
    try { await sichern({ untertitel: entwurf.untertitel, titel: entwurf.titel, bereiche: entwurf.bereiche }); } finally { setSpeichert(false); }
  };
  const senden = async (wunsch) => {
    setLaedt(wunsch || true);
    const verlauf = [...(karte?.gespraech || []), ...(wunsch ? [{ role: 'user', content: wunsch }] : [])];
    try {
      const kontext = await onlineTestKontext({ einheit, sektoren, aufgabenById });
      const r = await kompetenzkarteBauen({ kontext, verweise, karte: entwurf, wunsch, verlauf });
      await sichern({ untertitel: r.untertitel, titel: r.titel, bereiche: r.bereiche, gespraech: [...verlauf, { role: 'assistant', content: r.nachricht }] });
    } finally {
      setLaedt(false);
    }
  };
  return { karte: entwurf, gespraech: karte?.gespraech || [], verweise, isLoading, laedt, speichert, geaendert, aendern, speichern, senden };
}