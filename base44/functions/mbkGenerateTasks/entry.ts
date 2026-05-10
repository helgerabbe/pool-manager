/**
 * mbkGenerateTasks.js
 *
 * Generator 2 (der „Aufgaben-Bauer") der internen MBK-Pipeline.
 *
 * Erzeugt PRO AUFRUF GENAU EINE Aufgaben-Hülle (HTML-Datei):
 *   - task-<lernpaket_id>.html              (Lernpaket-Monolith)
 *   - tasks-themenfeld-<themenfeld_id>.html (Themenfeld-Bündel)
 *   - tasks-themenfeld-orphan.html          (Bündel ohne Themenfeld)
 *   - projekte-einheit-<einheit_id>.html    (Projekt-Bündel)
 *
 * Der Operator wählt im AufgabenTab eine konkrete Datei und ruft diese
 * Function damit auf. Es gibt bewusst KEINEN „alle in einem Aufruf"-Modus,
 * weil ein einzelnes Aufgabenpaket schon viel Output produziert — das
 * Bündeln zu einem riesigen Aufruf führt zu Timeouts und ist fehleranfällig.
 * Stattdessen ruft die UI die Function im Loop pro Datei.
 *
 * Inputs:
 *   - einheitId
 *   - uiConfigPayload      (Payload 1)
 *   - structurePayload     (Payload 2)
 *   - taskContentPayload   (Payload 3)
 *   - targetFilename       (welche Datei generieren)
 *
 * Output: { success, file: { filename, kind, action } }, persistiert die
 * Datei als MBKGeneratedFile-Record (überschreibt vorhandene Einträge mit
 * selbem (einheit_id, filename), generator='task').
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── System-Prompt (1:1-Kopie aus lib/mbkAufgabenPrompt.js — Sync-Pflicht). ──
const AUFGABEN_SYSTEM_PROMPT = `# ROLLE
Du bist der "Aufgaben-Bauer" — ein spezialisierter, zustandsloser Sub-Generator der Moodle-Builder-KI (MBK).
Aus einer UI-Config, einem Strukturpayload und einem Task-Content-Payload erzeugst du die deterministischen HTML-Hüllen für Aufgaben einer Einheit. Mehr nicht. Du erfindest KEINE Aufgaben, kürzt KEINE Inhalte und änderst KEINE Texte — du renderst, was im Task-Content steht, in eine konsistente Hülle.

# OUTPUT-FORMAT (STRIKT)
Liefere AUSSCHLIESSLICH FILE-Blöcke, exakt in dieser Form, ohne Markdown-Codefences (\`\`\`):

=== FILE: <dateiname> ===
<roher Quelltext der Datei, ein 1:1-kopierbares Stück Code>
=== END ===

Regeln:
- Keine Erklärungen, keine Begrüßung, keine Kommentare außerhalb der FILE-Blöcke.
- KEIN \`\`\`html-Codefence INNERHALB eines FILE-Blocks.
- Du erstellst keine echten Dateien auf einem Filesystem — der Output ist reiner Text im Antwort-Body.
- Behaupte nie "Datei wurde gespeichert", "Download bereit" o. ä.

# AUFTRAGSARTEN
Der Aufruf liefert dir IMMER genau eine Zieldatei mit:
  - \`targetFilename\` (z.B. "task-abc123.html")
  - \`targetMappingEntry\` aus \`structurePayload.scorm_file_mapping\` (kind, source_id, titel, contained_aufgabe_ids, placeholder_activity_ids, navigation_context, …)
  - \`targetTaskContentItems\` aus \`taskContentPayload.items\`, gefiltert auf die für diese Datei relevanten Items (typischerweise 1 Item für Lernpaket, n Items für Bündel)

Du musst NUR diese eine Datei erzeugen. Keine zusätzlichen Files, keine Vorab-Kommentare.

# WAS DU GENAU ERZEUGST

## Allgemeine HTML-Struktur (gilt für ALLE Aufgaben-Hüllen)
- \`<!DOCTYPE html>\` + \`<html lang="de">\`.
- Im \`<head>\` zwingend diese drei \`<meta>\`-Tags (1:1 aus den Payload-Metas):
    \`<meta name="mbk-airgap-version" content="airgap-1.6.0" />\`
    \`<meta name="mbk-system-context-hash" content="[meta.system_context_hash aus structurePayload]" />\`
    \`<meta name="mbk-ui-config-hash" content="[meta.ui_config_hash aus uiConfigPayload]" />\`
- Im \`<head>\` außerdem die Einbindung der Activity-Runtime (statisch im SCORM-ZIP):
    \`<link rel="stylesheet" href="mbk-activity-runtime.css" />\`
    \`<script defer src="mbk-activity-runtime.js"></script>\`
- Ein \`<style>\`-Block mit dem **vollständigen Inhalt von \`uiConfigPayload.ui_global_config.css_variables\`** (1:1 inline, kein Link, keine Auslassungen).
- Direkt nach \`<body>\`: die Tab-Bar aus \`uiConfigPayload.ui_global_config.tab_bar_html\` (1:1 übernehmen).
- Direkt danach: das Header-Template aus \`uiConfigPayload.ui_global_config.default_header_html\` (1:1 übernehmen). Ersetze:
    * \`{{title}}\` durch \`targetMappingEntry.titel\` (Fallback: \`item_type\`-spezifisch sinnvoll, z.B. "Aufgaben des Themenfelds").
    * \`{{back_targets}}\` durch eine Liste von Back-Links zu allen Dateinamen in \`targetMappingEntry.navigation_context\`. Wenn das Header-Template keine Logik dafür enthält, rendere stattdessen einen einfachen \`<nav class="back-links">\` mit \`<a href="<filename>">← <Lerntyp-Label></a>\` pro Eintrag (Lerntyp-Label aus Filename ableiten: "dashboard-pragmatiker.html" → "Pragmatiker").
- Hauptbereich (\`<main>\`): siehe pro Datei-Typ unten.
- **Verboten** (eigener Code): EIGENE \`<script>\`-Blöcke mit JavaScript-Logik, \`history.back()\`, externe Stylesheets, externe Schriften, eigene Inline-CSS-Blöcke außerhalb des Style-Tags.
- **Erlaubt**: der bereits oben spezifizierte \`<script defer src="mbk-activity-runtime.js">\`-Tag, sowie nur Selektoren, die in \`css_variables\`, \`tab_bar_html\` oder der Activity-Runtime definiert sind.

# AKTIVITÄTS-RUNTIME (WICHTIG)
Es gibt eine vorgefertigte, statische **Activity-Runtime** (\`mbk-activity-runtime.js\` + \`mbk-activity-runtime.css\`), die im SCORM-ZIP mitgeliefert wird. Sie macht aus deklarativen Containern interaktive Übungen (Drag&Drop, Live-Check, Score-Meldung an Moodle). **Du erfindest KEINE Interaktivität — du schreibst nur den passenden Container mit JSON-Config**.

Die konkreten Render-Anweisungen pro Aktivitätstyp werden vom Aufruf-System dynamisch an diesen System-Prompt angehängt — du findest sie weiter unten im Abschnitt **"AKTIVITÄTSTYP-SPEZIFISCHE ANWEISUNGEN"**. Nur die Typen, die im aktuellen Auftrag tatsächlich vorkommen, werden dort eingewoben.

## Aktivitäts-Typen ohne spezifische Anweisung
Wenn ein Aktivitätstyp im Abschnitt "AKTIVITÄTSTYP-SPEZIFISCHE ANWEISUNGEN" NICHT auftaucht, **rendere ihn statisch** gemäß den Regeln in Abschnitt "WAS DU GENAU ERZEUGST" weiter unten: Karte mit Titel, \`field_values\` als Definition-List (\`<dl>\`), optional \`master_aufgaben[].field_values\` als verschachtelte \`<dl>\` darunter.

## A · Lernpaket-Monolith (kind: "lernpaket")
Filename: \`task-<lernpaket_id>.html\`. Genau 1 Item in \`targetTaskContentItems\` mit \`item_type === "lernpaket"\`.

Render im \`<main>\`:
1. Header-Sektion mit \`<h1>{titel}</h1>\` und einer Lernziel-Liste (\`<ul class="lernziele">\` aus \`item.lernziele[].formulierung_fachsprache\` bzw. \`schueler_uebersetzung\`, falls vorhanden).
2. Pro Phase ("Input", "Übung", "Abschluss") in dieser festen Reihenfolge ein \`<section class="phase phase-<input|uebung|abschluss>" data-phase="<Phasenname>">\` mit \`<h2>\` und einer Liste von Aktivitäten.
3. Pro Aktivität (\`item.aktivitaeten[]\`, sortiert nach \`reihenfolge\`):
   - Bei \`erstellungs_modus === "manuell"\`: Karte mit Titel (\`aktivitaet_name\`), den \`field_values\` als Definition-List (\`<dl>\`), optional \`master_aufgaben[].field_values\` als verschachtelte \`<dl>\` darunter. Hänge \`<p class="transkript">{transkript}</p>\` an, wenn vorhanden. Hänge \`<p class="alt-text">{alt_text}</p>\` an, wenn vorhanden.
   - Bei \`erstellungs_modus === "ki"\`: NUR den Platzhalter-Container ausgeben:
       \`<div data-mbk-placeholder="activity" data-activity-id="{activity_id}" class="ki-fragment-slot"><p>(KI-Fragment wird vom Merger eingesetzt: {aktivitaet_name})</p></div>\`
     KEINE Inhalte erfinden. Der Generator 4 liefert das Fragment später.
4. Footer mit Hinweis "Lernpaket {reihenfolge_nummer}, ca. {geschaetzte_dauer_minuten} Minuten" (beide nur wenn vorhanden).

## B · Themenfeld-Bündel (kind: "themenfeld_bundle")
Filename: \`tasks-themenfeld-<themenfeld_id>.html\` bzw. \`tasks-themenfeld-orphan.html\`. \`targetTaskContentItems\` enthält n Items mit \`item_type === "allgemeine_aufgabe"\`.

Render im \`<main>\`:
1. \`<h1>{targetMappingEntry.titel || "Aufgaben des Themenfelds"}</h1>\` + kurze Einleitung "Hier findest du alle Aufgaben des Themenfelds.".
2. Pro Aufgabe in \`targetTaskContentItems\` (Reihenfolge so, wie sie übergeben wird):
   - Bei \`erstellungs_modus === "manuell"\`: \`<article class="aufgabe">\` mit:
     * \`<h2>{titel}</h2>\` — Anforderungsebene/Mission/Schwierigkeitsgrad als Badge-Zeile.
     * \`{aufgabenstellung}\` als \`<div class="aufgabenstellung">\` (1:1, keine Kürzung).
     * Wenn \`aufgaben_bild_url\`: \`<img src="{aufgaben_bild_url}" alt="{alt_text || titel}">\`.
     * Wenn \`materialien\`: Liste mit \`<a href>\`/Texten gemäß \`type\`.
     * Wenn \`erwartungshorizont\` oder \`musterloesung\`: collapsibles \`<details><summary>Erwartungshorizont</summary>...</details>\`.
     * Abgabe-Block (\`<aside class="abgabe">\`) mit \`ergebnis_form\`, \`ergebnis_dateiformat\`, \`output_formats\`, \`custom_format\`, \`quality_focus\`, \`rubric_criteria\` (sofern vorhanden, sonst weglassen).
   - Bei \`erstellungs_modus === "ki"\`: Platzhalter-Container:
       \`<article class="aufgabe ki-pending"><div data-mbk-placeholder="aufgabe" data-aufgabe-id="{reference_id}" class="ki-fragment-slot"><p>(KI-Aufgabe wird vom Merger eingesetzt: {titel})</p></div></article>\`

## C · Projekt-Bündel (kind: "projekt_bundle")
Filename: \`projekte-einheit-<einheit_id>.html\`. Wie B, aber mit \`<h1>{titel || "Projekte der Einheit"}</h1>\` und einer Einleitung "Hier findest du alle Projekte und Transferaufgaben der Einheit.". Pro Aufgabe identische Render-Regeln wie B; \`aufgabentyp_projekt\` erscheint zusätzlich in der Badge-Zeile.

# HALT-BEDINGUNGEN
Falls eine der folgenden Bedingungen zutrifft, gib AUSSCHLIESSLICH eine einzige, kurze Fehlerzeile aus:

- \`uiConfigPayload.ui_global_config.css_variables\` ist null oder leer.
- \`uiConfigPayload.ui_global_config.tab_bar_html\` ist null oder leer.
- \`targetMappingEntry\` fehlt oder hat keinen \`kind\` ∈ {lernpaket, themenfeld_bundle, projekt_bundle}.
- \`targetTaskContentItems\` ist leer oder undefiniert.

Format der Fehlerzeile:
\`FEHLER: <kurze Begründung>\`

# WICHTIGE PRINZIPIEN
- Du bist stateless. Was nicht im Auftrag steht, weißt du nicht.
- Du erfindest KEINE Aufgaben-Inhalte. Wenn ein Feld leer ist → Feld weglassen, nicht "platzhalterhaft" füllen.
- KI-Items bekommen IMMER nur den Platzhalter-Container (siehe oben). Niemals Aufgabenstellung/Lösung selbst formulieren.
- Bei Unklarheit zwischen mehreren Feldern (z.B. \`schueler_uebersetzung\` vs \`formulierung_fachsprache\`): bevorzuge die schülergerechte Variante, falls vorhanden.
- Niemals \`<script>\` einbauen, niemals externe URLs nachladen.`;

// ── FNV-1a-Hash für input_hash. ──
function fnv1a64Hex(str) {
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  let hash = FNV_OFFSET;
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= BigInt(bytes[i]);
    hash = (hash * FNV_PRIME) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

// ── FILE-Block-Parser (gleiches Format wie Generator 1). ──
const FILE_BLOCK_RE = /^[ \t]*=== FILE:\s*(.+?)\s*===[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*=== END ===[ \t]*$/gm;
function extractFileBlocks(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  let m;
  FILE_BLOCK_RE.lastIndex = 0;
  while ((m = FILE_BLOCK_RE.exec(text)) !== null) {
    const filename = (m[1] || '').trim();
    if (filename) out.push({ filename, content: m[2] || '' });
  }
  return out;
}

/**
 * Filtert die für eine Zieldatei relevanten Task-Content-Items aus dem
 * Bundle und sucht den passenden Mapping-Eintrag im Strukturpayload.
 * Reine Routing-Logik — keine Render-Entscheidungen.
 */
