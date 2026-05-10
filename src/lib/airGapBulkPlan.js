/**
 * airGapBulkPlan.js
 *
 * Reine Plan-Logik für den Air-Gap-Bulk-Generator. Analog zu
 * `exportPromptBulkPlan.js`, aber für die vier Air-Gap-Payload-Typen:
 *   - mbk_system_context        (1× pro Einheit)
 *   - mbk_structure_payload     (1× pro Einheit)
 *   - mbk_task_content_payload  (n× pro Einheit, ein Item pro Lernpaket
 *                                bzw. Allg. Aufgabe Ebene 2/3)
 *   - mbk_micro_payload         (n× pro Einheit, ein Item pro KI-Aktivität
 *                                bzw. KI-Allg.-Aufgabe)
 *
 * Skipping-Regeln:
 *   - manuell angepasste Records (is_customized=true) werden übersprungen
 *   - Items, deren Quelle blockiert ist (Erstellungspaket-Logik), werden
 *     für mbk_task_content_payload genauso wie im Legacy-Pfad übersprungen
 *
 * Out-of-Sync-Erkennung:
 *   Source-Timestamp aus dem vorberechneten tsIndex + Hash-Vergleich
 *   (system_context_hash_at_generation vs. currentSystemContextHash).
 */
import {
  buildUiConfigPayload,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentItemForLernpaket,
  buildTaskContentItemForAllgemeineAufgabe,
  buildMicroPayloadForActivity,
  buildMicroPayloadForAllgemeineAufgabe,
  buildSystembausteinPayloadItem,
  extractNavigationContextByRefId,
  isMicroBriefingActivity,
  makeSystembausteinReferenceId,
  MBK_AIRGAP_VERSION,
} from '@/lib/mbkAirGapPayloads';
import {
  findExistingPrompt,
  isPromptOutOfSync,
  isErstellungspaketBlocked,
  lookupSourceMaxTimestampFromIndex,
} from '@/lib/exportPromptSync';

const TYPES = {
  UI: 'mbk_ui_config',
  SYS: 'mbk_system_context',
  STRUCT: 'mbk_structure_payload',
  TASK: 'mbk_task_content_payload',
  MICRO: 'mbk_micro_payload',
  SYSBAUSTEIN: 'mbk_systembaustein_payload',
};

const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * Status-Werte (kompatibel mit dem MBKBulkPreviewDialog):
 *   'new' | 'update' | 'skip-customized' | 'skip-blocked' | 'skip-current'
 *
 * Im Air-Gap-Pfad gibt es kein 'skip-manual' (Persona-Sonderfall).
 * Stattdessen 'skip-current': Quelle ist nicht out-of-sync und Record
 * existiert bereits → kein Re-Write nötig (spart DB-Roundtrips).
 */
function classify({ existing, blockReason, isOutOfSync }) {
  if (blockReason) return { status: 'skip-blocked', skipReason: blockReason };
  if (existing?.is_customized) {
    return { status: 'skip-customized', skipReason: 'Manuell angepasst — nicht überschrieben.' };
  }
  if (!existing) return { status: 'new' };
  if (isOutOfSync) return { status: 'update' };
  return { status: 'skip-current', skipReason: 'Bereits aktuell — kein Re-Write nötig.' };
}

