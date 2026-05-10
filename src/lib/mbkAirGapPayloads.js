/**
 * mbkAirGapPayloads.js
 *
 * Deterministische Builder für die vier Air-Gap-Payloads (siehe
 * docs/mbk-air-gap-uebergabe.md):
 *
 *   1. buildSystemContextPayload    → Payload 1: globaler System-Kontext
 *   2. buildStructurePayload         → Payload 2: Struktur einer Einheit
 *   3. buildTaskContentPayload       → Payload 3: pro Lernpaket / pro Aufgabe
 *   4. buildMicroPayload             → Payload 4: pro KI-Aktivität / pro Aufgabe
 *
 * Reine Funktionen — keine I/O, keine Side-Effects, keine LLM-Aufrufe.
 * Output ist ein **strukturiertes JS-Objekt** (kein vorgerendertes JSON-String).
 * Die UI/Persistenz-Schicht erledigt `JSON.stringify` selbst, damit die
 * Builder testbar bleiben, ohne JSON-Parse-Roundtrips zu erzwingen.
 *
 * Konventionen:
 *   - **null** = Wert ist nicht gesetzt (statt undefined oder leerer String).
 *   - **leeres Array** = strukturell vorhanden, aber keine Items.
 *   - Alle Quell-IDs werden 1:1 durchgereicht, damit die MBK Cross-References
 *     auflösen kann (Sektor → Erstellungspaket → Micro-Briefing).
 *   - Konsistente meta-Blöcke pro Payload für Cache-Invalidierung und
 *     Hash-Mismatch-Erkennung auf MBK-Seite.
 *
 * **Wichtig:** Bei jeder strukturellen Änderung an den Schemas MUSS
 * `MBK_AIRGAP_VERSION` hochgezählt werden. Der Out-of-Sync-Check
 * (lib/exportPromptSync.js) vergleicht diese Version zusätzlich zur
 * source_updated_at, sodass Schema-Updates alle Air-Gap-Payloads
 * automatisch als veraltet markieren.
 */

import { getSektorTypLabel } from '@/lib/sektorTypen';

/**
 * Versionskennung der Air-Gap-Payload-Engine.
 * Wird bei jedem Build in `meta.schema_version` geschrieben und beim
 * Persistieren als `template_version` der ExportPrompts-Records.
 */
export const MBK_AIRGAP_VERSION = 'airgap-1.3.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * SCORM-Modularitäts-Vertrag (airgap-1.2.0 / Bündel-Modell).
 *
 * Wird von Payload 1 als FESTE, einheits-/inhalts-UNABHÄNGIGE Anweisung an
 * die MBK übergeben. Inhalt darf den system_context_hash NICHT kippen, wenn
 * sich Aufgaben ändern — deshalb steht hier nur die generische Regel,
 * niemals konkrete IDs.
 *
 * Die einheits-spezifische Mapping-Tabelle (welche ID → welcher Dateiname)
 * lebt in Payload 2 (`scorm_file_mapping`) und ändert sich mit der Einheit.
 */
const SCORM_DELIVERY_CONTRACT = {
  rule: 'bundle_per_kind',
  filename_patterns: {
    lernpaket: 'task-<lernpaket_id>.html',
    themenfeld_bundle: 'tasks-themenfeld-<themenfeld_id>.html',
    themenfeld_bundle_orphan: 'tasks-themenfeld-orphan.html',
    projekt_bundle: 'projekte-einheit-<einheit_id>.html',
    system_baustein: 'system-<baustein_id>.html',
    dashboard: 'dashboard-<lerntyp>.html',
    fragment: 'fragment-<activity_id>.html',
  },
  manifest_filename: 'imsmanifest.xml',
  // Pflicht-Dashboards (airgap-1.3.0): Vier Differenzierungs-Einstiegs-
  // punkte, die in JEDER Einheit existieren MÜSSEN, unabhängig vom
  // Inhalt der Lernpfade. Sie sind die ersten Items im SCORM-Manifest.
  mandatory_dashboards: [
    'dashboard-minimalist.html',
    'dashboard-pragmatiker.html',
    'dashboard-ehrgeizig.html',
    'dashboard-passioniert.html',
  ],
  description:
    'Bündel-Vertrag: Pro Lernpaket genau eine Monolith-HTML. Allgemeine '
    + 'Aufgaben Ebene 2 werden pro Themenfeld in einer HTML gebündelt; '
    + 'Aufgaben ohne Themenfeld landen in der Orphan-Datei. Allgemeine '
    + 'Aufgaben Ebene 3 (Projekte) werden pro Einheit in einer einzigen '
    + 'HTML zusammengefasst. System-Bausteine werden pro baustein_id '
    + 'einmal generiert (deduplizierte Datei). Zusätzlich MÜSSEN immer '
    + 'die vier Pflicht-Dashboards (dashboard-<lerntyp>.html) als '
    + 'Differenzierungs-Einstiegspunkte erzeugt werden. KI-Aktivitäten '
    + 'werden NICHT als eigenständige Tasks ausgegeben, sondern als '
    + 'HTML-Fragmente (fragment-<activity_id>.html), die ein nachgelagerter '
    + 'Merger in die deterministischen Hüllen einsetzt. Bei jeder Änderung '
    + 'an einem Bündel-Element wird das gesamte Bündel neu generiert (kein '
    + 'Patching). Die zentrale imsmanifest.xml ist der einzige Index und '
    + 'muss bei jeder Strukturänderung neu generiert werden.',
};

