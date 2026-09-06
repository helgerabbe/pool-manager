/**
 * mbkPayloadBasis.js
 *
 * Gemeinsame Grundbausteine aller Air-Gap-Payload-Builder: Versionskennung,
 * Lerntyp-Schlüssel, Null-Normalisierung, meta-Block, Platzhalter-Erkennung
 * und die Dateinamen-Bildner.
 *
 * Ausgelagert aus mbkAirGapPayloads.js (airgap-1.20.0), weil die Datei an die
 * bearbeitbare Größe gestoßen war und die Payload-5-Builder (Systembausteine)
 * dieselben Helfer brauchen — ohne diese Basis müssten die beiden Module
 * einander importieren.
 *
 * Konventionen: null = nicht gesetzt, leeres Array = strukturell vorhanden.
 *
 * **Wichtig:** Bei jeder strukturellen Änderung an den Payload-Schemas MUSS
 * `MBK_AIRGAP_VERSION` hochgezählt werden — der Out-of-Sync-Check
 * (lib/exportPromptSync.js) markiert daran alle Payloads als veraltet.
 */

export const MBK_AIRGAP_VERSION = 'airgap-1.20.0';

export const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * Tombstone-Filter (airgap-1.16.0): Gelöschte Aktivitäten/Aufgaben/Master
 * werden im Lösch-Workflow nur markiert (sync_status='to_delete'), nicht
 * physisch entfernt. Die App blendet sie überall aus — der Export MUSS
 * dieselbe Regel anwenden, sonst erscheinen gelöschte Aktivitäten als
 * "leere" Einträge in den Payloads.
 */
export function isTombstone(record) {
  return record?.sync_status === 'to_delete';
}

/**
 * Liefert `null` statt leerer Strings, damit das JSON-Schema
 * "Wert nicht gesetzt" sauber abbildet.
 */
export function nullable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  return value;
}

/**
 * Erzeugt einen meta-Block mit den festen Pflichtfeldern. `nowIso` ist
 * parametrisierbar, damit Tests deterministisch bleiben können.
 */
export function makeMeta({
  payloadType,
  einheitId = null,
  systemContextHash = null,
  uiConfigHash = null,
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
  if (uiConfigHash !== null) meta.ui_config_hash = uiConfigHash;
  if (itemCount !== null) meta.item_count = itemCount;
  return meta;
}

// Bündel-IDs tragen aus historischen Gründen noch das `sys_platzhalter_`-
// Präfix, sind aber KEINE Platzhalter mehr (typ='buendel'). Sie müssen im
// Export erhalten bleiben und dürfen NICHT herausgefiltert werden.
const BUENDEL_LEGACY_IDS = new Set([
  'sys_platzhalter_moodle_buendel',
  'sys_platzhalter_brian_buendel',
]);

/**
 * Erkennt Platzhalter-System-Bausteine (`sys_platzhalter_*`).
 *
 * Platzhalter sind reine Arbeitshilfen im Lernpfad-Architekt — sie markieren
 * „hier kommt später noch eine echte Aufgabe rein". Beim Export tauchen sie
 * GAR NICHT auf: weder als Karte im Dashboard noch als eigene SCORM-Datei.
 */
export function isPlatzhalterItem(item) {
  return !!(
    item
    && item.type === 'system'
    && typeof item.ref_id === 'string'
    && item.ref_id.startsWith('sys_platzhalter_')
    && !BUENDEL_LEGACY_IDS.has(item.ref_id)
  );
}

/** Filename-Builder pro Datei-Typ. Reine String-Kompositoren — keine Validierung. */
export function fnLernpaket(lernpaketId) {
  return `task-${lernpaketId}.html`;
}
export function fnThemenfeldBundle(themenfeldId) {
  return `tasks-themenfeld-${themenfeldId}.html`;
}
export function fnThemenfeldBundleOrphan() {
  return 'tasks-themenfeld-orphan.html';
}
export function fnProjektBundle(einheitId) {
  return `projekte-einheit-${einheitId}.html`;
}
/**
 * airgap-1.6.0: System-Baustein-HTMLs sind pro Lerntyp eindeutig — derselbe
 * Baustein wird in Deutsch/Minimalist anders gefüllt als in Mathe/Passioniert.
 */
export function fnSystemBaustein(bausteinId, lerntyp) {
  return `system-${lerntyp}-${bausteinId}.html`;
}
export function fnFragment(activityId) {
  return `fragment-${activityId}.html`;
}
export function fnDashboard(lerntyp) {
  return `dashboard-${lerntyp}.html`;
}

/**
 * Composite-Key für Payload-5-Items (mbk_systembaustein_payload). Wird als
 * reference_id in ExportPrompts persistiert.
 */
export function makeSystembausteinReferenceId(lerntyp, bausteinId) {
  return `${lerntyp}::${bausteinId}`;
}

/** Inverse dazu — liefert null bei ungültigem Format. */
export function parseSystembausteinReferenceId(refId) {
  if (typeof refId !== 'string') return null;
  const idx = refId.indexOf('::');
  if (idx <= 0) return null;
  return {
    lerntyp: refId.slice(0, idx),
    bausteinId: refId.slice(idx + 2),
  };
}