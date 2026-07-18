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
import { normalizeSektor } from '@/lib/lernpfadeUtils';
import { adaptLernpaketToPoolItem } from '@/lib/lernpaketAdapter';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { autoAssembleLerntyp } from '@/lib/dashboardAutoAssembly';
import * as SchuelerData from '@/services/schueler/SchuelerDataService';

export function useSchuelerPfad(einheitId, lerntyp) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => SchuelerData.getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const einheitQ = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => SchuelerData.getEinheit(einheitId),
    enabled: !!einheitId,
  });
  const einheit = einheitQ.data;

  const bausteineQ = useQuery({
    queryKey: ['systemBausteine', 'all'],
    queryFn: () => SchuelerData.listSystemBausteine(),
  });
  const systemBausteine = bausteineQ.data || [];

  const aufgabenQ = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => SchuelerData.listAufgabenByEinheit(einheitId),
    enabled: !!einheitId,
  });
  const aufgaben = aufgabenQ.data || [];

  const lernpaketeQ = useQuery({
    queryKey: ['lernpakete-by-einheit', einheitId],
    queryFn: () => SchuelerData.listLernpaketeByEinheit(einheitId),
    enabled: !!einheitId,
  });
  const lernpakete = lernpaketeQ.data || [];

  // Vorschau-Fallback: Ist das Dashboard dieses Lerntyps noch nicht
  // aufgebaut (leere Konfiguration), wird es unten on-the-fly aus der
  // Standardvorlage zusammengesetzt. Dafür brauchen wir die Themenfelder —
  // die Query läuft NUR in diesem Fall (enabled), kostet also im
  // Normalbetrieb nichts.
  const konfigLeer =
    !!einheit &&
    (!Array.isArray(einheit?.lernpfade_konfiguration?.[lerntyp]) ||
      einheit.lernpfade_konfiguration[lerntyp].length === 0);
  const themenfelderQ = useQuery({
    queryKey: ['themenfelder-by-einheit', einheitId],
    queryFn: () => SchuelerData.listThemenfelderByEinheit(einheitId),
    enabled: !!einheitId && konfigLeer,
  });

  // Globaler Aktivitäten-Katalog (für Aktivitäts-Namen in der Sub-Ansicht).
  const katalogQ = useQuery({
    queryKey: ['aktivitaetenKatalog', 'all'],
    queryFn: () => SchuelerData.getAktivitaetenKatalog(),
    staleTime: 5 * 60 * 1000,
  });
  const katalog = katalogQ.data || [];

  const fortschrittQueryKey = ['schuelerAktFortschritt', user?.email, einheitId, lerntyp];
  const fortschrittQ = useQuery({
    queryKey: fortschrittQueryKey,
    queryFn: () => SchuelerData.listAktivitaetFortschritt(user.email, einheitId, lerntyp),
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

  // Diagnose: Welche Abfrage(n) sind fehlgeschlagen und warum?
  const fehlerDetails = useMemo(() => {
    const namen = ['Einheit', 'Bausteine', 'Aufgaben', 'Lernpakete', 'Katalog', 'Fortschritt'];
    const details = kernQueries
      .map((q, i) => (q.isError ? `${namen[i]}: ${q.error?.message || 'Unbekannter Fehler'}` : null))
      .filter(Boolean);
    if (details.length === 0 && !einheitId) details.push('Keine Einheit-ID in der URL gefunden.');
    if (details.length === 0 && einheitQ.isSuccess && !einheitQ.data) details.push('Einheit wurde nicht gefunden (leere Antwort).');
    return details;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [einheitQ.status, bausteineQ.status, aufgabenQ.status, lernpaketeQ.status, katalogQ.status, fortschrittQ.status, einheitId, einheitQ.data]);
  // Retry lädt ALLE Kern-Daten neu (nicht nur die als fehlerhaft markierten):
  // Auch erfolgreich-aber-leer beantwortete Abfragen (z. B. Einheit = null nach
  // Verbindungsproblemen) werden so repariert.
  const retry = useCallback(
    () =>
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['einheit', einheitId] }),
        queryClient.refetchQueries({ queryKey: ['systemBausteine', 'all'] }),
        queryClient.refetchQueries({ queryKey: ['allgemeineAufgaben', einheitId] }),
        queryClient.refetchQueries({ queryKey: ['lernpakete-by-einheit', einheitId] }),
        queryClient.refetchQueries({ queryKey: ['aktivitaetenKatalog', 'all'] }),
        queryClient.refetchQueries({ queryKey: ['authUser'] }),
        queryClient.refetchQueries({ queryKey: fortschrittQueryKey }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, einheitId, user?.email, lerntyp]
  );

  // ── Abgeleitete Maps ────────────────────────────────────────────────
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

  const sektoren = useMemo(() => {
    const raw = einheit?.lernpfade_konfiguration?.[lerntyp] || [];
    if (raw.length > 0) return raw.map(normalizeSektor);
    // On-the-fly-Fallback (Vorschau unfertiger Einheiten): Dashboard noch
    // nicht aufgebaut → Standardvorlage anwenden + Bündel automatisch mit
    // den vorhandenen Inhalten der Einheit befüllen. Rein lokal, es wird
    // NICHTS gespeichert. Warten, bis Themenfelder geladen sind, damit die
    // Arbeitsphasen korrekt pro Themenfeld entstehen.
    if (!einheit || !lerntyp) return [];
    const template = DASHBOARD_TEMPLATES[lerntyp];
    if (!Array.isArray(template) || themenfelderQ.isLoading) return [];
    const assembled = autoAssembleLerntyp({}, lerntyp, template, themenfelderQ.data || [], {
      aufgaben,
      lernpakete,
      systemBausteineById: bausteinById,
    });
    return (assembled[lerntyp] || []).map(normalizeSektor);
  }, [einheit, lerntyp, themenfelderQ.isLoading, themenfelderQ.data, aufgaben, lernpakete, bausteinById]);

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
        await SchuelerData.updateAktivitaetFortschritt(existing.id, {
          status: 'erledigt',
          versuche: (existing.versuche || 0) + 1,
          letzte_bearbeitung_am: now,
          erledigt_am: now,
          sektor_id: sektor?.sektor_id || existing.sektor_id,
        });
      } else {
        await SchuelerData.createAktivitaetFortschritt({
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
        queryFn: () => SchuelerData.getAktivitaetenByLernpaket(lernpaketId),
        staleTime: 60 * 1000,
      }),
    [queryClient]
  );

  return {
    user,
    einheit,
    isLoading,
    isError,
    fehlerDetails,
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