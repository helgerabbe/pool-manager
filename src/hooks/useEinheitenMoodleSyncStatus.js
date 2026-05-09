/**
 * useEinheitenMoodleSyncStatus.js
 *
 * Lädt für eine Liste von Einheiten in 4 Bulk-Queries (Themenfelder,
 * Lernpakete, Aktivitäten, Allgemeine Aufgaben) die Timestamps und
 * berechnet pro Einheit den Moodle-Sync-Status (new / in_sync /
 * out_of_sync) anhand `lib/einheitMoodleSyncStatus.js`.
 *
 * Rückgabe: Map<einheitId, 'new'|'in_sync'|'out_of_sync'>.
 *
 * Bewusst schlank gehalten: nur `updated_date` + `einheit_id` /
 * `lernpaket_id` werden ausgewertet, keine teuren Joins.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { computeEinheitMoodleSyncStatus } from '@/lib/einheitMoodleSyncStatus';

export function useEinheitenMoodleSyncStatus(einheiten) {
  const einheitIds = useMemo(
    () => (einheiten || []).map((e) => e.id).filter(Boolean),
    [einheiten]
  );
  const idsKey = einheitIds.join(',');

  // Nur Einheiten, die bereits published sind, brauchen die Drift-Prüfung.
  // Für 'new'-Einheiten reicht die Einheit selbst.
  const publishedIds = useMemo(
    () =>
      (einheiten || [])
        .filter((e) => !!e.export_published_at)
        .map((e) => e.id),
    [einheiten]
  );
  const publishedKey = publishedIds.join(',');

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['einheitensync', 'themenfelder', publishedKey],
    queryFn: () =>
      publishedIds.length === 0
        ? []
        : base44.entities.Themenfeld.filter({ einheit_id: { $in: publishedIds } }),
    enabled: publishedIds.length > 0,
    staleTime: 30_000,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['einheitensync', 'lernpakete', publishedKey],
    queryFn: () =>
      publishedIds.length === 0
        ? []
        : base44.entities.Lernpakete.filter({ einheit_id: { $in: publishedIds } }),
    enabled: publishedIds.length > 0,
    staleTime: 30_000,
  });

  const lernpaketIds = useMemo(() => lernpakete.map((lp) => lp.id), [lernpakete]);
  const lpKey = lernpaketIds.join(',');

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['einheitensync', 'phaseAktivitaeten', lpKey],
    queryFn: () =>
      lernpaketIds.length === 0
        ? []
        : base44.entities.LernpaketPhaseAktivitaet.filter({
            lernpaket_id: { $in: lernpaketIds },
          }),
    enabled: lernpaketIds.length > 0,
    staleTime: 30_000,
  });

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['einheitensync', 'allgemeineAufgaben', publishedKey],
    queryFn: () =>
      publishedIds.length === 0
        ? []
        : base44.entities.AllgemeineAufgabe.filter({
            einheit_id: { $in: publishedIds },
          }),
    enabled: publishedIds.length > 0,
    staleTime: 30_000,
  });

  const statusMap = useMemo(() => {
    const tfByEinheit = new Map();
    for (const tf of themenfelder) {
      const arr = tfByEinheit.get(tf.einheit_id) || [];
      arr.push(tf);
      tfByEinheit.set(tf.einheit_id, arr);
    }
    const lpByEinheit = new Map();
    const lpEinheitById = new Map();
    for (const lp of lernpakete) {
      lpEinheitById.set(lp.id, lp.einheit_id);
      const arr = lpByEinheit.get(lp.einheit_id) || [];
      arr.push(lp);
      lpByEinheit.set(lp.einheit_id, arr);
    }
    const paByEinheit = new Map();
    for (const pa of phaseAktivitaeten) {
      const eid = lpEinheitById.get(pa.lernpaket_id);
      if (!eid) continue;
      const arr = paByEinheit.get(eid) || [];
      arr.push(pa);
      paByEinheit.set(eid, arr);
    }
    const aaByEinheit = new Map();
    for (const aa of allgemeineAufgaben) {
      const arr = aaByEinheit.get(aa.einheit_id) || [];
      arr.push(aa);
      aaByEinheit.set(aa.einheit_id, arr);
    }

    const out = new Map();
    for (const e of einheiten || []) {
      out.set(
        e.id,
        computeEinheitMoodleSyncStatus({
          einheit: e,
          themenfelder: tfByEinheit.get(e.id) || [],
          lernpakete: lpByEinheit.get(e.id) || [],
          phaseAktivitaeten: paByEinheit.get(e.id) || [],
          allgemeineAufgaben: aaByEinheit.get(e.id) || [],
        })
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, themenfelder, lernpakete, phaseAktivitaeten, allgemeineAufgaben]);

  return statusMap;
}