export function buildAirGapBulkPlan({
  einheitId,
  einheit,
  stammdaten,
  schulNomenklatur = [],
  globalPrompts = [],
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById,
  masterAufgaben = [],
  allgemeineAufgaben = [],
  allgemeineAufgabenEbene23 = [],
  systemBausteine = [],
  prompts,
  tsIndex,
  systemContextHash,
  uiConfigHash,
}) {
  if (!einheit) return [];

  const items = [];
  const lookup = (promptType, referenceId = null) =>
    findExistingPrompt(prompts, { einheitId, promptType, referenceId });
  const tsFor = (promptType, referenceId = null) =>
    lookupSourceMaxTimestampFromIndex(tsIndex, promptType, referenceId);
  // airgap-1.5.0: zentraler Drift-Check mit beiden Hashes parallel.
  const isOoSFor = (existing, sourceMaxTs) =>
    isPromptOutOfSync(existing, sourceMaxTs, systemContextHash, uiConfigHash);

  // Lookup-Maps für effiziente Item-Builds (analog zum UI-Panel).
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }
  const phasenByPaket = new Map();
  for (const pa of phaseAktivitaeten) {
    if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
    phasenByPaket.get(pa.lernpaket_id).push(pa);
  }
  const masterByPaket = new Map();
  for (const m of masterAufgaben) {
    if (!masterByPaket.has(m.lernpaket_id)) masterByPaket.set(m.lernpaket_id, []);
    masterByPaket.get(m.lernpaket_id).push(m);
  }
  const themenfeldById = new Map(themenfelder.map((tf) => [tf.id, tf]));
  // Alias für die Systembaustein-Builder, die `themenfelderById` als
  // Parameter erwarten — semantisch identisch zu themenfeldById.
  const themenfelderById = themenfeldById;
  const lernpaketById = new Map(lernpakete.map((lp) => [lp.id, lp]));

  // airgap-1.4.0: nav-Context-Map einmal aus dem Strukturpayload ableiten
  // und an alle Item-Builder durchreichen, damit auch die DB-persistierten
  // Records `injection_points.back_targets` tragen.
  const structurePayloadForNav = buildStructurePayload({
    einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
    katalogById, allgemeineAufgaben, systemBausteine,
    systemContextHash, uiConfigHash,
  });
  const navigationContextByRefId = extractNavigationContextByRefId(
    structurePayloadForNav?.scorm_file_mapping || []
  );
  const navFor = (refId) => navigationContextByRefId.get(refId) || [];

  // ── 0. UI-Config (airgap-1.5.0) ──────────────────────────────────────
  {
    const existing = lookup(TYPES.UI);
    const sourceMaxTs = tsFor(TYPES.UI);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
    items.push({
      key: 'mbk-ui',
      label: 'UI-Config',
      section: 'mbk_ui_config',
      promptType: TYPES.UI,
      referenceId: null,
      status,
      skipReason,
      buildPayload: () =>
        buildUiConfigPayload({ globalPrompts, uiConfigHash }),
      sourceMaxTs,
      existing,
    });
  }

  // ── 1. System-Kontext ────────────────────────────────────────────────
  {
    const existing = lookup(TYPES.SYS);
    const sourceMaxTs = tsFor(TYPES.SYS);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
    items.push({
      key: 'mbk-sys',
      label: 'System-Kontext',
      section: 'mbk_system_context',
      promptType: TYPES.SYS,
      referenceId: null,
      status,
      skipReason,
      buildPayload: () =>
        buildSystemContextPayload({
          stammdaten,
          schulNomenklatur,
          globalPrompts,
          systemContextHash,
        }),
      sourceMaxTs,
      existing,
    });
  }

  // ── 2. Struktur ───────────────────────────────────────────────────────
  {
    const existing = lookup(TYPES.STRUCT);
    const sourceMaxTs = tsFor(TYPES.STRUCT);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
    items.push({
      key: 'mbk-struct',
      label: 'Struktur der Einheit',
      section: 'mbk_structure_payload',
      promptType: TYPES.STRUCT,
      referenceId: null,
      status,
      skipReason,
      buildPayload: () =>
        buildStructurePayload({
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
        }),
      sourceMaxTs,
      existing,
    });
  }

  // ── 3. Task-Content (pro Lernpaket + pro Allg. Aufgabe Ebene 2/3) ────
  const lernpaketeSorted = [...lernpakete].sort(
    (a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)
  );
  for (const lp of lernpaketeSorted) {
    const existing = lookup(TYPES.TASK, lp.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: lp.id, lernpakete, allgemeineAufgaben,
    });
    const sourceMaxTs = tsFor(TYPES.TASK, lp.id);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, blockReason, isOutOfSync: isOoS });
    items.push({
      key: `mbk-task-lp::${lp.id}`,
      label: `📦 Lernpaket: ${lp.titel_des_pakets || '(ohne Titel)'}`,
      section: 'mbk_task_content_payload',
      promptType: TYPES.TASK,
      referenceId: lp.id,
      status,
      skipReason,
      buildPayload: () =>
        buildTaskContentItemForLernpaket({
          lernpaket: lp,
          lernziele: zieleByPaket.get(lp.id) || [],
          phaseAktivitaeten: phasenByPaket.get(lp.id) || [],
          katalogById,
          masterAufgaben: masterByPaket.get(lp.id) || [],
          navigationContext: navFor(lp.id),
        }),
      sourceMaxTs,
      existing,
    });
  }
  for (const aa of allgemeineAufgabenEbene23) {
    const existing = lookup(TYPES.TASK, aa.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: aa.id, lernpakete, allgemeineAufgaben,
    });
    const sourceMaxTs = tsFor(TYPES.TASK, aa.id);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, blockReason, isOutOfSync: isOoS });
    const ebeneLabel = aa.anforderungsebene === '3 - Projekt' ? 'Ebene 3' : 'Ebene 2';
    items.push({
      key: `mbk-task-aa::${aa.id}`,
      label: `🎯 ${ebeneLabel}: ${aa.titel || '(ohne Titel)'}`,
      section: 'mbk_task_content_payload',
      promptType: TYPES.TASK,
      referenceId: aa.id,
      status,
      skipReason,
      buildPayload: () =>
        buildTaskContentItemForAllgemeineAufgabe({
          aufgabe: aa,
          navigationContext: navFor(aa.id),
        }),
      sourceMaxTs,
      existing,
    });
  }

  // ── 4. Micro-Briefings (KI-Aktivitäten + offene Aufgaben) ────────────
  // Offene Aufgaben tragen ihren didaktischen Auftrag in
  // `field_values.description` (oder den MasterAufgaben) und erfordern
  // ebenfalls ein Briefing an die MBK — sie laufen daher hier mit, auch
  // wenn `erstellungs_modus !== 'ki'`.
  // MasterAufgaben pro activity_id gruppieren (für offene Aufgaben).
  const masterByActivity = new Map();
  for (const m of masterAufgaben) {
    if (!m?.activity_id) continue;
    if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
    masterByActivity.get(m.activity_id).push(m);
  }
  for (const pa of phaseAktivitaeten) {
    if (!isMicroBriefingActivity(pa, katalogById)) continue;
    const lp = lernpaketById.get(pa.lernpaket_id) || null;
    const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) || null : null;
    const existing = lookup(TYPES.MICRO, pa.id);
    const sourceMaxTs = tsFor(TYPES.MICRO, pa.id);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
    const katalog = katalogById?.get?.(pa.aktivitaet_id);
    items.push({
      key: `mbk-micro-pa::${pa.id}`,
      label: `🤖 ${katalog?.name || 'Aktivität'} · ${lp?.titel_des_pakets || '—'}`,
      section: 'mbk_micro_payload',
      promptType: TYPES.MICRO,
      referenceId: pa.id,
      status,
      skipReason,
      buildPayload: () =>
        buildMicroPayloadForActivity({
          einheit,
          aktivitaet: pa,
          lernpaket: lp,
          themenfeld: tf,
          phaseAktivitaetenInPaket: phasenByPaket.get(pa.lernpaket_id) || [],
          lernziele: zieleByPaket.get(pa.lernpaket_id) || [],
          katalogById,
          masterAufgabenForActivity: masterByActivity.get(pa.id) || [],
          // Fragment erbt nav-Context von der Hülle (= Lernpaket).
          navigationContext: lp ? navFor(lp.id) : [],
          systemContextHash,
          uiConfigHash,
        }),
      sourceMaxTs,
      existing,
    });
  }
  for (const aa of allgemeineAufgaben) {
    if (aa.erstellungs_modus !== 'ki') continue;
    const tf = aa.themenfeld_id ? themenfeldById.get(aa.themenfeld_id) || null : null;
    const existing = lookup(TYPES.MICRO, aa.id);
    const sourceMaxTs = tsFor(TYPES.MICRO, aa.id);
    const isOoS = isOoSFor(existing, sourceMaxTs);
    const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
    items.push({
      key: `mbk-micro-aa::${aa.id}`,
      label: `🤖 ${aa.titel || 'Aufgabe'} (${aa.anforderungsebene || '—'})`,
      section: 'mbk_micro_payload',
      promptType: TYPES.MICRO,
      referenceId: aa.id,
      status,
      skipReason,
      buildPayload: () =>
        buildMicroPayloadForAllgemeineAufgabe({
          einheit,
          aufgabe: aa,
          themenfeld: tf,
          navigationContext: navFor(aa.id),
          systemContextHash,
          uiConfigHash,
        }),
      sourceMaxTs,
      existing,
    });
  }

  // ── 5. Systembaustein-Briefings (airgap-1.6.0) ───────────────────────
  // Pro Lerntyp × baustein_id genau ein Item, sofern der Baustein im
  // jeweiligen Lernpfad referenziert ist (strikte 1:1-Zuordnung Pfad ↔
  // Briefing ↔ SCORM-Datei).
  const bausteinByKey = new Map(
    (systemBausteine || []).map((b) => [b.baustein_id, b])
  );
  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    const seenInLerntyp = new Set();
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type !== 'system' || !item?.ref_id) continue;
        if (seenInLerntyp.has(item.ref_id)) continue;
        seenInLerntyp.add(item.ref_id);
        const bausteinId = item.ref_id;
        const refId = makeSystembausteinReferenceId(lt, bausteinId);
        const existing = lookup(TYPES.SYSBAUSTEIN, refId);
        const sourceMaxTs = tsFor(TYPES.SYSBAUSTEIN, refId);
        const isOoS = isOoSFor(existing, sourceMaxTs);
        const { status, skipReason } = classify({ existing, isOutOfSync: isOoS });
        const baustein = bausteinByKey.get(bausteinId);
        items.push({
          key: `mbk-sysbaustein::${refId}`,
          label: `🧩 ${baustein?.titel || bausteinId} · ${lt}`,
          section: 'mbk_systembaustein_payload',
          promptType: TYPES.SYSBAUSTEIN,
          referenceId: refId,
          // Zusatzfelder für die UI-Gruppierung pro Lerntyp.
          lerntyp: lt,
          bausteinId,
          status,
          skipReason,
          buildPayload: () =>
            buildSystembausteinPayloadItem({
              einheit,
              lerntyp: lt,
              bausteinId,
              systemBaustein: baustein || null,
              lerntypPfad: sektoren,
              themenfelderById,
              lernpakete,
              lernziele,
              navigationContext: navFor(refId),
              systemContextHash,
              uiConfigHash,
            }),
          sourceMaxTs,
          existing,
        });
      }
    }
  }

  return items;
}

