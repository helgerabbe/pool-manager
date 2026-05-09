/**
 * operatorActionPlan.js
 *
 * Erzeugt den **Operator Action Plan** — die deterministische Schritt-
 * für-Schritt-Anleitung, was der Mensch zwischen Pool-Manager und MBK
 * konkret tun muss, damit das SCORM-Paket aktuell bleibt.
 *
 * **Eingaben (alle pure Frontend-Daten):**
 *   - `plan`: Output von `buildAirGapBulkPlan(...)` aus
 *     `lib/airGapBulkPlan.js`. Pro Item enthält er einen `status`
 *     ('new' | 'update' | 'skip-current' | 'skip-customized' |
 *     'skip-blocked').
 *   - `existingPrompts`: alle in der DB persistierten ExportPrompts
 *     (Air-Gap- und Legacy-Records gemischt — wir filtern selbst).
 *   - `lernpakete`, `allgemeineAufgaben`, `phaseAktivitaeten`,
 *     `katalogById`: für menschenlesbare Labels in den Schritten.
 *
 * **Ausgaben:**
 *   {
 *     steps: ActionStep[],
 *     hasMetaPrompt: boolean,
 *     hasStructuralChange: boolean,
 *     hasContentChange: boolean,
 *     hasDeletions: boolean,
 *     deletions: TombstoneDeletion[],
 *     isEmpty: boolean,
 *   }
 *
 * **ActionStep-Shape:**
 *   {
 *     id: string,                // stabiler React-Key
 *     kind: 'meta_prompt'        // Schritt 1: System-Prompt setzen
 *         | 'paste_payload'      // Payload 1/2/3/4 in MBK kopieren
 *         | 'replace_manifest'   // imsmanifest.xml im ZIP austauschen
 *         | 'replace_task_html'  // task-<id>.html im ZIP austauschen
 *         | 'delete_task_html',  // task-<id>.html im ZIP entfernen
 *     title: string,             // kurze Überschrift
 *     description: string,       // Klartext-Anleitung für den Operator
 *     payloadHint?: string,      // optionaler Hinweis auf Payload-Block
 *     filename?: string,         // bei *_task_html / replace_manifest
 *     referenceId?: string,      // bei *_task_html / delete_task_html
 *   }
 *
 * **Tombstone-Heuristik (Option B):** Wir nehmen alle DB-Records vom
 * Typ `mbk_task_content_payload` oder `mbk_micro_payload`, deren
 * `reference_id` im aktuellen Plan **nicht** mehr vorkommt — diese
 * Items wurden seit der letzten Übergabe gelöscht und brauchen einen
 * Lösch-Schritt.
 */

const RELEVANT_AIRGAP_TYPES = new Set([
  'mbk_system_context',
  'mbk_structure_payload',
  'mbk_task_content_payload',
  'mbk_micro_payload',
]);

const DELETE_RELEVANT_TYPES = new Set([
  'mbk_task_content_payload',
  'mbk_micro_payload',
]);

/** SCORM-Dateiname für eine Reference-ID. Spiegel von buildScormFilenameForReference. */
function filenameForRef(referenceId) {
  return `task-${referenceId}.html`;
}

/**
 * Liefert ein menschenlesbares Label für eine Reference-ID, basierend auf
 * den geladenen Quelldaten. Fallback: die rohe ID.
 */
function labelForReference({ referenceId, lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById }) {
  const lp = lernpakete?.find((x) => x.id === referenceId);
  if (lp) return `📦 Lernpaket „${lp.titel_des_pakets || referenceId}"`;
  const aa = allgemeineAufgaben?.find((x) => x.id === referenceId);
  if (aa) return `🎯 Aufgabe „${aa.titel || referenceId}"`;
  const pa = phaseAktivitaeten?.find((x) => x.id === referenceId);
  if (pa) {
    const katalogName = katalogById?.get?.(pa.aktivitaet_id)?.name || 'Aktivität';
    return `🤖 ${katalogName} (${referenceId})`;
  }
  return `Item ${referenceId}`;
}

/**
 * Zentraler Builder.
 */