/** Filename-Builder pro Datei-Typ. Reine String-Kompositoren — keine Validierung. */
function fnLernpaket(lernpaketId) {
  return `task-${lernpaketId}.html`;
}
function fnThemenfeldBundle(themenfeldId) {
  return `tasks-themenfeld-${themenfeldId}.html`;
}
function fnThemenfeldBundleOrphan() {
  return `tasks-themenfeld-orphan.html`;
}
function fnProjektBundle(einheitId) {
  return `projekte-einheit-${einheitId}.html`;
}
function fnSystemBaustein(bausteinId) {
  return `system-${bausteinId}.html`;
}
function fnFragment(activityId) {
  return `fragment-${activityId}.html`;
}
function fnDashboard(lerntyp) {
  return `dashboard-${lerntyp}.html`;
}

/**
 * Liefert `null` statt leerer Strings, damit das JSON-Schema
 * "Wert nicht gesetzt" sauber abbildet (siehe Designprinzip §4 im
 * docs/mbk-integration.md).
 */
function nullable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  return value;
}

/**
 * Lookup für globale MBK-Prompts; nur aktive Einträge werden berücksichtigt.
 * Liefert `null`, wenn der Schlüssel nicht (mehr) gepflegt ist.
 */
function lookupGlobal(globalPrompts, schluessel) {
  if (!Array.isArray(globalPrompts) || !schluessel) return null;
  const found = globalPrompts.find(
    (p) => p?.schluessel === schluessel && p?.ist_aktiv !== false
  );
  return nullable(found?.prompt_text);
}

/**
 * Normalisiert eine Conventions-Liste (key/value) für ein Fach.
 * Inaktive/leere Einträge werden übersprungen, Reihenfolge bleibt erhalten.
 */
function normalizeConventions(conventions) {
  if (!Array.isArray(conventions)) return [];
  return conventions
    .map((c) => ({
      key: nullable(c?.key),
      value: nullable(c?.value),
    }))
    .filter((c) => c.key && c.value);
}

/**
 * Erzeugt einen meta-Block mit den festen Pflichtfeldern.
 * `nowIso` ist parametrisierbar, damit Tests deterministisch bleiben können.
 */
function makeMeta({
  payloadType,
  einheitId = null,
  systemContextHash = null,
  itemCount = null,
  nowIso = null,
}) {
  const exportedAt = nowIso || new Date().toISOString();
  const meta = {
    schema_version: MBK_AIRGAP_VERSION,
    payload_type: payloadType,
    exported_at: exportedAt,
  };
  if (einheitId !== null) meta.einheit_id = einheitId;
  if (systemContextHash !== null) meta.system_context_hash = systemContextHash;
  if (itemCount !== null) meta.item_count = itemCount;
  return meta;
}

// ── 1. Payload 1: System-Kontext ────────────────────────────────────────────

/**
 * Payload 1: schul-/fach-/jahrgangs-übergreifender System-Kontext.
 *
 * Enthält:
 *   - Stammdaten (Land, Bundesland, Schulform)
 *   - Schul-Nomenklatur (pro Fach: conventions + global_style)
 *   - aktive globale MBK-Prompts (Mission, Lerntypen, Operatoren, …)
 *
 * @param {object} args
 * @param {object} args.stammdaten           — { land, bundesland, schulform }
 * @param {Array}  args.schulNomenklatur     — SchulNomenklatur[]
 * @param {Array}  args.globalPrompts        — MBKGlobalPrompt[]
 * @param {string} args.systemContextHash    — vorberechneter Hash (16 Hex-Zeichen)
 * @param {string} [args.nowIso]             — optional, für deterministische Tests
 */
export function buildSystemContextPayload({
  stammdaten = {},
  schulNomenklatur = [],
  globalPrompts = [],
  systemContextHash,
  nowIso = null,
}) {
  const meta = makeMeta({
    payloadType: 'mbk_system_context',
    systemContextHash: systemContextHash || null,
    nowIso,
  });

  // Stammdaten — leere Strings → null.
  const stammdatenOut = {
    land: nullable(stammdaten?.land),
    bundesland: nullable(stammdaten?.bundesland),
    schulform: nullable(stammdaten?.schulform),
  };

  // Schul-Nomenklatur fach-indiziert ausgeben.
  // Inaktive Fächer (`ist_aktiv === false`) werden übersprungen — sie sollen
  // weder den Hash kippen lassen noch im Payload auftauchen.
  const nomenklatur = {};
  for (const rec of schulNomenklatur || []) {
    if (!rec || rec.ist_aktiv === false) continue;
    const fach = nullable(rec.fach);
    if (!fach) continue;
    const conventions = normalizeConventions(rec.conventions);
    const globalStyle = nullable(rec.global_style);
    if (conventions.length === 0 && !globalStyle) continue;
    nomenklatur[fach] = {
      conventions,
      global_style: globalStyle,
    };
  }

  // Globale MBK-Prompts: nur die hash-relevanten Felder, sortiert nach Schlüssel
  // damit der Output stabil ist (Reorder im Manager-Tab darf den Payload nicht
  // verändern).
  const globalPromptsOut = (globalPrompts || [])
    .filter((p) => p && p.ist_aktiv !== false)
    .map((p) => ({
      schluessel: nullable(p.schluessel),
      kategorie: nullable(p.kategorie),
      anzeigename: nullable(p.anzeigename),
      prompt_text: nullable(p.prompt_text),
    }))
    .filter((p) => p.schluessel)
    .sort((a, b) => a.schluessel.localeCompare(b.schluessel));

  // Bequemer Direkt-Lookup für Kern-Schlüssel — die MBK kann sie auch über
  // die globalPromptsOut-Liste finden, aber als fest verdrahtete Top-Level-
  // Felder sind sie für den System-Prompt sofort greifbar.
  const directLookups = {
    mission_statement: lookupGlobal(globalPrompts, 'global_mission_statement'),
    persona_global: lookupGlobal(globalPrompts, 'global_persona'),
    lerntypen_definition: lookupGlobal(globalPrompts, 'def_lerntypen'),
    struktur_definition: lookupGlobal(globalPrompts, 'def_struktur'),
    persona_generator_anweisung: lookupGlobal(globalPrompts, 'persona_generator_anweisung'),
  };

  return {
    meta,
    stammdaten: stammdatenOut,
    schul_nomenklatur: nomenklatur,
    global_prompts: globalPromptsOut,
    direct_lookups: directLookups,
    // Generische SCORM-Modularitäts-Anweisung. Bewusst inhalts-unabhängig,
    // damit der system_context_hash bei Aufgaben-Änderungen nicht kippt.
    scorm_delivery_contract: SCORM_DELIVERY_CONTRACT,
  };
}