function selectTargetContext({ structurePayload, taskContentPayload, targetFilename }) {
  const mapping = structurePayload?.scorm_file_mapping || [];
  const entry = mapping.find((e) => e?.filename === targetFilename);
  if (!entry) {
    return { error: `Kein scorm_file_mapping-Eintrag für "${targetFilename}" gefunden.` };
  }
  const items = taskContentPayload?.items || [];
  let targetItems = [];

  if (entry.kind === 'lernpaket') {
    targetItems = items.filter(
      (it) => it?.item_type === 'lernpaket' && it?.reference_id === entry.source_id
    );
  } else if (entry.kind === 'themenfeld_bundle' || entry.kind === 'projekt_bundle') {
    const containedIds = new Set(entry.contained_aufgabe_ids || []);
    targetItems = items.filter(
      (it) => it?.item_type === 'allgemeine_aufgabe' && containedIds.has(it.reference_id)
    );
  } else {
    return { error: `Unbekannter kind "${entry.kind}" in Mapping-Eintrag.` };
  }

  if (targetItems.length === 0) {
    return { error: `Keine Task-Content-Items für "${targetFilename}" gefunden.` };
  }

  return { entry, targetItems };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { einheitId, uiConfigPayload, structurePayload, taskContentPayload, targetFilename, model } = body;

    if (!einheitId || !uiConfigPayload || !structurePayload || !taskContentPayload || !targetFilename) {
      return Response.json(
        { error: 'einheitId, uiConfigPayload, structurePayload, taskContentPayload und targetFilename sind erforderlich.' },
        { status: 400 }
      );
    }

    // ── Whitelist erlaubter Filename-Patterns. Schützt vor versehentlichem
    //    Aufruf z.B. mit einem Dashboard-Filename. ──
    const isAllowed =
      targetFilename.startsWith('task-') && targetFilename.endsWith('.html')
      || targetFilename.startsWith('tasks-themenfeld-') && targetFilename.endsWith('.html')
      || targetFilename.startsWith('projekte-einheit-') && targetFilename.endsWith('.html');
    if (!isAllowed) {
      return Response.json(
        { error: `targetFilename "${targetFilename}" ist kein gültiger Aufgaben-Dateiname.` },
        { status: 400 }
      );
    }

    // ── Routing: passenden Mapping-Eintrag + Items rauspicken. ──
    const ctx = selectTargetContext({ structurePayload, taskContentPayload, targetFilename });
    if (ctx.error) {
      return Response.json({ error: ctx.error }, { status: 400 });
    }

    // ── Override-Prompt aus MBKGlobalPrompt (falls gepflegt). ──
    let systemPrompt = AUFGABEN_SYSTEM_PROMPT;
    try {
      const overrides = await base44.asServiceRole.entities.MBKGlobalPrompt.filter({
        schluessel: 'mbk_aufgaben_system_prompt',
      });
      const ov = overrides?.[0];
      if (ov && ov.ist_aktiv !== false && typeof ov.prompt_text === 'string' && ov.prompt_text.trim().length > 0) {
        systemPrompt = ov.prompt_text;
      }
    } catch (_err) {
      // Default reicht — Override ist optional.
    }

    // ── Aktivitätstyp-spezifische Anweisungen einweben. ──
    // Pro Aktivitätstyp gibt es einen eigenen, im AufgabenTab editierbaren
    // Datensatz (Kategorie 'aktivitaetstyp'). Wir laden alle aktiven
    // Einträge und weben nur die ein, deren `aktivitaet_name` im aktuellen
    // Auftrag wirklich vorkommt — das hält den Prompt fokussiert und spart
    // Tokens.
    let activityInstructionsBlock = '';
    try {
      const typAnweisungen = await base44.asServiceRole.entities.MBKGlobalPrompt.filter({
        kategorie: 'aktivitaetstyp',
      });
      // Welche aktivitaet_names kommen im aktuellen Auftrag vor?
      const namesInTask = new Set();
      for (const item of ctx.targetItems) {
        for (const a of item?.aktivitaeten || []) {
          if (a?.aktivitaet_name) namesInTask.add(a.aktivitaet_name);
        }
      }
      // Match: schluessel === 'aktivitaet_<slug>' UND der zugehörige
      // anzeigename enthält den Aktivitäts-Namen ODER schluessel matcht
      // einen normalisierten Namen. Wir nehmen den einfachsten Weg: der
      // anzeigename folgt der Konvention "Aktivität: <Name>".
      const relevant = (typAnweisungen || [])
        .filter((t) => t && t.ist_aktiv !== false && typeof t.prompt_text === 'string')
        .filter((t) => {
          const an = String(t.anzeigename || '');
          // "Aktivität: Lückentext" → "Lückentext"
          const namePart = an.replace(/^Aktivit[äa]t:\s*/, '').trim();
          return namesInTask.has(namePart);
        })
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      if (relevant.length > 0) {
        activityInstructionsBlock = [
          '',
          '---',
          '',
          '# AKTIVITÄTSTYP-SPEZIFISCHE ANWEISUNGEN',
          '',
          'Die folgenden Render-Anweisungen gelten für die Aktivitätstypen, die im aktuellen Auftrag vorkommen. Wende sie strikt an — sie haben Vorrang vor der statischen Default-Darstellung.',
          '',
          ...relevant.map((t) => t.prompt_text.trim()),
        ].join('\n');
      }
    } catch (_err) {
      // Wenn das Laden scheitert, fallen wir auf die statische Default-
      // Darstellung zurück — kein Hard-Fail.
    }
    if (activityInstructionsBlock) {
      systemPrompt = systemPrompt + '\n' + activityInstructionsBlock;
    }

    // ── User-Prompt zusammenbauen. ──
    const userPrompt = [
      'Erzeuge GENAU EINE Aufgaben-Hülle gemäß den Regeln im System-Prompt.',
      '',
      `## Zieldatei`,
      '```',
      `targetFilename: ${targetFilename}`,
      `kind: ${ctx.entry.kind}`,
      `source_id: ${ctx.entry.source_id}`,
      `titel: ${ctx.entry.titel || '(ohne Titel)'}`,
      '```',
      '',
      '## UI-Config (Payload 1)',
      '```json',
      JSON.stringify(uiConfigPayload, null, 2),
      '```',
      '',
      '## Strukturpayload — relevanter Mapping-Eintrag',
      '```json',
      JSON.stringify(ctx.entry, null, 2),
      '```',
      '',
      '## Strukturpayload — Meta (für Hash-Tags)',
      '```json',
      JSON.stringify(structurePayload?.meta || {}, null, 2),
      '```',
      '',
      '## Task-Content — relevante Items',
      '```json',
      JSON.stringify(ctx.targetItems, null, 2),
      '```',
      '',
      `Liefere GENAU EINEN FILE-Block für "${targetFilename}". Keine weiteren Dateien.`,
    ].join('\n');

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const usedModel = model || 'claude_sonnet_4_6';

    // ── LLM-Call. ──
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: usedModel,
    });

    const llmText = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.text || '');
    const blocks = extractFileBlocks(llmText);

    if (blocks.length === 0) {
      return Response.json(
        {
          error: 'Keine FILE-Blöcke in der LLM-Antwort gefunden.',
          rawResponse: llmText.slice(0, 4000),
        },
        { status: 502 }
      );
    }

    // Wir akzeptieren NUR den passenden Filename. Alles andere wird ignoriert.
    const block = blocks.find((b) => b.filename === targetFilename) || blocks[0];

    // ── Persistieren. ──
    const inputHash = fnv1a64Hex(JSON.stringify({
      ui: uiConfigPayload?.meta?.ui_config_hash || null,
      sys: structurePayload?.meta?.system_context_hash || null,
      target: targetFilename,
      itemCount: ctx.targetItems.length,
    }));

    const kindMap = {
      'lernpaket': 'lernpaket',
      'themenfeld_bundle': 'themenfeld_bundle',
      'projekt_bundle': 'projekt_bundle',
    };

    const data = {
      einheit_id: einheitId,
      filename: block.filename,
      kind: kindMap[ctx.entry.kind] || 'lernpaket',
      source_id: ctx.entry.source_id,
      content: block.content,
      generator: 'task',
      model: usedModel,
      input_hash: inputHash,
    };

    const existing = await base44.asServiceRole.entities.MBKGeneratedFile.filter({
      einheit_id: einheitId,
      filename: block.filename,
    });

    let action;
    let id;
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.MBKGeneratedFile.update(existing[0].id, data);
      id = existing[0].id;
      action = 'updated';
    } else {
      const created = await base44.asServiceRole.entities.MBKGeneratedFile.create(data);
      id = created.id;
      action = 'created';
    }

    return Response.json({
      success: true,
      generator: 'task',
      model: usedModel,
      file: {
        id,
        filename: data.filename,
        kind: data.kind,
        action,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});