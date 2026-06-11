/**
 * useEinheitZeitTracker.js
 *
 * Loggt die in einer Einheit verbrachte Lernzeit minutengenau mit.
 * Solange das Einheit-Dashboard gemountet UND der Tab sichtbar ist, wird
 * jede volle Minute der Tages-Datensatz (SchuelerEinheitZeitLog) für
 * (user_email, einheit_id, heutiges Datum) um 1 Minute hochgezählt.
 * Keine Sekunden – bewusst grob, schülergerecht.
 */
import { useEffect, useRef } from 'react';
import { listZeitLogs, createZeitLog, updateZeitLog } from '@/services/schueler/SchuelerDataService';

function heuteLokal() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${t}`;
}

export function useEinheitZeitTracker(einheitId, userEmail) {
  // Gecachter Tages-Record, damit nicht jede Minute neu gesucht werden muss.
  const recordRef = useRef(null); // { id, datum, minuten }
  const busyRef = useRef(false);

  useEffect(() => {
    if (!einheitId || !userEmail) return;
    recordRef.current = null;

    const tick = async () => {
      if (document.hidden || busyRef.current) return;
      busyRef.current = true;
      try {
        const datum = heuteLokal();
        // Tageswechsel oder erster Tick: passenden Record suchen/anlegen.
        if (!recordRef.current || recordRef.current.datum !== datum) {
          const list = await listZeitLogs({
            user_email: userEmail,
            einheit_id: einheitId,
            datum,
          });
          recordRef.current = list[0]
            ? { id: list[0].id, datum, minuten: list[0].minuten || 0 }
            : null;
        }
        if (recordRef.current) {
          const neu = recordRef.current.minuten + 1;
          await updateZeitLog(recordRef.current.id, { minuten: neu });
          recordRef.current.minuten = neu;
        } else {
          const created = await createZeitLog({
            user_email: userEmail,
            einheit_id: einheitId,
            datum,
            minuten: 1,
          });
          recordRef.current = { id: created.id, datum, minuten: 1 };
        }
      } catch {
        // Stilles Scheitern – Tracking darf das Lernen nie blockieren.
      } finally {
        busyRef.current = false;
      }
    };

    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [einheitId, userEmail]);
}