// ── 2. Payload 2: Struktur der Einheit ───────────────────────────────────────

/**
 * Reduziert eine `LernpaketPhaseAktivitaet` auf einen schlanken Struktur-Eintrag.
 * Inhalte (field_values, ki_briefing, transkript) bleiben hier WEG — sie gehören
 * nach Payload 3 bzw. 4.
 */
function summarizePhaseAktivitaet(pa, katalogById) {
  const katalog = katalogById?.get(pa?.aktivitaet_id) || null;
  return {
    activity_id: pa?.id || null,
    aktivitaet_katalog_id: pa?.aktivitaet_id || null,
    aktivitaet_name: nullable(katalog?.name),
    phase: nullable(pa?.phase),
    reihenfolge: pa?.reihenfolge ?? null,
    erstellungs_modus: pa?.erstellungs_modus || 'manuell',
    is_complete: pa?.is_complete === true,
  };
}

/**
 * Reduziert ein Lernpaket auf einen Struktur-Eintrag (ohne Inhalts-Details).
 */
function summarizeLernpaket(lp, phasenDesPakets, katalogById) {
  return {
    lernpaket_id: lp.id,
    titel: nullable(lp.titel_des_pakets),
    themenfeld_id: lp.themenfeld_id || null,
    reihenfolge_nummer: lp.reihenfolge_nummer ?? null,
    geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten ?? null,
    kernbegriffe: Array.isArray(lp.kernbegriffe) ? lp.kernbegriffe.filter(Boolean) : [],
    aktivitaeten: (phasenDesPakets || [])
      .slice()
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((pa) => summarizePhaseAktivitaet(pa, katalogById)),
  };
}

/**
 * Wandelt einen Sektor-Eintrag aus `lernpfade_konfiguration` in eine
 * portierbare Struktur um. Items werden hierarchisch (parent/children)
 * gerendert, damit Bündel-Verschachtelungen klar bleiben.
 */
function summarizeSektor(sektor, themenfelderById) {
  const items = Array.isArray(sektor?.items) ? sektor.items : [];
  const rootItems = items.filter((it) => !it?.parent_instance_id);
  const childrenByParent = new Map();
  for (const it of items) {
    if (it?.parent_instance_id) {
      if (!childrenByParent.has(it.parent_instance_id)) childrenByParent.set(it.parent_instance_id, []);
      childrenByParent.get(it.parent_instance_id).push(it);
    }
  }

  const renderItem = (it) => ({
    instance_id: it?.instance_id || null,
    type: it?.type || null,
    ref_id: it?.ref_id || null,
    parent_instance_id: it?.parent_instance_id || null,
    bundle_config: it?.bundle_config || null,
  });

  const itemsOut = [];
  rootItems.forEach((root) => {
    itemsOut.push(renderItem(root));
    const children = childrenByParent.get(root.instance_id) || [];
    children.forEach((child) => itemsOut.push(renderItem(child)));
  });

  const themenfeldTitel = sektor?.themenfeld_id
    ? nullable(sektor?.titel_snapshot) || nullable(themenfelderById.get(sektor.themenfeld_id)?.titel)
    : null;

  return {
    sektor_id: sektor?.sektor_id || null,
    sektor_typ: sektor?.sektor_typ || null,
    sektor_typ_label: getSektorTypLabel(sektor?.sektor_typ),
    titel: nullable(sektor?.titel),
    themenfeld_id: sektor?.themenfeld_id || null,
    themenfeld_titel: themenfeldTitel,
    items: itemsOut,
  };
}

/**
 * Payload 2: Struktur einer Einheit.
 *
 * Enthält die vollständige Lernlandkarte + Lernpfade pro Lerntyp + alle
 * AllgemeineAufgaben (auf Struktur-Niveau, ohne Inhalts-Details). Dient
 * der MBK als „Inhaltsverzeichnis", aus dem sie pro Item das passende
 * Erstellungspaket (Payload 3) bzw. Micro-Briefing (Payload 4) anfordert.
 *
 * @param {object} args
 * @param {object} args.einheit
 * @param {Array}  args.themenfelder
 * @param {Array}  args.lernpakete
 * @param {Array}  args.lernziele
 * @param {Array}  args.phaseAktivitaeten
 * @param {Map}    args.katalogById       — Map<aktivitaet_id, AktivitaetenKatalog>
 * @param {Array}  args.allgemeineAufgaben
 * @param {string} [args.systemContextHash]
 * @param {string} [args.nowIso]
 */
