import React from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { planeFoliensatz, baueFolie } from '@/lib/kiFoliensatz';

/** Foliensatz einer Methode je Fach: planen, Folie für Folie bauen, einzelne Folien neu bauen, speichern. */
export default function useFoliensatz(methode, werte, fach) {
  const [vorlagen, setVorlagen] = React.useState(methode.grafik_vorlagen || {});
  const [planen, setPlanen] = React.useState(false);
  const satz = vorlagen[fach]?.folien ? vorlagen[fach] : null;
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
      plan = await planeFoliensatz(m, f);
    } catch (e) {
      toast.error('Die Folienfolge konnte nicht geplant werden.');
      setPlanen(false);
      return;
    }
    setPlanen(false);
    setVorlagen((v) => ({ ...v, [f]: { ...plan, erstellt_am: new Date().toISOString() } }));
    await Promise.all(plan.folien.map((folie) => bauen(f, plan, folie)));
    setVorlagen((v) => { speichern(v); return v; });
  };

  const folieNeu = async (folie) => {
    await bauen(fach, satz, folie);
    setVorlagen((v) => { speichern(v); return v; });
  };

  return { satz, planen, allesBauen, folieNeu };
}