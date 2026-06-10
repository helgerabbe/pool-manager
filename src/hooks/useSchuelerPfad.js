/**
 * useSchuelerPfad.js
 *
 * Lädt alle Daten, die die Schüleransicht eines Lernpfads braucht, und
 * verwaltet den persönlichen Fortschritt (SchuelerAktivitaetFortschritt).
 *
 * - Einheit + Konfiguration (lernpfade_konfiguration[lerntyp])
 * - System-Bausteine (für Bündel-Erkennung + Titel/Icons)
 * - Aufgaben + Lernpakete der Einheit (für Item-Titel)
 * - Fortschritt des Schülers für diese Einheit × Lerntyp
 *
 * Bietet `markErledigt(item, sektor)` zum Setzen/Aktualisieren des
 * Fortschritts mit reichen Feldern (Versuche, Zeitstempel, Status).
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { normalizeSektor } from '@/lib/lernpfadeUtils';
import { adaptLernpaketToPoolItem } from '@/lib/lernpaketAdapter';
import { getAktivitaetenByLernpaket, getAktivitaetenKatalog } from '@/services/AktivitaetService';

export function useSchuelerPfad(einheitId, lerntyp) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const einheitQ = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });
  const einheit = einheitQ.data;

  const bausteineQ = useQuery({
    queryKey: ['systemBausteine', 'all'],
    queryFn: () => base44.entities.SystemBausteine.list('reihenfolge'),
  });
  const systemBausteine = bausteineQ.data || [];

  const aufgabenQ = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });
  const aufgaben = aufgabenQ.data || [];

  const lernpaketeQ = useQuery({
    queryKey: ['lernpakete-by-einheit', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });
  const lernpakete = lernpaketeQ.data || [];

  // Globaler Aktivitäten-Katalog (für Aktivitäts-Namen in der Sub-Ansicht).
  const katalogQ = useQuery({
    queryKey: ['aktivitaetenKatalog', 'all'],
    queryFn: () => getAktivitaetenKatalog(),
    staleTime: 5 * 60 * 1000,
  });
  const katalog = katalogQ.data || [];

  const fortschrittQueryKey = ['schuelerAktFortschritt', user?.email, einheitId, lerntyp];
  const fortschrittQ = useQuery({
    queryKey: fortschrittQueryKey,
    queryFn: () =>
      base44.entities.SchuelerAktivitaetFortschritt.filter({
        user_email: user.email,
        einheit_id: einheitId,
        lerntyp,
      }),
    enabled: !!user?.email && !!einheitId && !!lerntyp,
  });
  const fortschritte = fortschrittQ.data || [];

  // ── Sicherheitsstufe: UI erst zeigen, wenn ALLE Kern-Daten sauber da sind ──
  // Vorher steuerte nur `einheitLoading` den Spinner – Aufgaben/Lernpakete/
  // Bausteine defaulteten auf [], wodurch die Oberfläche mit Platzhaltern
  // („Aufgabe") erschien, obwohl die Daten noch fehlten oder fehlschlugen.
  const kernQueries = [einheitQ, bausteineQ, aufgabenQ, lernpaketeQ, katalogQ, fortschrittQ];
  const isLoading = kernQueries.some((q) => q.isLoading);
  const isError = kernQueries.some((q) => q.isError);
  const retry = useCallback(
    () => Promise.all(kernQueries.filter((q) => q.isError).map((q) => q.refetch())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [einheitQ.isError, bausteineQ.isError, aufgabenQ.isError, lernpaketeQ.isError, katalogQ.isError, fortschrittQ.isError]
  );

  // ── Abgeleitete Maps ────────────────────────────────────────────────
  const sektoren = useMemo(() => {
    const raw = einheit?.lernpfade_konfiguration?.[lerntyp] || [];
    return raw.map(normalizeSektor);
  }, [einheit?.lernpfade_konfiguration, lerntyp]);

  const bausteinById = useMemo(() => {
    const map = new Map();
    (systemBausteine || []).forEach((b) => map.set(b.baustein_id, b));
    return map;
  }, [systemBausteine]);

  const aufgabenById = useMemo(() => {
    const map = new Map();
    (aufgaben || []).forEach((a) => map.set(a.id, a));
    (lernpakete || []).forEach((lp) => {
      const adapted = adaptLernpaketToPoolItem(lp);
      if (adapted) map.set(adapted.id, adapted);
    });
    return map;
  }, [aufgaben, lernpakete]);

  // instance_id → status (für Gating).
  const fortschrittByInstance = useMemo(() => {
    const map = new Map();
    (fortschritte || []).forEach((f) => map.set(f.instance_id, f.status));
    return map;
  }, [fortschritte]);

  // instance_id → kompletter Fortschritts-Record (für Versuche/Update).
  const recordByInstance = useMemo(() => {
    const map = new Map();
    (fortschritte || []).forEach((f) => map.set(f.instance_id, f));
    return map;
  }, [fortschritte]);

  // instance_id → status, AUCH für Lernpaket-Aktivitäten (zusammengesetzte
  // Keys `<lernpaketInstanceId>::<aktivitaetId>`). Wird vom Lernpaket-
  // Durcharbeiten gebraucht, um pro Aktivität „erledigt" anzuzeigen.
  const fortschrittByCompositeId = fortschrittByInstance;

  // ── Mutation: Aktivität als erledigt markieren ──────────────────────
  const markErledigt = useCallback(
    async (item, sektor) => {
      if (!user?.email || !einheitId || !item?.instance_id) return;
      const now = new Date().toISOString();
      const existing = recordByInstance.get(item.instance_id);

      if (existing) {
        await base44.entities.SchuelerAktivitaetFortschritt.update(existing.id, {
          status: 'erledigt',
          versuche: (existing.versuche || 0) + 1,
          letzte_bearbeitung_am: now,
          erledigt_am: now,
          sektor_id: sektor?.sektor_id || existing.sektor_id,
        });
      } else {
        await base44.entities.SchuelerAktivitaetFortschritt.create({
          user_email: user.email,
          einheit_id: einheitId,
          lerntyp,
          instance_id: item.instance_id,
          sektor_id: sektor?.sektor_id || null,
          item_type: item.type,
          ref_id: item.ref_id,
          themenfeld_id: sektor?.themenfeld_id || null,
          status: 'erledigt',
          versuche: 1,
          erste_bearbeitung_am: now,
          letzte_bearbeitung_am: now,
          erledigt_am: now,
        });
      }
      await queryClient.invalidateQueries({ queryKey: fortschrittQueryKey });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.email, einheitId, lerntyp, recordByInstance, queryClient]
  );

  const katalogById = useMemo(() => {
    const map = new Map();
    (katalog || []).forEach((k) => map.set(k.id, k));
    return map;
  }, [katalog]);

  // Lazy-Loader: Aktivitäten eines Lernpakets (per React-Query-Cache).
  const loadLernpaketAktivitaeten = useCallback(
    (lernpaketId) =>
      queryClient.fetchQuery({
        queryKey: ['lernpaketAktivitaeten', lernpaketId],
        queryFn: () => getAktivitaetenByLernpaket(lernpaketId),
        staleTime: 60 * 1000,
      }),
    [queryClient]
  );

  return {
    user,
    einheit,
    isLoading,
    isError,
    retry,
    sektoren,
    bausteinById,
    aufgabenById,
    katalogById,
    fortschrittByInstance,
    fortschrittByCompositeId,
    markErledigt,
    loadLernpaketAktivitaeten,
  };
}