import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { onlineTestKontext, onlineTestBauen } from '@/lib/kiOnlineTest';

/** Lädt, erstellt und überarbeitet den Online-Test einer Einheit (Pragmatiker). */
export default function useOnlineTest({ einheit, sektoren, aufgabenById, offen }) {
  const qc = useQueryClient();
  const key = ['onlineTest', einheit?.id];
  const { data: test, isLoading } = useQuery({
    queryKey: key,
    enabled: offen && !!einheit?.id,
    queryFn: async () => (await base44.entities.OnlineTest.filter({ einheit_id: einheit.id, lerntyp: 'pragmatiker' }))[0] || null,
  });
  const [laedt, setLaedt] = React.useState(false);

  const senden = async (wunsch) => {
    setLaedt(wunsch || true);
    const verlauf = [...(test?.gespraech || []), ...(wunsch ? [{ role: 'user', content: wunsch }] : [])];
    try {
      const kontext = await onlineTestKontext({ einheit, sektoren, aufgabenById });
      const r = await onlineTestBauen({ kontext, test, wunsch, verlauf });
      const daten = {
        einheit_id: einheit.id, lerntyp: 'pragmatiker', titel: r.titel, aufgaben: r.aufgaben,
        hintergrund: r.hintergrund, erwartungshorizont: r.erwartungshorizont,
        gespraech: [...verlauf, { role: 'assistant', content: r.nachricht }],
      };
      const neu = test ? await base44.entities.OnlineTest.update(test.id, daten) : await base44.entities.OnlineTest.create(daten);
      qc.setQueryData(key, neu);
    } finally {
      setLaedt(false);
    }
  };
  return { test, isLoading, laedt, senden };
}