export function buildStructurePayload({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  allgemeineAufgaben = [],
  systemBausteine = [],
  systemContextHash = null,
  nowIso = null,
}) {
  const meta = makeMeta({
    payloadType: 'mbk_structure_payload',
    einheitId: einheit?.id || null,
    systemContextHash,
    nowIso,
  });

  // Themenfelder + Pakete sortieren.
  const themenfelderSorted = [...themenfelder].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );
  const themenfelderById = new Map(themenfelderSorted.map((tf) => [tf.id, tf]));

  // Lernpakete pro Themenfeld + Lernziele pro Lernpaket + Phase-Aktivitäten
  // pro Lernpaket vorgruppieren.
  const paketeByTf = new Map(themenfelderSorted.map((tf) => [tf.id, []]));
  const orphans = [];
  for (const lp of lernpakete) {
    if (lp.themenfeld_id && paketeByTf.has(lp.themenfeld_id)) {
      paketeByTf.get(lp.themenfeld_id).push(lp);
    } else {
      orphans.push(lp);
    }
  }
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

  const renderLernpaketEntry = (lp) => {
    const sum = summarizeLernpaket(lp, phasenByPaket.get(lp.id) || [], katalogById);
    sum.lernziele = (zieleByPaket.get(lp.id) || []).map((lz) => ({
      lernziel_id: lz.id || null,
      formulierung_fachsprache: nullable(lz.formulierung_fachsprache),
      kategorie: nullable(lz.kategorie),
      schueler_uebersetzung: nullable(lz.schueler_uebersetzung),
    }));
    return sum;
  };

  // Themenfelder-Block.
  const themenfelderOut = themenfelderSorted.map((tf) => ({
    themenfeld_id: tf.id,
    titel: nullable(tf.titel),
    beschreibung: nullable(tf.beschreibung),
    reihenfolge: tf.reihenfolge ?? null,
    bearbeitungsmodus: nullable(tf.bearbeitungsmodus),
    lernpakete: (paketeByTf.get(tf.id) || [])
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map(renderLernpaketEntry),
  }));

  // Allgemeine Aufgaben (Struktur-Niveau): nur Header-Felder, keine Inhalte.
  const allgemeineAufgabenOut = (allgemeineAufgaben || []).map((aa) => ({
    aufgabe_id: aa.id,
    titel: nullable(aa.titel),
    anforderungsebene: nullable(aa.anforderungsebene),
    aufgaben_typ: nullable(aa.aufgaben_typ),
    mission_type: nullable(aa.mission_type),
    themenfeld_id: aa.themenfeld_id || null,
    schwierigkeitsgrad: aa.schwierigkeitsgrad ?? null,
    erstellungs_modus: aa.erstellungs_modus || 'manuell',
    verlinkte_lernpaket_ids: Array.isArray(aa.verlinkte_lernpaket_ids) ? aa.verlinkte_lernpaket_ids : [],
    verlinkte_aufgaben_ids: Array.isArray(aa.verlinkte_aufgaben_ids) ? aa.verlinkte_aufgaben_ids : [],
    verlinkte_projekt_ids: Array.isArray(aa.verlinkte_projekt_ids) ? aa.verlinkte_projekt_ids : [],
  }));

  // Lernpfade pro Lerntyp (Sektoren + Items).
  const lernpfade = {};
  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    lernpfade[lt] = sektoren.map((s) => summarizeSektor(s, themenfelderById));
  }

  // ── SCORM-Mapping (airgap-1.3.0 / Bündel-Modell) ─────────────────────────
  // Fünf Datei-Typen:
  //   0. dashboard           → vier Pflicht-HTMLs pro Einheit (eine pro Lerntyp)
  //                            als Differenzierungs-Einstiegspunkte. IMMER
  //                            präsent, auch wenn der jeweilige Pfad leer ist.
  //   1. lernpaket           → eine Monolith-HTML pro Lernpaket
  //   2. themenfeld_bundle   → eine HTML pro Themenfeld mit Ebene-2-Aufgaben
  //                            (+ Orphan-Sammeldatei für Aufgaben ohne TF)
  //   3. projekt_bundle      → eine HTML pro Einheit mit allen Ebene-3-Aufgaben
  //   4. system_baustein     → eine HTML pro im Lernpfad genutztem Baustein
  //                            (deduplizierte Datei, mehrfach im Manifest verlinkbar)
  //
  // KI-Aktivitäten erhalten KEINEN eigenen Mapping-Eintrag — sie werden als
  // HTML-Fragmente (fragment-<id>.html) ausgeliefert und vom Merger in die
  // jeweilige Hülle eingesetzt. Im Mapping-Eintrag der Hülle markieren wir
  // mit `contains_placeholders=true`, dass der Merger dort aktiv werden muss.
  const scormFileMapping = [];

  // 0. Pflicht-Dashboards (eines pro Lerntyp). Immer alle vier — auch bei
  //    leerem Lernpfad, damit der MBK-Vertrag „4 Dashboards pro Einheit"
  //    erfüllt bleibt. Quelle der Items ist `lernpfade[lerntyp]` (oben).
  for (const lt of LERNTYP_KEYS) {
    scormFileMapping.push({
      kind: 'dashboard',
      source_id: lt,
      filename: fnDashboard(lt),
      titel: `Dashboard – ${lt}`,
      contains_placeholders: false,
      placeholder_activity_ids: [],
    });
  }

  // Helper: für eine gegebene Liste von Aufgaben-IDs → Liste der placeholder-
  // pflichtigen IDs (nur KI-Modus).
  const collectPlaceholderActivityIdsForLernpaket = (lpId) =>
    (phaseAktivitaeten || [])
      .filter((pa) => pa?.lernpaket_id === lpId && pa?.erstellungs_modus === 'ki')
      .map((pa) => pa.id);

  const collectPlaceholderAaIds = (aaList) =>
    (aaList || [])
      .filter((aa) => aa?.erstellungs_modus === 'ki')
      .map((aa) => aa.id);

  // 1. Lernpakete (immer, eines pro Paket).
  for (const lp of lernpakete) {
    const placeholderIds = collectPlaceholderActivityIdsForLernpaket(lp.id);
    scormFileMapping.push({
      kind: 'lernpaket',
      source_id: lp.id,
      filename: fnLernpaket(lp.id),
      titel: nullable(lp.titel_des_pakets),
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
    });
  }

  // 2. Themenfeld-Bündel (Ebene 2 — also alles, was NICHT Ebene 3 ist).
  //    Pro Themenfeld eine Datei, sofern dort tatsächlich Ebene-2-Aufgaben
  //    liegen. Aufgaben mit aufgaben_typ='projekt_anker' gehen nicht ins
  //    Themenfeld-Bündel — sie wandern ins Projekt-Bündel.
  const isEbene3 = (aa) => aa?.anforderungsebene === '3 - Projekt';
  const isProjektAnker = (aa) => aa?.aufgaben_typ === 'projekt_anker';
  const isEbene2 = (aa) => !isEbene3(aa) && !isProjektAnker(aa);

  const ebene2ByTf = new Map();
  const orphanEbene2 = [];
  for (const aa of allgemeineAufgaben || []) {
    if (!isEbene2(aa)) continue;
    if (aa.themenfeld_id && themenfelderById.has(aa.themenfeld_id)) {
      if (!ebene2ByTf.has(aa.themenfeld_id)) ebene2ByTf.set(aa.themenfeld_id, []);
      ebene2ByTf.get(aa.themenfeld_id).push(aa);
    } else {
      orphanEbene2.push(aa);
    }
  }

  for (const tf of themenfelderSorted) {
    const aaList = ebene2ByTf.get(tf.id) || [];
    if (aaList.length === 0) continue; // keine Leichen im Manifest
    const placeholderIds = collectPlaceholderAaIds(aaList);
    scormFileMapping.push({
      kind: 'themenfeld_bundle',
      source_id: tf.id,
      filename: fnThemenfeldBundle(tf.id),
      titel: nullable(tf.titel),
      contained_aufgabe_ids: aaList.map((aa) => aa.id),
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
    });
  }

  // Orphan-Sammeleintrag NUR wenn auch wirklich Aufgaben ohne TF existieren.
  if (orphanEbene2.length > 0) {
    const placeholderIds = collectPlaceholderAaIds(orphanEbene2);
    scormFileMapping.push({
      kind: 'themenfeld_bundle',
      source_id: 'orphan',
      filename: fnThemenfeldBundleOrphan(),
      titel: 'Allgemeine Aufgaben ohne Themenfeld',
      contained_aufgabe_ids: orphanEbene2.map((aa) => aa.id),
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
    });
  }

  // 3. Projekt-Bündel (Ebene 3 + Projekt-Anker) — eines pro Einheit.
  const ebene3 = (allgemeineAufgaben || []).filter(
    (aa) => isEbene3(aa) || isProjektAnker(aa)
  );
  if (ebene3.length > 0 && einheit?.id) {
    const placeholderIds = collectPlaceholderAaIds(ebene3);
    scormFileMapping.push({
      kind: 'projekt_bundle',
      source_id: einheit.id,
      filename: fnProjektBundle(einheit.id),
      titel: 'Projekte der Einheit',
      contained_aufgabe_ids: ebene3.map((aa) => aa.id),
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
    });
  }

  // 4. System-Bausteine — deduplizieren über alle vier Lernpfade.
  //    Ein Baustein, der mehrfach im Pfad referenziert wird, wird trotzdem
  //    nur EINMAL als HTML generiert; das imsmanifest.xml verlinkt ihn an
  //    allen Stellen.
  const usedBausteinIds = new Set();
  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type === 'system' && item?.ref_id) {
          usedBausteinIds.add(item.ref_id);
        }
      }
    }
  }
  const bausteinByKey = new Map(
    (systemBausteine || []).map((b) => [b.baustein_id, b])
  );
  const systemBausteineOut = [];
  for (const bausteinId of [...usedBausteinIds].sort()) {
    const baustein = bausteinByKey.get(bausteinId);
    // Auch wenn der Baustein in der DB (noch) nicht angelegt ist, behalten
    // wir den Mapping-Eintrag — sonst entsteht eine Lücke zwischen Pfad
    // und Manifest. Die MBK erkennt fehlende export_instruktion und stoppt.
    scormFileMapping.push({
      kind: 'system_baustein',
      source_id: bausteinId,
      filename: fnSystemBaustein(bausteinId),
      titel: nullable(baustein?.titel) || bausteinId,
      contains_placeholders: false,
      placeholder_activity_ids: [],
    });
    systemBausteineOut.push({
      baustein_id: bausteinId,
      titel: nullable(baustein?.titel),
      icon: nullable(baustein?.icon),
      export_instruktion: nullable(baustein?.export_instruktion),
      ist_aktiv: baustein ? baustein.ist_aktiv !== false : null,
    });
  }

  return {
    meta,
    einheit: {
      einheit_id: einheit?.id || null,
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_der_einheit: nullable(einheit?.titel_der_einheit),
      gesamtziele: Array.isArray(einheit?.gesamtziele) ? einheit.gesamtziele : [],
    },
    themenfelder: themenfelderOut,
    lernpakete_ohne_themenfeld: orphans.map(renderLernpaketEntry),
    allgemeine_aufgaben: allgemeineAufgabenOut,
    lernpfade,
    // Deduplizierte Bausteine, die im Lernpfad referenziert werden.
    system_bausteine: systemBausteineOut,
    // Konkrete Quell-ID → SCORM-Dateiname-Tabelle. Komplementär zu
    // Payload 1 → scorm_delivery_contract (generische Regel).
    scorm_file_mapping: scormFileMapping,
  };
}

