import React from 'react';
import { base44 } from '@/api/base44Client';
import { ueberfuehren } from '@/lib/stundenbaukasten';

/** Lädt eine Stunde, überführt sie beim ersten Öffnen ins neue Modell und speichert jede Änderung. */
export default function useStundenbaukasten(id) {
  const [stunde, setStunde] = React.useState(null);
  const [einheitTitel, setEinheitTitel] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    (async () => {
      const s = await base44.entities.Unterrichtsstunde.get(id);
      if (s.stundenbau?.version !== 2) {
        s.stundenbau = ueberfuehren(s);
        await base44.entities.Unterrichtsstunde.update(s.id, { stundenbau: s.stundenbau });
      }
      ref.current = s.stundenbau;
      setStunde(s);
      if (s.unterrichtseinheit_id) setEinheitTitel((await base44.entities.Unterrichtseinheit.get(s.unterrichtseinheit_id))?.titel || '');
    })();
  }, [id]);

  const aendern = React.useCallback(async (patch) => {
    const neu = { ...ref.current, ...patch };
    ref.current = neu;
    setStunde((s) => ({ ...s, stundenbau: neu }));
    await base44.entities.Unterrichtsstunde.update(id, { stundenbau: neu });
  }, [id]);

  return { stunde, bk: stunde?.stundenbau, einheitTitel, aendern };
}