export function buildOperatorActionPlan({
  plan = [],
  existingPrompts = [],
  einheitId = null,
  lernpakete = [],
  allgemeineAufgaben = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
} = {}) {
  // ── 1. Plan-Items nach Section partitionieren ────────────────────────
  const writeItems = plan.filter((it) => it.status === 'new' || it.status === 'update');

  const structuralWrite = writeItems.find((it) => it.section === 'mbk_structure_payload') || null;
  const systemContextWrite = writeItems.find((it) => it.section === 'mbk_system_context') || null;
  const taskContentWrites = writeItems.filter((it) => it.section === 'mbk_task_content_payload');
  const microWrites = writeItems.filter((it) => it.section === 'mbk_micro_payload');

  // ── 2. Tombstone-Heuristik: DB hat Records, die im Plan fehlen ───────
  // Plan-Reference-IDs pro Section sammeln.
  const planRefsBySection = new Map();
  for (const it of plan) {
    if (!planRefsBySection.has(it.section)) planRefsBySection.set(it.section, new Set());
    if (it.referenceId) planRefsBySection.get(it.section).add(it.referenceId);
  }

  const deletions = [];
  for (const rec of existingPrompts) {
    if (einheitId && rec.einheit_id !== einheitId) continue;
    if (!DELETE_RELEVANT_TYPES.has(rec.prompt_type)) continue;
    if (!rec.reference_id) continue;

    const liveSet = planRefsBySection.get(rec.prompt_type);
    if (!liveSet || !liveSet.has(rec.reference_id)) {
      // Doppelte (z. B. wenn ein Item sowohl in task_content als auch micro
      // existiert) sammeln wir trotzdem getrennt — denn die HTML-Datei ist
      // dieselbe, und der Operator soll das nur EINMAL löschen müssen.
      const filename = filenameForRef(rec.reference_id);
      if (!deletions.some((d) => d.filename === filename)) {
        deletions.push({
          referenceId: rec.reference_id,
          filename,
          // Wir wissen nicht mehr, was der Record genau war — deshalb
          // nur die ID, kein Quell-Label.
          label: `Gelöschtes Item ${rec.reference_id}`,
          sourceType: rec.prompt_type,
        });
      }
    }
  }

  // ── 3. Hat das überhaupt etwas zu tun? ───────────────────────────────
  const hasStructuralChange = !!structuralWrite || !!systemContextWrite;
  const hasContentChange = taskContentWrites.length > 0 || microWrites.length > 0;
  const hasDeletions = deletions.length > 0;
  const isEmpty = !hasStructuralChange && !hasContentChange && !hasDeletions;
  const hasMetaPrompt = !isEmpty;

  // ── 4. Schritte zusammenbauen ────────────────────────────────────────
  const steps = [];

  if (isEmpty) {
    return {
      steps: [],
      hasMetaPrompt: false,
      hasStructuralChange: false,
      hasContentChange: false,
      hasDeletions: false,
      deletions: [],
      isEmpty: true,
    };
  }

  // 4a. Meta-System-Prompt (immer Schritt 1, sobald irgendwas zu tun ist).
  steps.push({
    id: 'meta-prompt',
    kind: 'meta_prompt',
    title: 'Meta-System-Prompt setzen',
    description:
      'Starte eine frische MBK-Sitzung und sende als allerersten Prompt den ' +
      'Meta-System-Prompt (Version 2.0). Warte auf die Bestätigung „MBK v2.0 bereit.", ' +
      'bevor du Payload 1 schickst.',
  });

  // 4b. System-Kontext (falls neu/geändert).
  if (systemContextWrite) {
    steps.push({
      id: 'paste-system-context',
      kind: 'paste_payload',
      title: 'Payload 1 (System-Kontext) übergeben',
      description:
        'Kopiere den System-Kontext-Block in die MBK. Der enthaltene ' +
        'system_context_hash gilt für die gesamte Sitzung und muss zu allen ' +
        'folgenden Payloads passen.',
      payloadHint: 'System-Kontext',
    });
  }

  // 4c. Struktur-Payload + Manifest (Strukturänderung).
  if (structuralWrite) {
    steps.push({
      id: 'paste-structure',
      kind: 'paste_payload',
      title: 'Payload 2 (Struktur) übergeben',
      description:
        'Kopiere den Struktur-Payload in die MBK. Sie wird daraus das neue ' +
        'imsmanifest.xml und alle scorm_file_mapping-Einträge erzeugen.',
      payloadHint: 'Struktur',
    });
    steps.push({
      id: 'replace-manifest',
      kind: 'replace_manifest',
      title: 'imsmanifest.xml im SCORM-ZIP austauschen',
      description:
        'Ersetze die imsmanifest.xml im bestehenden SCORM-ZIP durch die neue ' +
        'Datei aus der MBK-Antwort. Andere Dateien bleiben unangetastet, solange ' +
        'sich ihre Inhalte nicht geändert haben.',
      filename: 'imsmanifest.xml',
    });
  }

  // 4d. Inhalts-Updates (Payload 3) — pro Item ein eigener HTML-Tausch.
  for (const it of taskContentWrites) {
    const label = labelForReference({
      referenceId: it.referenceId,
      lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById,
    });
    steps.push({
      id: `paste-task-${it.referenceId}`,
      kind: 'paste_payload',
      title: `Payload 3 für ${label}`,
      description:
        `Kopiere den Aufgabeninhalt-Payload für „${it.label}" in die MBK. ` +
        `Sie wird die zugehörige task-${it.referenceId}.html neu schreiben.`,
      payloadHint: 'Aufgabeninhalt',
      referenceId: it.referenceId,
    });
    steps.push({
      id: `replace-task-${it.referenceId}`,
      kind: 'replace_task_html',
      title: `task-${it.referenceId}.html im ZIP austauschen`,
      description:
        `Ersetze die Datei task-${it.referenceId}.html im SCORM-ZIP durch die ` +
        `neue Version aus der MBK-Antwort. Alle anderen Task-Dateien bleiben unverändert.`,
      filename: filenameForRef(it.referenceId),
      referenceId: it.referenceId,
    });
  }

  // 4e. Micro-Briefings (Payload 4) — pro Item ein eigener HTML-Tausch.
  for (const it of microWrites) {
    const label = labelForReference({
      referenceId: it.referenceId,
      lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById,
    });
    steps.push({
      id: `paste-micro-${it.referenceId}`,
      kind: 'paste_payload',
      title: `Payload 4 für ${label}`,
      description:
        `Kopiere das Micro-Briefing für „${it.label}" in die MBK. ` +
        `Sie wird die zugehörige task-${it.referenceId}.html neu schreiben.`,
      payloadHint: 'Micro-Briefing',
      referenceId: it.referenceId,
    });
    steps.push({
      id: `replace-micro-${it.referenceId}`,
      kind: 'replace_task_html',
      title: `task-${it.referenceId}.html im ZIP austauschen`,
      description:
        `Ersetze die Datei task-${it.referenceId}.html im SCORM-ZIP durch die ` +
        `neue Version aus der MBK-Antwort.`,
      filename: filenameForRef(it.referenceId),
      referenceId: it.referenceId,
    });
  }

  // 4f. Löschungen (Tombstones).
  for (const del of deletions) {
    steps.push({
      id: `delete-${del.referenceId}`,
      kind: 'delete_task_html',
      title: `${del.filename} aus dem ZIP entfernen`,
      description:
        `Im Pool-Manager existiert kein Aufgaben-Record mehr für ` +
        `${del.referenceId}, der frühere Air-Gap-Eintrag ist aber noch in der ` +
        `Datenbank. Lösche die Datei ${del.filename} manuell aus dem SCORM-ZIP. ` +
        `Wenn dieses Item Teil der Lernpfade war, wird der Schritt „imsmanifest.xml ` +
        `austauschen" oben das Manifest entsprechend aufräumen.`,
      filename: del.filename,
      referenceId: del.referenceId,
    });
  }

  return {
    steps,
    hasMetaPrompt,
    hasStructuralChange,
    hasContentChange,
    hasDeletions,
    deletions,
    isEmpty: false,
  };
}