// ── 3. Payload 3: Aufgabeninhalte (pro Lernpaket / pro Aufgabe) ─────────────

/**
 * Erzeugt EINEN Item-Eintrag für Payload 3 zu einem Lernpaket.
 * Enthält die vollständigen Aufgabeninhalte (field_values, MasterAufgaben),
 * die für Aktivitäten ohne KI-Modus relevant sind. KI-Aktivitäten werden
 * als kompakte Struktur durchgereicht — ihr eigentliches Briefing landet
 * in Payload 4.
 */
export function buildTaskContentItemForLernpaket({
  lernpaket,
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  masterAufgaben = [],
}) {
  // MasterAufgaben pro activity_id gruppieren.
  const masterByActivity = new Map();
  for (const m of masterAufgaben || []) {
    if (!m?.activity_id) continue;
    if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
    masterByActivity.get(m.activity_id).push(m);
  }

  const renderMaster = (m) => ({
    master_id: m.id,
    titel: nullable(m.titel),
    reihenfolge: m.reihenfolge ?? null,
    field_values: m.field_values && typeof m.field_values === 'object' ? m.field_values : {},
    content_status: nullable(m.content_status),
  });

  const renderActivity = (pa) => {
    const katalog = katalogById?.get(pa?.aktivitaet_id) || null;
    const masters = (masterByActivity.get(pa.id) || [])
      .slice()
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(renderMaster);

    return {
      activity_id: pa.id,
      aktivitaet_name: nullable(katalog?.name),
      aktivitaet_katalog_id: pa.aktivitaet_id || null,
      phase: nullable(pa.phase),
      reihenfolge: pa.reihenfolge ?? null,
      erstellungs_modus: pa.erstellungs_modus || 'manuell',
      // KI-Aktivitäten: Inhalte stehen im Briefing → hier nur Hinweis-Felder.
      // Manuelle Aktivitäten: vollständige field_values + MasterAufgaben.
      field_values: pa.erstellungs_modus === 'ki'
        ? null
        : (pa.field_values && typeof pa.field_values === 'object' ? pa.field_values : {}),
      master_aufgaben: pa.erstellungs_modus === 'ki' ? [] : masters,
      // AP2 §1.4: Transkript ist Top-Level — gehört zu Inhalten, nicht Briefing.
      transkript: nullable(pa.transkript),
      alt_text: nullable(pa.alt_text),
      content_status: nullable(pa.content_status),
    };
  };

  const phasenSorted = [...(phaseAktivitaeten || [])].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );

  // Liste der KI-Aktivitäten, an deren Position die Hülle Platzhalter
  // (`<div data-mbk-placeholder="activity" data-activity-id="...">`) setzen
  // muss. Reine UUID-Liste — die MBK weiß so, wo der Merger Fragmente
  // einsetzen wird.
  const placeholderActivityIds = phasenSorted
    .filter((pa) => pa?.erstellungs_modus === 'ki')
    .map((pa) => pa.id);

  return {
    item_type: 'lernpaket',
    reference_id: lernpaket?.id || null,
    titel: nullable(lernpaket?.titel_des_pakets),
    themenfeld_id: lernpaket?.themenfeld_id || null,
    reihenfolge_nummer: lernpaket?.reihenfolge_nummer ?? null,
    geschaetzte_dauer_minuten: lernpaket?.geschaetzte_dauer_minuten ?? null,
    kernbegriffe: Array.isArray(lernpaket?.kernbegriffe) ? lernpaket.kernbegriffe.filter(Boolean) : [],
    lernziele: (lernziele || []).map((lz) => ({
      lernziel_id: lz.id || null,
      formulierung_fachsprache: nullable(lz.formulierung_fachsprache),
      kategorie: nullable(lz.kategorie),
      schueler_uebersetzung: nullable(lz.schueler_uebersetzung),
    })),
    aktivitaeten: phasenSorted.map(renderActivity),
    placeholder_activity_ids: placeholderActivityIds,
  };
}

