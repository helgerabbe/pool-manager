import React from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { planeFoliensatz, baueFolie } from '@/lib/kiFoliensatz';
import { standardSatz } from '@/lib/standardFoliensaetze';

/** Foliensatz einer Methode je Fach: planen, Folie für Folie bauen, einzelne Folien neu bauen, speichern. */
// Analog und digital getrennt (2026-10-21): Schlüssel "<Fach> · digital"; analog nutzt den bisherigen Schlüssel "<Fach>".
export default function useFoliensatz(methode, werte, fachName, kanal, ziel) {
  const fach = kanal === 'digital' ? `${fachName} · digital` : fachName;
  const [vorlagen, setVorlagen] = React.useState(methode.grafik_vorlagen || {});
  const [planen, setPlanen] = React.useState(false);
  const satz = standardSatz(methode.name, kanal, ziel) || (vorlagen[fach]?.folien ? vorlagen[fach] : null);
  const m = { ...methode, ...werte };

  const speichern = (neu) => base44.entities.MethodenKatalog.update(methode.id, { grafik_vorlagen: neu });
  const setzeSatz = (f, s) => setVorlagen((v) => {
    const neu = { ...v, [f]: s(v[f]) };
    return neu;
  });
  const setzeFolie = (f, id, p) => setzeSatz(f, (s) => ({ ...s, folien: s.folien.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  const bauen = async (f, plan, folie) => {
    setzeFolie(f, folie.id, { status: 'baut' });
    try {
      const fertig = await baueFolie(m, f, plan, folie);
      setzeFolie(f, folie.id, fertig);
    } catch (e) {
      setzeFolie(f, folie.id, { status: 'fehler' });
    }
  };

  const allesBauen = async () => {
    const f = fach;
    setPlanen(true);
    let plan;
    try {
      plan = await planeFoliensatz(m, fachName, kanal, ziel);
    } catch (e) {
      toast.error('Die Folienfolge konnte nicht geplant werden.');
      setPlanen(false);
      return;
    }
    setPlanen(false);
    setVorlagen((v) => { const neu = { ...v, [f]: { ...plan, erstellt_am: new Date().toISOString() } }; speichern(neu); return neu; });
  };

  const folieNeu = async (folie) => {
    await bauen(fach, satz, folie);
    setVorlagen((v) => { speichern(v); return v; });
  };

  // Schritt 2: alle noch leeren Standardfolien nacheinander bauen.
  const standardsBauen = async () => {
    for (const folie of satz.folien.filter((x) => x.standard && x.vorlage === 'entwurf')) await bauen(fach, satz, folie);
    setVorlagen((v) => { speichern(v); return v; });
  };

  return { satz, planen, allesBauen, folieNeu, standardsBauen };
}