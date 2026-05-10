/**
 * exportPromptSync.js
 *
 * Frontend-Logik für den Out-of-Sync-Vergleich und Workflow-Blocker
 * der MBK-Export-Prompts (Tab 9).
 *
 * Out-of-Sync = entweder
 *   (a) die zugrundeliegenden Quelldaten haben sich nach der letzten
 *       Generierung geändert (`source_updated_at` < max(updated_date)), oder
 *   (b) die Template-Engine wurde inhaltlich verändert (`template_version`
 *       weicht vom aktuellen MBK_TEMPLATE_VERSION ab).
 *
 * Performance: Statt bei jedem Prompt-Item den ganzen Quelldaten-Array zu
 * scannen (O(N) pro Item), bauen wir einmal pro Render-Schub einen Index
 * (buildSourceTimestampIndex) und schlagen pro Item in O(1) nach.
 */

import { MBK_TEMPLATE_VERSION } from '@/lib/exportPromptTemplates';
import { MBK_AIRGAP_VERSION } from '@/lib/mbkAirGapPayloads';

const PROMPT_TYPES = {
  NUCLEUS: 'nucleus',
  PERSONA: 'persona',
  SEKTOR_STRUKTUR: 'sektor_struktur',
  SEKTOR: 'sektor_anweisung',
  ERSTELLUNGSPAKET: 'erstellungspaket',
  // Air-Gap-Welt
  MBK_UI_CONFIG: 'mbk_ui_config',
  MBK_SYSTEM_CONTEXT: 'mbk_system_context',
  MBK_STRUCTURE: 'mbk_structure_payload',
  MBK_TASK_CONTENT: 'mbk_task_content_payload',
  MBK_MICRO: 'mbk_micro_payload',
};

// Set der Air-Gap-Prompt-Types — wird in isPromptOutOfSync für den
// zusätzlichen Hash-Vergleich genutzt.
const AIRGAP_PROMPT_TYPES = new Set([
  PROMPT_TYPES.MBK_UI_CONFIG,
  PROMPT_TYPES.MBK_SYSTEM_CONTEXT,
  PROMPT_TYPES.MBK_STRUCTURE,
  PROMPT_TYPES.MBK_TASK_CONTENT,
  PROMPT_TYPES.MBK_MICRO,
]);

// airgap-1.5.0: Welche Hashes sind pro Air-Gap-Type relevant?
//   - mbk_ui_config       → nur ui_config_hash
//   - alle anderen        → BEIDE (system_context_hash + ui_config_hash),
//     weil die generierten HTML-Dateien beide <meta>-Tags tragen müssen.
const REQUIRES_SYS_HASH = new Set([
  PROMPT_TYPES.MBK_SYSTEM_CONTEXT,
  PROMPT_TYPES.MBK_STRUCTURE,
  PROMPT_TYPES.MBK_TASK_CONTENT,
  PROMPT_TYPES.MBK_MICRO,
]);
const REQUIRES_UI_HASH = new Set([
  PROMPT_TYPES.MBK_UI_CONFIG,
  PROMPT_TYPES.MBK_STRUCTURE,
  PROMPT_TYPES.MBK_TASK_CONTENT,
  PROMPT_TYPES.MBK_MICRO,
]);

export const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

function maxTimestamp(records) {
  let max = 0;
  for (const r of records || []) {
    const t = r?.updated_date ? new Date(r.updated_date).getTime() : 0;
    if (t > max) max = t;
  }
  return max;
}

/**
 * Liefert das Maximum der `updated_date`-Werte aller Quellen, die für
 * den jeweiligen Prompt-Typ relevant sind.
 *
 * Mapping (siehe Spec):
 *   - nucleus           → Einheit + Themenfelder + Lernpakete + Lernziele
 *   - persona           → Einheit
 *   - sektor_anweisung  → Einheit (lernpfade_konfiguration steckt in der Einheit)
 *                         + Themenfelder (für Arbeitsphase-Titel)
 *   - erstellungspaket  → das spezifische Quell-Objekt + zugehörige Lernziele
 *                         (bei Lernpaket) bzw. nur die Aufgabe (bei AllgemeineAufgabe)
 */