/**
 * Wandelt den Plan in das Schreib-Payload für `bulkUpsertExportPrompts`.
 * Das `content`-Feld enthält den stringified JSON-Payload (siehe Schema:
 * "Air-Gap: stringified JSON, das beim Copy/Paste in Markdown-Codefences
 * gewickelt wird").
 */
export function airGapPlanToWritePayload(plan, { systemContextHash, uiConfigHash } = {}) {
  return plan
    .filter((it) => it.status === 'new' || it.status === 'update')
    .map((it) => ({
      prompt_type: it.promptType,
      reference_id: it.referenceId,
      content: JSON.stringify(it.buildPayload()),
      is_customized: false,
      source_updated_at: new Date(it.sourceMaxTs || Date.now()).toISOString(),
      template_version: MBK_AIRGAP_VERSION,
      system_context_hash_at_generation: systemContextHash || null,
      ui_config_hash_at_generation: uiConfigHash || null,
    }));
}

/**
 * Aggregiert den Air-Gap-Plan auf die vier Block-Status, die das
 * MBKAirGapPanel pro Block braucht. Damit kann das Panel ohne eigenes
 * Re-Compute den DB-getriebenen Stale-Indikator pro Block anzeigen.
 *
 * Liefert pro Block:
 *   - dbDeliveredCount: Anzahl Records, die existieren und nicht out-of-sync sind
 *   - dbStaleCount:     Anzahl Records, die existieren aber out-of-sync sind
 *   - dbMissingCount:   Anzahl Items, für die noch gar kein Record existiert
 *   - hasAnyStale:      irgendetwas in diesem Block ist stale
 */
export function aggregateAirGapPlanByBlock(plan) {
  const blocks = {
    mbk_ui_config: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
    mbk_system_context: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
    mbk_structure_payload: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
    mbk_task_content_payload: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
    mbk_micro_payload: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
    mbk_systembaustein_payload: { dbDeliveredCount: 0, dbStaleCount: 0, dbMissingCount: 0, hasAnyStale: false, total: 0 },
  };
  for (const it of plan) {
    const b = blocks[it.section];
    if (!b) continue;
    b.total += 1;
    if (it.status === 'new') b.dbMissingCount += 1;
    else if (it.status === 'update') {
      b.dbStaleCount += 1;
      b.hasAnyStale = true;
    } else if (it.status === 'skip-current' || it.status === 'skip-customized') {
      b.dbDeliveredCount += 1;
    }
    // skip-blocked ist im Aggregat neutral (wird weder als stale noch
    // als delivered gewertet, sondern als „Quelle nicht freigegeben").
  }
  return blocks;
}