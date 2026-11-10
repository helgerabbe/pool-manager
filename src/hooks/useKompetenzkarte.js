import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ladeKompetenzkarte } from '@/lib/kompetenzkarte';
import { kompetenzVerweise, kompetenzkarteBauen } from '@/lib/kiKompetenzkarte';
import { onlineTestKontext } from '@/lib/kiOnlineTest';

/** Lädt, bearbeitet und speichert die Kompetenzkarte einer Einheit (Pragmatiker). */
export default function useKompetenzkarte({ einheit, sektoren: alleSektoren, aufgabenById, offen, lerntyp = 'pragmatiker' }) {
  const qc = useQueryClient();
  // E-Niveau: Grundlage ist nur der Teil bis zur schriftlichen Arbeit (ohne Projektbereich).
  const sektoren = lerntyp === 'ehrgeizig'
    ? alleSektoren.filter((s) => s.sektor_typ !== 'projekte' && s.freischalt_bedingung?.modus !== 'nach_freigabe')
    : alleSektoren;
  const key = ['kompetenzkarte', einheit?.id, lerntyp];
  const { data: karte, isLoading } = useQuery({ queryKey: key, enabled: offen && !!einheit?.id, queryFn: () => ladeKompetenzkarte(einheit.id, lerntyp) });
  const { data: verweise = [] } = useQuery({
    queryKey: ['kompetenzVerweise', einheit?.id, lerntyp, sektoren],
    enabled: offen && !!einheit?.id,
    queryFn: () => kompetenzVerweise({ sektoren, aufgabenById }),
  });
  const [entwurf, setEntwurf] = React.useState(null);
  const [geaendert, setGeaendert] = React.useState(false);
  const [laedt, setLaedt] = React.useState(false);
  const [speichert, setSpeichert] = React.useState(false);
  React.useEffect(() => { if (!geaendert) setEntwurf(karte || null); }, [karte]); // eslint-disable-line react-hooks/exhaustive-deps

  const sichern = async (daten) => {
    const voll = { einheit_id: einheit.id, lerntyp, ...daten };
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
      const planLabel = lerntyp === 'ehrgeizig' ? 'Inhalte des gemeinsamen Lernplans Ehrgeizig/Passioniert bis zur schriftlichen Arbeit (E-Niveau)' : undefined;
      const kontext = await onlineTestKontext({ einheit, sektoren, aufgabenById, planLabel });
      const r = await kompetenzkarteBauen({ kontext, verweise, karte: entwurf, wunsch, verlauf, lerntyp });
      await sichern({ untertitel: r.untertitel, titel: r.titel, bereiche: r.bereiche, gespraech: [...verlauf, { role: 'assistant', content: r.nachricht }] });
    } finally {
      setLaedt(false);
    }
  };
  return { karte: entwurf, gespraech: karte?.gespraech || [], verweise, isLoading, laedt, speichert, geaendert, aendern, speichern, senden };
}