export function computeSourceMaxTimestamp({ promptType, referenceId, einheit, themenfelder = [], lernpakete = [], lernziele = [], aufgabenbausteine = [], allgemeineAufgaben = [] }) {
  const ts = (rec) => (rec?.updated_date ? new Date(rec.updated_date).getTime() : 0);

  switch (promptType) {
    case PROMPT_TYPES.NUCLEUS:
      return Math.max(
        ts(einheit),
        maxTimestamp(themenfelder),
        maxTimestamp(lernpakete),
        maxTimestamp(lernziele),
      );
    case PROMPT_TYPES.PERSONA:
      return ts(einheit);
    case PROMPT_TYPES.SEKTOR_STRUKTUR:
      return Math.max(ts(einheit), maxTimestamp(themenfelder));
    case PROMPT_TYPES.SEKTOR:
      // Schlanke Lerntyp-Anweisung — hängt nur an der Einheit (Lerntyp-Konfig).
      // Die eigentliche Sektoren-Struktur liegt in SEKTOR_STRUKTUR.
      return ts(einheit);
    case PROMPT_TYPES.ERSTELLUNGSPAKET: {
      // referenceId kann eine Lernpaket-ID oder eine AllgemeineAufgabe-ID sein.
      const lp = lernpakete.find((p) => p.id === referenceId);
      if (lp) {
        const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === referenceId);
        const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === referenceId);
        return Math.max(ts(lp), maxTimestamp(zieleDesPakets), maxTimestamp(aufgabenDesPakets));
      }
      const aa = allgemeineAufgaben.find((a) => a.id === referenceId);
      if (aa) return ts(aa);
      return 0;
    }
    default:
      return 0;
  }
}

/**
 * Liefert true, wenn der gespeicherte Prompt im Vergleich zu den aktuellen
 * Quelldaten ODER zur aktuellen Template-Version veraltet ist. Wenn der
 * Prompt noch nicht generiert wurde (`source_updated_at` ist leer), gilt
 * er nicht als "out of sync" — er existiert schlicht noch nicht.
 *
 * Legacy-Records ohne `template_version` werden bewusst nicht als veraltet
 * markiert (sonst würden alle Bestandsprompts beim ersten Deploy schlagartig
 * gelb leuchten). Erst sobald ein Record neu geschrieben wird, bekommt er
 * eine Version und nimmt am Versionsvergleich teil.
 *
 * Air-Gap-spezifisch: Zusätzlich wird der `system_context_hash_at_generation`
 * gegen den aktuellen `currentSystemContextHash` geprüft. Ein Mismatch
 * bedeutet, dass globale Regeln (Stammdaten, Schul-Nomenklatur, MBK-Global-
 * Prompts) sich seit der Generierung geändert haben — die MBK würde den
 * Payload ablehnen, weil ihr Cache-Key nicht mehr passt.
 */