/**
 * Erzeugt EINEN Item-Eintrag für Payload 3 zu einer AllgemeineAufgabe
 * (Ebene 2 oder 3). Im KI-Modus reichen wir nur Header + Briefing-Marker
 * durch — das eigentliche Briefing kommt in Payload 4.
 */
export function buildTaskContentItemForAllgemeineAufgabe({ aufgabe }) {
  const istKi = aufgabe?.erstellungs_modus === 'ki';
  return {
    item_type: 'allgemeine_aufgabe',
    reference_id: aufgabe?.id || null,
    titel: nullable(aufgabe?.titel),
    anforderungsebene: nullable(aufgabe?.anforderungsebene),
    aufgaben_typ: nullable(aufgabe?.aufgaben_typ),
    aufgabentyp_projekt: nullable(aufgabe?.aufgabentyp_projekt),
    mission_type: nullable(aufgabe?.mission_type),
    schwierigkeitsgrad: aufgabe?.schwierigkeitsgrad ?? null,
    themenfeld_id: aufgabe?.themenfeld_id || null,
    erstellungs_modus: istKi ? 'ki' : 'manuell',

    // Manueller Modus: alle Inhalte. KI-Modus: null (kommt aus Payload 4).
    aufgabenstellung: istKi ? null : nullable(aufgabe?.aufgabenstellung),
    aufgaben_bild_url: istKi ? null : nullable(aufgabe?.aufgaben_bild_url),
    materialien: istKi ? [] : (Array.isArray(aufgabe?.materialien) ? aufgabe.materialien : []),
    erwartungshorizont: istKi ? null : nullable(aufgabe?.erwartungshorizont),
    musterloesung: istKi ? null : nullable(aufgabe?.musterloesung),

    // Abgabe-Spezifikation (auch im KI-Modus relevant für die MBK).
    ergebnis_form: nullable(aufgabe?.ergebnis_form),
    ergebnis_dateiformat: nullable(aufgabe?.ergebnis_dateiformat),
    output_formats: Array.isArray(aufgabe?.output_formats) ? aufgabe.output_formats : [],
    custom_format: nullable(aufgabe?.custom_format),
    quality_focus: nullable(aufgabe?.quality_focus),
    rubric_criteria: Array.isArray(aufgabe?.rubric_criteria) ? aufgabe.rubric_criteria : [],

    // Brian-Dialog (durchgereicht).
    brian_dialog: (aufgabe?.brian_dialog_name || aufgabe?.brian_learner_instruction || aufgabe?.brian_system_instruction || aufgabe?.brian_completion_rule)
      ? {
        dialog_name: nullable(aufgabe?.brian_dialog_name),
        learner_instruction: nullable(aufgabe?.brian_learner_instruction),
        system_instruction: nullable(aufgabe?.brian_system_instruction),
        completion_rule: nullable(aufgabe?.brian_completion_rule),
      }
      : null,

    alt_text: nullable(aufgabe?.alt_text),
  };
}

