/**
 * useAirGapPayloads
 *
 * Lädt alle Daten einer Einheit und baut daraus die sechs MBK-Air-Gap-
 * Payloads (0–5). Gemeinsame Grundlage für den ZIP-Download und den
 * GitHub-Export, damit die Payload-Erzeugung nur an EINER Stelle lebt.
 *
 * Rückgabe:
 *   { einheit, payloads: [{ name, content }] | null, baseSlug, ordnerSlug }
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import {
  buildUiConfigPayload,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentBundle,
  buildMicroPayloadBundle,
  buildSystembausteinPayloadBundle,
  extractNavigationContextByRefId,
} from '@/lib/mbkAirGapPayloads';
import { computeSystemContextHash, computeUiConfigHash } from '@/lib/systemContextHash';
import { slugify } from '@/lib/airGapClipboard';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';

export function useAirGapPayloads(einheitId) {
  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.MasterAufgabe.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const allgemeineAufgabenEbene23 = useMemo(
    () => allgemeineAufgaben.filter(
      (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
    ),
    [allgemeineAufgaben]
  );

  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine'],
    queryFn: () => base44.entities.SystemBausteine.list('-created_date', 200),
    staleTime: 60_000,
  });

  const { data: schulNomenklatur = [] } = useQuery({
    queryKey: ['schulNomenklatur'],
    queryFn: () => base44.entities.SchulNomenklatur.list('-updated_date', 200),
    staleTime: 60_000,
  });

  const { data: globalPrompts = [] } = useQuery({
    queryKey: ['mbkGlobalPrompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const { data: inhaltSnapshots = [] } = useQuery({
    queryKey: ['schuelerInhaltSnapshots', einheitId],
    queryFn: () => base44.entities.SchuelerInhaltSnapshot.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const currentHash = useMemo(
    () => computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts }),
    [stammdaten, schulNomenklatur, globalPrompts]
  );
  const currentUiHash = useMemo(
    () => computeUiConfigHash({ globalPrompts }),
    [globalPrompts]
  );

  const payloads = useMemo(() => {
    if (!einheit) return null;

    const uiConfig = buildUiConfigPayload({ globalPrompts, uiConfigHash: currentUiHash });
    const sysCtx = buildSystemContextPayload({
      stammdaten, schulNomenklatur, globalPrompts, systemContextHash: currentHash,
    });
    const structure = buildStructurePayload({
      einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
      katalogById, allgemeineAufgaben, systemBausteine, inhaltSnapshots,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });
    const navCtx = extractNavigationContextByRefId(structure?.scorm_file_mapping || []);

    const taskContent = buildTaskContentBundle({
      einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById,
      masterAufgaben, allgemeineAufgabenEbene23,
      navigationContextByRefId: navCtx,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    const micro = buildMicroPayloadBundle({
      einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
      katalogById, masterAufgaben, allgemeineAufgaben,
      navigationContextByRefId: navCtx,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    const systembausteinePayload = buildSystembausteinPayloadBundle({
      einheit, themenfelder, lernpakete, lernziele, systemBausteine,
      navigationContextByRefId: navCtx,
      snapshots: inhaltSnapshots,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    return [
      { name: '0-ui-config.json',        content: uiConfig },
      { name: '1-system-context.json',   content: sysCtx },
      { name: '2-structure.json',        content: structure },
      { name: '3-task-content.json',     content: taskContent },
      { name: '4-micro-briefings.json',  content: micro },
      { name: '5-systembausteine.json',  content: systembausteinePayload },
    ];
  }, [
    einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
    katalogById, masterAufgaben, allgemeineAufgabenEbene23, allgemeineAufgaben,
    systemBausteine, inhaltSnapshots,
    currentHash, currentUiHash, globalPrompts, stammdaten, schulNomenklatur,
  ]);

  const baseSlug = slugify(einheit?.titel_der_einheit, einheitId || 'einheit');

  // Ordnername im Repo: Fach-Jahrgang-Titel, damit die Kurse eindeutig sind.
  const ordnerSlug = einheit
    ? slugify(
        `${einheit.fach || 'fach'}-${einheit.jahrgangsstufe || ''}-${einheit.titel_der_einheit || ''}`,
        einheitId || 'einheit'
      )
    : '';

  return { einheit, payloads, baseSlug, ordnerSlug };
}

export default useAirGapPayloads;