export function isPromptOutOfSync(prompt, sourceMaxTs, currentSystemContextHash = null, currentUiConfigHash = null) {
  if (!prompt || !prompt.source_updated_at) return false;
  const generatedTs = new Date(prompt.source_updated_at).getTime();
  if (sourceMaxTs > generatedTs) return true;

  const isAirGap = AIRGAP_PROMPT_TYPES.has(prompt.prompt_type);
  const expectedTemplateVersion = isAirGap ? MBK_AIRGAP_VERSION : MBK_TEMPLATE_VERSION;
  if (prompt.template_version && prompt.template_version !== expectedTemplateVersion) {
    return true;
  }

  // Air-Gap: Hash-Vergleich (airgap-1.5.0 — zwei Hashes parallel).
  // Pro Type ist nur das relevante Hash-Set zwingend; der jeweils andere
  // wird übersprungen, wenn er nicht gepflegt ist.
  if (isAirGap) {
    if (
      REQUIRES_SYS_HASH.has(prompt.prompt_type) &&
      currentSystemContextHash &&
      prompt.system_context_hash_at_generation &&
      prompt.system_context_hash_at_generation !== currentSystemContextHash
    ) {
      return true;
    }
    if (
      REQUIRES_UI_HASH.has(prompt.prompt_type) &&
      currentUiConfigHash &&
      prompt.ui_config_hash_at_generation &&
      prompt.ui_config_hash_at_generation !== currentUiConfigHash
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Workflow-Blocker: Ein Erstellungspaket darf nur generiert werden, wenn
 * die Quelle freigegeben/abgeschlossen ist. Sonst wäre der Prompt
 * verfrüht und würde ggf. unfertige Inhalte an die KI weitergeben.
 *
 *   - Lernpaket          → is_complete === true
 *   - AllgemeineAufgabe  → content_status === 'approved'
 *
 * Andere Prompt-Typen (nucleus, persona, sektor) dürfen jederzeit
 * generiert werden — sie referenzieren nur Strukturdaten.
 */
export function isErstellungspaketBlocked({ referenceId, lernpakete = [], allgemeineAufgaben = [] }) {
  const lp = lernpakete.find((p) => p.id === referenceId);
  if (lp) {
    if (lp.is_complete === true) return null;
    return 'Das Lernpaket ist noch nicht vollständig (is_complete=false).';
  }
  const aa = allgemeineAufgaben.find((a) => a.id === referenceId);
  if (aa) {
    if (aa.content_status === 'approved') return null;
    return 'Die Aufgabe ist noch nicht freigegeben (content_status ≠ approved).';
  }
  return 'Quelle nicht gefunden.';
}

/**
 * Findet einen vorhandenen Prompt anhand der Eindeutigkeit
 * (einheit_id, prompt_type, reference_id).
 */
export function findExistingPrompt(prompts, { einheitId, promptType, referenceId = null }) {
  return prompts.find(
    (p) =>
      p.einheit_id === einheitId &&
      p.prompt_type === promptType &&
      (p.reference_id || null) === (referenceId || null)
  ) || null;
}

// ── Source-Timestamp-Index (Performance-Helfer) ─────────────────────────────

/**
 * Baut einen vorberechneten Index der Quelldaten-Timestamps. Das Panel ruft
 * pro Render mehrere Dutzend `lookupSourceMaxTimestampFromIndex(...)` auf —
 * wir wollen nicht jedes Mal Lernziele/Aufgabenbausteine durchscannen.
 *
 * Liefert:
 *   {
 *     nucleusTs:  number,                           // max über Einheit + TF + LP + LZ + AB
 *     personaTs:  number,                           // ts(Einheit)
 *     sektorTs:   number,                           // max(ts(Einheit), max(TF))
 *     lernpaketTs: Map<lernpaketId, number>,        // pro Paket: max(LP, LZ, AB)
 *     allgemeineAufgabeTs: Map<aufgabeId, number>,  // ts(AllgemeineAufgabe)
 *   }
 */
export function buildSourceTimestampIndex({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  aufgabenbausteine = [],
  phaseAktivitaeten = [],
  masterAufgaben = [],
  allgemeineAufgaben = [],
  globalPrompts = [],
}) {
  const ts = (rec) => (rec?.updated_date ? new Date(rec.updated_date).getTime() : 0);

  const themenfelderTs = maxTimestamp(themenfelder);
  const lernpaketeTs = maxTimestamp(lernpakete);
  const lernzieleTs = maxTimestamp(lernziele);
  const aufgabenbausteineTs = maxTimestamp(aufgabenbausteine);
  const phaseAktivitaetenTs = maxTimestamp(phaseAktivitaeten);
  const masterAufgabenTs = maxTimestamp(masterAufgaben);
  // MBKGlobalPrompt.updated_date fließt in Nukleus + Sektor-Anweisungen ein,
  // weil beide Compiler-Aufrufe den Manager-Text einweben. Erstellungspakete
  // bleiben davon unberührt.
  const globalPromptsTs = maxTimestamp(globalPrompts);

  // Pro Lernpaket: ts(LP) ⊕ max(zugehörige LZ) ⊕ max(zugehörige AB) ⊕
  // max(zugehörige LernpaketPhaseAktivitaet). Damit zählen Edits in den
  // Phasen-Aktivitäten (die eigentlichen Aufgabeninhalte) korrekt zur
  // Out-of-Sync-Erkennung des Erstellungspakets.
  const lernpaketTs = new Map();
  const lpById = new Map(lernpakete.map((lp) => [lp.id, lp]));
  for (const lp of lernpakete) {
    lernpaketTs.set(lp.id, ts(lp));
  }
  for (const lz of lernziele) {
    if (!lz?.lernpaket_id) continue;
    const cur = lernpaketTs.get(lz.lernpaket_id) || 0;
    const t = ts(lz);
    if (t > cur) lernpaketTs.set(lz.lernpaket_id, t);
  }
  for (const ab of aufgabenbausteine) {
    if (!ab?.lernpaket_id) continue;
    const cur = lernpaketTs.get(ab.lernpaket_id) || 0;
    const t = ts(ab);
    if (t > cur) lernpaketTs.set(ab.lernpaket_id, t);
  }
  for (const pa of phaseAktivitaeten) {
    if (!pa?.lernpaket_id) continue;
    const cur = lernpaketTs.get(pa.lernpaket_id) || 0;
    const t = ts(pa);
    if (t > cur) lernpaketTs.set(pa.lernpaket_id, t);
  }
  // MasterAufgaben tragen die eigentlichen Inhalte (Miniquiz, Lückentext, …);
  // ein Edit dort muss das zugehörige Erstellungspaket als veraltet markieren.
  for (const m of masterAufgaben) {
    if (!m?.lernpaket_id) continue;
    const cur = lernpaketTs.get(m.lernpaket_id) || 0;
    const t = ts(m);
    if (t > cur) lernpaketTs.set(m.lernpaket_id, t);
  }
  // Falls ein Lernziel/AB ohne zugehöriges Lernpaket existiert, ignorieren wir
  // es bewusst — es taucht ohnehin in keinem Erstellungspaket auf.
  void lpById; // (Map nur zur Validierung; aktuell nicht weiter verwendet)

  const allgemeineAufgabeTs = new Map();
  for (const aa of allgemeineAufgaben) {
    allgemeineAufgabeTs.set(aa.id, ts(aa));
  }

  // ── Air-Gap-Indizes ───────────────────────────────────────────────────
  // mbk_ui_config: hängt nur an den drei UI-Schlüsseln im Prompt-Manager.
  // Wir verwenden globalPromptsTs als Proxy (Manager-Edit-Timestamp); der
  // exakte Drift-Check läuft über den ui_config_hash.
  const mbkUiConfigTs = globalPromptsTs;
  // mbk_system_context: hängt an globalen Regeln. Stammdaten haben kein
  // updated_date — Drift wird zusätzlich über system_context_hash erkannt
  // (siehe isPromptOutOfSync). Hier reicht der Manager-Timestamp als Proxy.
  const mbkSystemContextTs = globalPromptsTs;

  // mbk_structure_payload: gesamte Strukturschicht der Einheit.
  const mbkStructureTs = Math.max(
    ts(einheit), themenfelderTs, lernpaketeTs, phaseAktivitaetenTs,
    // AllgemeineAufgaben fließen ein, weil sie in der Struktur als Sektor-Items auftauchen.
    Array.from(allgemeineAufgabeTs.values()).reduce((m, t) => Math.max(m, t), 0),
  );

  // mbk_task_content_payload pro reference_id (Lernpaket oder Allg. Aufgabe).
  // Re-use des Lernpaket-Index, der bereits LP+LZ+AB+Phasen+Master abdeckt.
  const mbkTaskContentLernpaketTs = lernpaketTs;
  const mbkTaskContentAufgabeTs = allgemeineAufgabeTs;

  // mbk_micro_payload pro reference_id (Phase-Aktivität ODER Allg. Aufgabe).
  // Da ki_briefing und transkript Felder dieser Records sind, reicht ts(record).
  const mbkMicroPhaseAktivitaetTs = new Map();
  for (const pa of phaseAktivitaeten) {
    if (pa?.id) mbkMicroPhaseAktivitaetTs.set(pa.id, ts(pa));
  }
  const mbkMicroAufgabeTs = allgemeineAufgabeTs;

  return {
    nucleusTs: Math.max(ts(einheit), themenfelderTs, lernpaketeTs, lernzieleTs, aufgabenbausteineTs, phaseAktivitaetenTs, masterAufgabenTs, globalPromptsTs),
    // Fachliche Persona (v1.5.0): selbst quellen-arm, aber abhängig von der
    // globalen Persona-Definition aus dem Prompt-Manager. Damit eine
    // Manager-Änderung die einheits-spezifische Persona als „veraltet"
    // markiert, fließt globalPromptsTs hier mit ein.
    personaTs: Math.max(ts(einheit), globalPromptsTs),
    // Sektoren-Struktur (v1.9.0): vollständige Sektoren-/Item-Liste,
    // hängt von Einheit (lernpfade_konfiguration), Themenfeld-Titeln und
    // globalen System-Bausteinen-Texten ab.
    sektorStrukturTs: Math.max(ts(einheit), themenfelderTs, globalPromptsTs),
    // Schlanke Lerntyp-Anweisung — hängt nur an der Einheit + globalen
    // Prompts (für die generischen Tonalitätsregeln). Themenfelder fließen
    // hier nicht mehr ein, weil die Struktur in sektorStruktur lebt.
    sektorTs: Math.max(ts(einheit), globalPromptsTs),
    lernpaketTs,
    allgemeineAufgabeTs,
    // Air-Gap
    mbkUiConfigTs,
    mbkSystemContextTs,
    mbkStructureTs,
    mbkTaskContentLernpaketTs,
    mbkTaskContentAufgabeTs,
    mbkMicroPhaseAktivitaetTs,
    mbkMicroAufgabeTs,
  };
}

/**
 * Liefert den max-Timestamp für einen Prompt-Typ + optionale Reference-ID
 * aus dem vorberechneten Index. O(1) pro Lookup.
 */
export function lookupSourceMaxTimestampFromIndex(index, promptType, referenceId = null) {
  if (!index) return 0;
  switch (promptType) {
    case PROMPT_TYPES.NUCLEUS:
      return index.nucleusTs;
    case PROMPT_TYPES.PERSONA:
      return index.personaTs;
    case PROMPT_TYPES.SEKTOR_STRUKTUR:
      return index.sektorStrukturTs;
    case PROMPT_TYPES.SEKTOR:
      return index.sektorTs;
    case PROMPT_TYPES.ERSTELLUNGSPAKET: {
      if (!referenceId) return 0;
      if (index.lernpaketTs.has(referenceId)) return index.lernpaketTs.get(referenceId);
      if (index.allgemeineAufgabeTs.has(referenceId)) return index.allgemeineAufgabeTs.get(referenceId);
      return 0;
    }
    case PROMPT_TYPES.MBK_UI_CONFIG:
      return index.mbkUiConfigTs || 0;
    case PROMPT_TYPES.MBK_SYSTEM_CONTEXT:
      return index.mbkSystemContextTs || 0;
    case PROMPT_TYPES.MBK_STRUCTURE:
      return index.mbkStructureTs || 0;
    case PROMPT_TYPES.MBK_TASK_CONTENT: {
      if (!referenceId) return 0;
      if (index.mbkTaskContentLernpaketTs?.has(referenceId)) return index.mbkTaskContentLernpaketTs.get(referenceId);
      if (index.mbkTaskContentAufgabeTs?.has(referenceId)) return index.mbkTaskContentAufgabeTs.get(referenceId);
      return 0;
    }
    case PROMPT_TYPES.MBK_MICRO: {
      if (!referenceId) return 0;
      if (index.mbkMicroPhaseAktivitaetTs?.has(referenceId)) return index.mbkMicroPhaseAktivitaetTs.get(referenceId);
      if (index.mbkMicroAufgabeTs?.has(referenceId)) return index.mbkMicroAufgabeTs.get(referenceId);
      return 0;
    }
    default:
      return 0;
  }
}