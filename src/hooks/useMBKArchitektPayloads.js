/**
 * useMBKArchitektPayloads.js
 *
 * Lädt alle Rohdaten, die der "Architekt"-Generator (Generator 1 der internen
 * MBK) braucht, und baut daraus die zwei benötigten Payloads on-the-fly:
 *
 *   - uiConfigPayload      (entspricht Air-Gap Payload 1, ohne ExportPrompts-Lookup)
 *   - structurePayload     (entspricht Air-Gap Payload 2, ohne ExportPrompts-Lookup)
 *
 * Bewusst ohne Lookup in der `ExportPrompts`-Tabelle: die interne MBK ist ein
 * paralleler Pfad zum manuellen Air-Gap-Workflow und soll von dessen DB-Records
 * unabhängig sein. Die Payload-Struktur ist dieselbe — wir nutzen die existierenden
 * Builder aus `lib/mbkAirGapPayloads.js`, weil sie reine Funktionen sind.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  buildUiConfigPayload,
  buildStructurePayload,
} from '@/lib/mbkAirGapPayloads';
import {
  computeUiConfigHash,
  computeSystemContextHash,
} from '@/lib/systemContextHash';

export function useMBKArchitektPayloads(einheitId) {
  // ── Einheit selbst (für Lernpfade-Konfiguration + Meta) ──
  const { data: einheit, isLoading: loadingEinheit } = useQuery({
    queryKey: ['mbk-architekt-einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  // ── Themenfelder ──
  const { data: themenfelder = [], isLoading: loadingTf } = useQuery({
    queryKey: ['mbk-architekt-tf', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // ── Lernpakete ──
  const { data: lernpakete = [], isLoading: loadingLp } = useQuery({
    queryKey: ['mbk-architekt-lp', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  // ── Lernziele (gefiltert über paketIds) ──
  const { data: lernziele = [], isLoading: loadingLz } = useQuery({
    queryKey: ['mbk-architekt-lz', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  // ── Phase-Aktivitäten ──
  const { data: phaseAktivitaeten = [], isLoading: loadingPa } = useQuery({
    queryKey: ['mbk-architekt-pa', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  // ── Aktivitäten-Katalog (app-weit) ──
  const { data: aktivitaetenKatalog = [], isLoading: loadingKat } = useQuery({
    queryKey: ['mbk-architekt-katalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    staleTime: 60_000,
  });

  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  // ── Allgemeine Aufgaben ──
  const { data: allgemeineAufgaben = [], isLoading: loadingAa } = useQuery({
    queryKey: ['mbk-architekt-aa', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // ── Systembausteine (app-weit) ──
  const { data: systemBausteine = [], isLoading: loadingSb } = useQuery({
    queryKey: ['mbk-architekt-sysbausteine'],
    queryFn: () => base44.entities.SystemBausteine.list('-created_date', 200),
    staleTime: 60_000,
  });

  // ── Globale MBK-Prompts (für UI-Config) ──
  const { data: globalPrompts = [], isLoading: loadingGp } = useQuery({
    queryKey: ['mbk-architekt-globalprompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const isLoading =
    loadingEinheit || loadingTf || loadingLp || loadingLz || loadingPa
    || loadingKat || loadingAa || loadingSb || loadingGp;

  // ── Hashes berechnen (deterministisch). ──
  // Für den Architekten brauchen wir nur ui_config_hash + system_context_hash;
  // Stammdaten/Schul-Nomenklatur sind hier nicht relevant (gehen in Payload 3
  // = System-Kontext, den der Architekt nicht braucht).
  const uiConfigHash = useMemo(
    () => computeUiConfigHash({ globalPrompts }),
    [globalPrompts]
  );
  const systemContextHash = useMemo(
    () => computeSystemContextHash({
      stammdaten: {},
      schulNomenklatur: [],
      globalPrompts,
    }),
    [globalPrompts]
  );

  // ── Payloads bauen (memoisiert). ──
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

  // ── Voraussetzungen prüfen: was fehlt zum Generieren? ──
  const missingPrereqs = useMemo(() => {
    const out = [];
    if (!einheitId) out.push('Einheit nicht gewählt');
    if (einheitId && !isLoading) {
      const ui = uiConfigPayload?.ui_global_config;
      if (!ui?.css_variables) out.push('UI-Config: css_variables (in den globalen MBK-Prompts pflegen)');
      if (!ui?.tab_bar_html) out.push('UI-Config: tab_bar_html (in den globalen MBK-Prompts pflegen)');
      const mappingLen = structurePayload?.scorm_file_mapping?.length || 0;
      if (mappingLen === 0) out.push('Strukturpayload: scorm_file_mapping ist leer (Lernpfade pflegen)');
    }
    return out;
  }, [einheitId, isLoading, uiConfigPayload, structurePayload]);

  return {
    isLoading,
    einheit,
    uiConfigPayload,
    structurePayload,
    uiConfigHash,
    systemContextHash,
    missingPrereqs,
  };
}