/**
 * Payload 3 als BUNDLE: alle Task-Content-Items einer Einheit in einem Array.
 * Pro Item kann der UI-Layer alternativ `buildTaskContentItemFor*` einzeln
 * aufrufen und den Item-Eintrag direkt persistieren.
 */
export function buildTaskContentBundle({
  einheit,
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  masterAufgaben = [],
  allgemeineAufgabenEbene23 = [],
  systemContextHash = null,
  nowIso = null,
}) {
  // Nach Lernpaket gruppieren.
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

  const lernpaketItems = (lernpakete || [])
    .slice()
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
    .map((lp) =>
      buildTaskContentItemForLernpaket({
        lernpaket: lp,
        lernziele: zieleByPaket.get(lp.id) || [],
        phaseAktivitaeten: phasenByPaket.get(lp.id) || [],
        katalogById,
        masterAufgaben: masterByPaket.get(lp.id) || [],
      })
    );

  const aufgabeItems = (allgemeineAufgabenEbene23 || []).map((aa) =>
    buildTaskContentItemForAllgemeineAufgabe({ aufgabe: aa })
  );

  const items = [...lernpaketItems, ...aufgabeItems];

  return {
    meta: makeMeta({
      payloadType: 'mbk_task_content_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}

// ── 4. Payload 4: Micro-Briefings (pro KI-Aktivität / pro KI-Aufgabe) ───────

/**
 * GPS-Block: positioniert die Aktivität/Aufgabe im didaktischen Kontext der
 * Einheit (Themenfeld → Lernpaket → Phase → Position-in-Phase).
 * Wird vom MBK-Brief als „Standortbestimmung" gelesen.
 */
function buildGpsForActivity({ einheit, aktivitaet, lernpaket, themenfeld, phaseAktivitaetenInPaket = [] }) {
  // Position innerhalb der Phase berechnen.
  const samePhase = phaseAktivitaetenInPaket
    .filter((pa) => pa.phase === aktivitaet?.phase)
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
  const positionInPhase = samePhase.findIndex((pa) => pa.id === aktivitaet?.id);

  return {
    fach: nullable(einheit?.fach),
    jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
    titel_einheit: nullable(einheit?.titel_der_einheit),
    themenfeld: themenfeld
      ? {
        themenfeld_id: themenfeld.id,
        titel: nullable(themenfeld.titel),
      }
      : null,
    lernpaket: lernpaket
      ? {
        lernpaket_id: lernpaket.id,
        titel: nullable(lernpaket.titel_des_pakets),
      }
      : null,
    phase: aktivitaet?.phase
      ? {
        name: aktivitaet.phase,
        position: positionInPhase >= 0 ? positionInPhase + 1 : null,
        total_in_phase: samePhase.length || null,
        ist_letztes_element_der_phase: positionInPhase >= 0 && positionInPhase === samePhase.length - 1,
      }
      : null,
  };
}

/**
 * Payload 4: Micro-Briefing für EINE LernpaketPhaseAktivitaet im KI-Modus.
 *
 * Liefert `null`, wenn die Aktivität nicht im KI-Modus ist — Aufrufer können
 * sich darauf verlassen, dass jedes nicht-null-Ergebnis ein vollständiges
 * Micro-Briefing ist.
 */
export function buildMicroPayloadForActivity({
  einheit,
  aktivitaet,
  lernpaket,
  themenfeld = null,
  phaseAktivitaetenInPaket = [],
  lernziele = [],
  katalogById = new Map(),
  systemContextHash = null,
  nowIso = null,
}) {
  if (!aktivitaet || aktivitaet.erstellungs_modus !== 'ki') return null;

  const katalog = katalogById?.get(aktivitaet.aktivitaet_id) || null;
  const briefing = aktivitaet.ki_briefing && typeof aktivitaet.ki_briefing === 'object'
    ? aktivitaet.ki_briefing
    : null;

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      nowIso,
    }),
    target: {
      kind: 'activity',
      reference_id: aktivitaet.id,
      aktivitaet_name: nullable(katalog?.name),
      aktivitaet_katalog_id: aktivitaet.aktivitaet_id || null,
    },
    gps: buildGpsForActivity({
      einheit,
      aktivitaet,
      lernpaket,
      themenfeld,
      phaseAktivitaetenInPaket,
    }),
    zieloptik: {
      lernziele: (lernziele || []).map((lz) => nullable(lz.formulierung_fachsprache)).filter(Boolean),
      kernbegriffe: Array.isArray(lernpaket?.kernbegriffe) ? lernpaket.kernbegriffe.filter(Boolean) : [],
    },
    source_of_truth: {
      transkript: nullable(aktivitaet.transkript),
      // Field-values einer KI-Aktivität enthalten typischerweise nur die
      // Quell-URL (bei Medien) bzw. nichts. Wir reichen sie vollständig durch,
      // damit die MBK z. B. die Video-URL kennt, ohne sie aus Payload 3 zu
      // kreuzen.
      field_values: aktivitaet.field_values && typeof aktivitaet.field_values === 'object'
        ? aktivitaet.field_values
        : {},
    },
    blueprint: {
      ki_briefing: briefing,
    },
    output_contract: {
      format: 'fragment',
      filename: fnFragment(aktivitaet.id),
      placeholder_target: lernpaket?.id ? fnLernpaket(lernpaket.id) : null,
      marker_format:
        '<!-- mbk:fragment activity-id="{{id}}" system-context-hash="{{hash}}" -->'
        + '...HTML...'
        + '<!-- /mbk:fragment -->',
    },
  };
}

/**
 * Payload 4: Micro-Briefing für EINE AllgemeineAufgabe im KI-Modus.
 * Liefert `null`, wenn die Aufgabe nicht im KI-Modus ist.
 */
export function buildMicroPayloadForAllgemeineAufgabe({
  einheit,
  aufgabe,
  themenfeld = null,
  systemContextHash = null,
  nowIso = null,
}) {
  if (!aufgabe || aufgabe.erstellungs_modus !== 'ki') return null;

  const briefing = aufgabe.ki_briefing && typeof aufgabe.ki_briefing === 'object'
    ? aufgabe.ki_briefing
    : null;

  // Placeholder-Target ist das Bündel, in das die Aufgabe später eingewoben
  // wird: Ebene-3-/Projekt-Anker → Projekt-Bündel; sonst das Themenfeld-
  // Bündel (oder Orphan, wenn kein TF gesetzt ist).
  const istEbene3 = aufgabe.anforderungsebene === '3 - Projekt';
  const istProjektAnker = aufgabe.aufgaben_typ === 'projekt_anker';
  let placeholderTarget = null;
  if ((istEbene3 || istProjektAnker) && einheit?.id) {
    placeholderTarget = fnProjektBundle(einheit.id);
  } else if (themenfeld?.id) {
    placeholderTarget = fnThemenfeldBundle(themenfeld.id);
  } else {
    placeholderTarget = fnThemenfeldBundleOrphan();
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      nowIso,
    }),
    target: {
      kind: 'allgemeine_aufgabe',
      reference_id: aufgabe.id,
      titel: nullable(aufgabe.titel),
      anforderungsebene: nullable(aufgabe.anforderungsebene),
      aufgaben_typ: nullable(aufgabe.aufgaben_typ),
    },
    gps: {
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_einheit: nullable(einheit?.titel_der_einheit),
      themenfeld: themenfeld
        ? { themenfeld_id: themenfeld.id, titel: nullable(themenfeld.titel) }
        : null,
      lernpaket: null,
      phase: null,
    },
    zieloptik: {
      lernziele: [],
      kernbegriffe: [],
    },
    source_of_truth: {
      transkript: null,
      field_values: {},
    },
    blueprint: {
      ki_briefing: briefing,
    },
    output_contract: {
      format: 'fragment',
      filename: fnFragment(aufgabe.id),
      placeholder_target: placeholderTarget,
      marker_format:
        '<!-- mbk:fragment activity-id="{{id}}" system-context-hash="{{hash}}" -->'
        + '...HTML...'
        + '<!-- /mbk:fragment -->',
    },
  };
}

