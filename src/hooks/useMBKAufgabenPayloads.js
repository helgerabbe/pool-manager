/**
 * useMBKAufgabenPayloads.js
 *
 * Lädt alle Rohdaten, die der "Aufgaben-Bauer" (Generator 2) braucht, und
 * baut die drei nötigen Payloads on-the-fly:
 *
 *   - uiConfigPayload      (Payload 1)
 *   - structurePayload     (Payload 2)
 *   - taskContentPayload   (Payload 3)
 *
 * Bewusst ohne Lookup in der `ExportPrompts`-Tabelle — die interne MBK ist
 * ein paralleler Pfad zum manuellen Air-Gap-Workflow. Alle Builder kommen
 * aus `lib/mbkAirGapPayloads.js` (reine Funktionen, keine Side-Effects).
 *
 * Liefert zusätzlich die Liste der "Zieldateien" (Lernpaket-Monolith,
 * Themenfeld-Bündel, Projekt-Bündel), die der AufgabenTab als Slots
 * rendert. KI-Fragmente und System-Bausteine sind explizit NICHT dabei —
 * die übernehmen Generator 3 und Generator 4.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  buildUiConfigPayload,
  buildStructurePayload,
  buildTaskContentBundle,
  extractNavigationContextByRefId,
} from '@/lib/mbkAirGapPayloads';
import {
  computeUiConfigHash,
  computeSystemContextHash,
} from '@/lib/systemContextHash';

const TASK_KINDS = new Set(['lernpaket', 'themenfeld_bundle', 'projekt_bundle']);

export function useMBKAufgabenPayloads(einheitId) {
  // ── Einheit + Stammdaten der Einheit. ──
  const { data: einheit, isLoading: loadingEinheit } = useQuery({
    queryKey: ['mbk-aufgaben-einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  const { data: themenfelder = [], isLoading: loadingTf } = useQuery({
    queryKey: ['mbk-aufgaben-tf', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [], isLoading: loadingLp } = useQuery({
    queryKey: ['mbk-aufgaben-lp', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  const { data: lernziele = [], isLoading: loadingLz } = useQuery({
    queryKey: ['mbk-aufgaben-lz', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: phaseAktivitaeten = [], isLoading: loadingPa } = useQuery({
    queryKey: ['mbk-aufgaben-pa', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: masterAufgaben = [], isLoading: loadingMa } = useQuery({
    queryKey: ['mbk-aufgaben-master', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.MasterAufgabe.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: aktivitaetenKatalog = [], isLoading: loadingKat } = useQuery({
    queryKey: ['mbk-aufgaben-katalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    staleTime: 60_000,
  });
  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  const { data: allgemeineAufgaben = [], isLoading: loadingAa } = useQuery({
    queryKey: ['mbk-aufgaben-aa', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: systemBausteine = [], isLoading: loadingSb } = useQuery({
    queryKey: ['mbk-aufgaben-sysbausteine'],
    queryFn: () => base44.entities.SystemBausteine.list('-created_date', 200),
    staleTime: 60_000,
  });

  const { data: globalPrompts = [], isLoading: loadingGp } = useQuery({
    queryKey: ['mbk-architekt-globalprompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const isLoading =
    loadingEinheit || loadingTf || loadingLp || loadingLz || loadingPa
    || loadingMa || loadingKat || loadingAa || loadingSb || loadingGp;

  // ── Hashes. ──
  const uiConfigHash = useMemo(
    () => computeUiConfigHash({ globalPrompts }),
    [globalPrompts]
  );
  const systemContextHash = useMemo(
    () => computeSystemContextHash({ stammdaten: {}, schulNomenklatur: [], globalPrompts }),
    [globalPrompts]
  );

  // ── Payloads. ──
  const uiConfigPayload = useMemo(() => {
    if (!einheitId) return null;
    return buildUiConfigPayload({ globalPrompts, uiConfigHash });
  }, [einheitId, globalPrompts, uiConfigHash]);

  const structurePayload = useMemo(() => {
    if (!einheitId || !einheit) return null;
    return buildStructurePayload({
      einheit,
      themenfelder,
      lernpakete,
      lernziele,
      phaseAktivitaeten,
      katalogById,
      allgemeineAufgaben,
      systemBausteine,
      systemContextHash,
      uiConfigHash,
    });
  }, [
    einheitId, einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
    katalogById, allgemeineAufgaben, systemBausteine,
    systemContextHash, uiConfigHash,
  ]);

  // Allgemeine Aufgaben für Task-Content (Ebene 2 + 3, alle):
  const allgemeineAufgabenForTaskContent = useMemo(() => {
    return (allgemeineAufgaben || []).filter((aa) => {
      const isEbene3 = aa?.anforderungsebene === '3 - Projekt';
      const isProjektAnker = aa?.aufgaben_typ === 'projekt_anker';
      // Ebene 2 (alles außer Ebene 3) + Ebene 3 — wir nehmen alle, weil
      // sowohl Themenfeld-Bündel als auch Projekt-Bündel über den
      // Task-Content-Builder bedient werden.
      return true;
    });
  }, [allgemeineAufgaben]);

  const taskContentPayload = useMemo(() => {
    if (!einheitId || !einheit || !structurePayload) return null;
    const navByRefId = extractNavigationContextByRefId(structurePayload?.scorm_file_mapping || []);
    return buildTaskContentBundle({
      einheit,
      lernpakete,
      lernziele,
      phaseAktivitaeten,
      katalogById,
      masterAufgaben,
      allgemeineAufgabenEbene23: allgemeineAufgabenForTaskContent,
      navigationContextByRefId: navByRefId,
      systemContextHash,
      uiConfigHash,
    });
  }, [
    einheitId, einheit, structurePayload, lernpakete, lernziele, phaseAktivitaeten,
    katalogById, masterAufgaben, allgemeineAufgabenForTaskContent,
    systemContextHash, uiConfigHash,
  ]);

  // ── Slots ableiten: alle Aufgaben-Hüllen aus dem scorm_file_mapping. ──
  //
  // Pro Slot werden ein menschenlesbarer Titel (displayTitle) und ein
  // Untertitel (subtitle) berechnet, damit die UI nicht nur die kryptische
  // task-<uuid>.html anzeigt. Lernpakete bekommen "Themenfeld X · Paket Y",
  // Bündel zeigen das Themenfeld bzw. die Einheit + Aufgaben-Anzahl.
  const taskSlots = useMemo(() => {
    const mapping = structurePayload?.scorm_file_mapping || [];
    const themenfeldById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
    const lernpaketById = new Map((lernpakete || []).map((lp) => [lp.id, lp]));
    return mapping
      .filter((e) => TASK_KINDS.has(e.kind))
      .map((e) => {
        let displayTitle = e.titel || e.filename;
        let subtitle = null;

        if (e.kind === 'lernpaket') {
          const lp = lernpaketById.get(e.source_id);
          const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) : null;
          displayTitle = lp?.titel_des_pakets || e.titel || 'Lernpaket';
          subtitle = tf?.titel
            ? `Themenfeld: ${tf.titel}`
            : 'Ohne Themenfeld';
        } else if (e.kind === 'themenfeld_bundle') {
          const isOrphan = e.source_id === 'orphan';
          const tf = isOrphan ? null : themenfeldById.get(e.source_id);
          displayTitle = isOrphan
            ? 'Allgemeine Aufgaben ohne Themenfeld'
            : (tf?.titel || e.titel || 'Themenfeld-Bündel');
          const count = (e.contained_aufgabe_ids || []).length;
          subtitle = `${count} Aufgabe${count === 1 ? '' : 'n'} (Ebene 2)`;
        } else if (e.kind === 'projekt_bundle') {
          displayTitle = e.titel || 'Projekte der Einheit';
          const count = (e.contained_aufgabe_ids || []).length;
          subtitle = `${count} Projekt${count === 1 ? '' : 'e'} (Ebene 3)`;
        }

        return {
          filename: e.filename,
          kind: e.kind,
          title: e.titel || e.filename,
          displayTitle,
          subtitle,
          sourceId: e.source_id,
          containsPlaceholders: !!e.contains_placeholders,
          placeholderActivityIds: e.placeholder_activity_ids || [],
        };
      });
  }, [structurePayload, themenfelder, lernpakete]);

  // ── Voraussetzungen. ──
  const missingPrereqs = useMemo(() => {
    const out = [];
    if (!einheitId) out.push('Einheit nicht gewählt');
    if (einheitId && !isLoading) {
      const ui = uiConfigPayload?.ui_global_config;
      if (!ui?.css_variables) out.push('UI-Config: css_variables (in den globalen MBK-Prompts pflegen)');
      if (!ui?.tab_bar_html) out.push('UI-Config: tab_bar_html (in den globalen MBK-Prompts pflegen)');
      if (taskSlots.length === 0) out.push('Keine Aufgaben-Hüllen im SCORM-Mapping (Lernpakete / Aufgaben pflegen)');
    }
    return out;
  }, [einheitId, isLoading, uiConfigPayload, taskSlots]);

  return {
    isLoading,
    einheit,
    uiConfigPayload,
    structurePayload,
    taskContentPayload,
    taskSlots,
    uiConfigHash,
    systemContextHash,
    missingPrereqs,
  };
}