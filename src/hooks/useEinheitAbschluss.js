/**
 * useEinheitAbschluss.js
 *
 * Setzt automatisch das Abgeschlossen-Flag am SchuelerEinheitFortschritt,
 * sobald der Schüler ALLE sichtbaren Items seines Lernpfads in der Einheit
 * erledigt hat. Friert dabei den Lerntyp ein, mit dem die Einheit beendet
 * wurde. Wird nur einmal gesetzt (kein Zurücksetzen bei späterem Wechsel).
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useEinheitAbschluss({ einheitId, lerntyp, userEmail, erledigtAnzahl, gesamtAnzahl }) {
  const queryClient = useQueryClient();
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
  }, [einheitId, userEmail]);

  useEffect(() => {
    if (doneRef.current) return;
    if (!einheitId || !userEmail || !lerntyp) return;
    if (!gesamtAnzahl || erledigtAnzahl < gesamtAnzahl) return;

    doneRef.current = true;
    (async () => {
      try {
        const list = await base44.entities.SchuelerEinheitFortschritt.filter({
          user_email: userEmail,
          einheit_id: einheitId,
        });
        const record = list[0];
        if (!record || record.abgeschlossen) return;
        await base44.entities.SchuelerEinheitFortschritt.update(record.id, {
          abgeschlossen: true,
          abgeschlossen_am: new Date().toISOString(),
          abgeschlossen_lerntyp: lerntyp,
        });
        queryClient.invalidateQueries({ queryKey: ['schuelerFortschritt'] });
      } catch {
        doneRef.current = false; // beim nächsten Render erneut versuchen
      }
    })();
  }, [einheitId, lerntyp, userEmail, erledigtAnzahl, gesamtAnzahl, queryClient]);
}