/**
 * Payload 4 als BUNDLE: alle Micro-Briefings einer Einheit (filter:
 * erstellungs_modus === 'ki') in einem Array.
 */
export function buildMicroPayloadBundle({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  allgemeineAufgaben = [],
  systemContextHash = null,
  nowIso = null,
}) {
  const themenfeldById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
  const lernpaketById = new Map((lernpakete || []).map((lp) => [lp.id, lp]));
  const phasenByPaket = new Map();
  for (const pa of phaseAktivitaeten) {
    if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
    phasenByPaket.get(pa.lernpaket_id).push(pa);
  }
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }

  const items = [];

  // KI-Aktivitäten aus Lernpaketen.
  for (const pa of phaseAktivitaeten) {
    if (pa.erstellungs_modus !== 'ki') continue;
    const lp = lernpaketById.get(pa.lernpaket_id) || null;
    const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) || null : null;
    const item = buildMicroPayloadForActivity({
      einheit,
      aktivitaet: pa,
      lernpaket: lp,
      themenfeld: tf,
      phaseAktivitaetenInPaket: phasenByPaket.get(pa.lernpaket_id) || [],
      lernziele: zieleByPaket.get(pa.lernpaket_id) || [],
      katalogById,
      systemContextHash,
      nowIso,
    });
    if (item) items.push(item);
  }

  // KI-AllgemeineAufgaben.
  for (const aa of allgemeineAufgaben || []) {
    if (aa.erstellungs_modus !== 'ki') continue;
    const tf = aa.themenfeld_id ? themenfeldById.get(aa.themenfeld_id) || null : null;
    const item = buildMicroPayloadForAllgemeineAufgabe({
      einheit,
      aufgabe: aa,
      themenfeld: tf,
      systemContextHash,
      nowIso,
    });
    if (item) items.push(item);
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}