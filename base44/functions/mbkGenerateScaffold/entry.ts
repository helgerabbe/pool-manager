/**
 * mbkGenerateScaffold.js
 *
 * Generator 1 (der „Architekt") der internen MBK-Pipeline.
 *
 * Erzeugt in EINEM LLM-Call das vollständige statische Gerüst einer Einheit:
 *   - imsmanifest.xml
 *   - dashboard-minimalist.html
 *   - dashboard-pragmatiker.html
 *   - dashboard-ehrgeizig.html
 *   - dashboard-passioniert.html
 *
 * Inputs (aus dem Frontend):
 *   - einheitId
 *   - uiConfigPayload      (Payload 1, mbk_ui_config)
 *   - structurePayload     (Payload 2, mbk_structure_payload)
 *
 * Der Architekt braucht KEINEN System-Kontext (Payload 3) und KEINEN
 * Task-Content — er erfindet keine Inhalte, er baut nur Hüllen + Navigation.
 * Aufgaben-Texte in Dashboards sind reine Titel/Klassifikatoren, die
 * direkt im Strukturpayload (`scorm_file_mapping`) stehen.
 *
 * Output: { files: [{ filename, kind, content }] } und persistiert die
 * Files als MBKGeneratedFile-Records (überschreibt vorhandene Einträge
 * mit selbem (einheit_id, filename)).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Mini-System-Prompt (modular, schlank — keine Operator-Nummerierung,
//    kein Dialog-Skript, keine Phasen-Logik; das alles regelt die UI). ──
const ARCHITEKT_SYSTEM_PROMPT = `# ROLLE
Du bist der "Architekt" — ein spezialisierter, zustandsloser Sub-Generator der Moodle-Builder-KI (MBK).
Du wirst für genau einen Auftrag aufgerufen und kennst die Umgebung danach nicht weiter: aus einer UI-Config und einem Strukturpayload erzeugst du das statische SCORM-Gerüst einer Einheit. Mehr nicht. Inhalte einzelner Aufgaben werden NICHT von dir geliefert — andere Sub-Generatoren übernehmen das.

# OUTPUT-FORMAT (STRIKT)
Liefere AUSSCHLIESSLICH FILE-Blöcke, exakt in dieser Form, ohne Markdown-Codefences (\`\`\`):

=== FILE: <dateiname> ===
<roher Quelltext der Datei, ein 1:1-kopierbares Stück Code>
=== END ===

Regeln:
- Keine Erklärungen, keine Begrüßung, keine Kommentare außerhalb der FILE-Blöcke.
- KEIN \`\`\`html / \`\`\`xml-Codefence INNERHALB eines FILE-Blocks.
- Du erstellst keine echten Dateien auf einem Filesystem, du hast keine Tools dafür — der Output ist reiner Text im Antwort-Body.
- Behaupte nie "Datei wurde gespeichert", "ZIP erstellt", "Download bereit" o. ä.

# WAS DU GENAU ERZEUGST (5 DATEIEN, IN DIESER REIHENFOLGE)

1. **imsmanifest.xml** — SCORM 1.2 Manifest:
   - Namespace \`adlcp\` zwingend deklariert.
   - Jede \`<resource>\` trägt \`adlcp:scormtype="sco"\`.
   - Für JEDEN Eintrag im \`scorm_file_mapping\` ein \`<resource>\`-Element + ein \`<item>\` in \`<organization>\`.
   - Sichtbarkeit: Items mit \`is_hidden_in_moodle: true\` bekommen \`isvisible="false"\`. Die vier Dashboards (kind="dashboard") sind die einzigen mit \`isvisible="true"\`.
   - Start-Item: \`dashboard-minimalist.html\`.
   - Identifier-Schema: \`item-<filename ohne extension>\` für \`<item>\`, \`res-<filename ohne extension>\` für \`<resource>\`. Stabil und kollisionsfrei.

2.–5. **dashboard-minimalist.html / -pragmatiker.html / -ehrgeizig.html / -passioniert.html**
   Jedes Dashboard ist eine vollständige, autarke HTML-Seite:
   - \`<!DOCTYPE html>\` + \`<html lang="de">\`.
   - Im \`<head>\` zwingend diese drei \`<meta>\`-Tags:
       \`<meta name="mbk-airgap-version" content="airgap-1.6.0" />\`
       \`<meta name="mbk-system-context-hash" content="[meta.system_context_hash aus structurePayload]" />\`
       \`<meta name="mbk-ui-config-hash" content="[meta.ui_config_hash aus uiConfigPayload]" />\`
   - Ein \`<style>\`-Block mit dem **vollständigen Inhalt von \`uiConfigPayload.ui_global_config.css_variables\`** (1:1 inline, kein Link, keine Auslassungen).
   - **Zusätzliches Inline-CSS** (an css_variables anhängen, damit alles in einem \`<style>\` steht):
       \`.sektor.locked { opacity: 0.45; pointer-events: none; filter: grayscale(0.4); }\`
       \`.sektor.locked .sektor-lock-hint { display: block; font-size: 0.85em; color: #666; margin-top: 0.5em; }\`
       \`.sektor:not(.locked) .sektor-lock-hint { display: none; }\`
   - Direkt nach \`<body>\`: die Tab-Bar aus \`uiConfigPayload.ui_global_config.tab_bar_html\` (1:1 übernehmen, KEINE eigene Tab-Bar erfinden).
   - Optional unmittelbar danach: das Header-Template aus \`uiConfigPayload.ui_global_config.default_header_html\`. Falls vorhanden, ersetze die Platzhalter \`{{title}}\` durch den Lerntyp-Titel (z. B. "Dashboard – Pragmatiker") und \`{{back_targets}}\` durch einen leeren String (Dashboards haben keinen Back-Link).
   - Hauptbereich (\`<main>\` oder \`<section>\`): visualisiert \`structurePayload.lernpfade.<lerntyp>\`:
     * Pro Sektor ein \`<section class="sektor" data-sektor-id="<sektor.sektor_id>" data-bearbeitungsmodus="<sektor.bearbeitungsmodus>">\`-Block.
     * Innerhalb davon eine Überschrift (\`<h2>\`) mit \`titel\`. Bei \`sektor_typ='arbeitsphase_themenfeld'\` wird \`themenfeld_titel\` als Untertitel/Badge mitgeführt.
     * Direkt unter der \`<h2>\`: ein \`<p class="sektor-lock-hint">🔒 Dieser Abschnitt wird freigeschaltet, wenn du den vorherigen Abschnitt abgeschlossen hast.</p>\` — dieser Hinweis ist per CSS nur in gesperrten Sektoren sichtbar.
     * Pro Root-Item (\`parent_instance_id\` ist null) eine klickbare Karte mit \`href\` = der Dateiname, den du im \`scorm_file_mapping\` zur \`ref_id\` findest. Suche zuerst über \`source_id === ref_id\` (Lernpaket, Systembaustein), dann über \`contained_aufgabe_ids\` (für Aufgaben in Themenfeld-/Projekt-Bündeln).
     * Bündel-Children (Items mit \`parent_instance_id\`) werden als verschachtelte Liste unter ihrem Bundle-Container gerendert.
     * System-Items (\`type='system'\`): Filename ist \`system-<lerntyp>-<ref_id>.html\` (Pattern aus dem Mapping). Der Lerntyp ist der gerade gerenderte Pfad.
   - **Sektor-Gating-Skript** (Schema v4): Direkt vor \`</body>\` ein einziges \`<script>\`-Block, EXAKT so:
       \`\`\`
       <script>
       (function(){
         var sektoren = document.querySelectorAll('.sektor');
         var prevDone = true;
         for (var i = 0; i < sektoren.length; i++) {
           var s = sektoren[i];
           var id = s.getAttribute('data-sektor-id');
           var modus = s.getAttribute('data-bearbeitungsmodus');
           var done = false;
           try { done = localStorage.getItem('mbk_sektor_done_' + id) === 'true'; } catch(e) {}
           if (modus === 'sequenziell' && !prevDone && !done) {
             s.classList.add('locked');
             // Karten wirklich nicht klickbar machen (Backup zu pointer-events).
             var links = s.querySelectorAll('a');
             for (var j = 0; j < links.length; j++) {
               links[j].setAttribute('aria-disabled', 'true');
               links[j].addEventListener('click', function(ev){ ev.preventDefault(); });
             }
           }
           // Nur abgeschlossene oder freie Sektoren öffnen den nächsten.
           prevDone = done || modus === 'frei' || prevDone === false ? (done || (modus === 'frei' && prevDone)) : true;
           // Klar formuliert: Ein sequenzieller Sektor schaltet den Folge-Sektor erst frei, wenn er selbst abgeschlossen ist.
           // Ein freier Sektor reicht den prevDone-Status seines Vorgängers durch.
           if (modus === 'sequenziell') prevDone = done;
         }
       })();
       </script>
       \`\`\`
     Dieses Skript ist die EINZIGE erlaubte Ausnahme von der „Verboten: \`<script>\`"-Regel. Keine anderen Skripte einbauen.
   - **Robuster Fallback**: Wenn eine \`ref_id\` im Mapping NICHT gefunden wird, setze \`href="#missing-<ref_id>"\` und labele die Karte mit dem Suffix " (noch nicht generiert)". NIEMALS deshalb abbrechen.
   - **Verboten** (außer dem Gating-Skript oben): \`history.back()\`, externe Stylesheets, externe Schriften, Inline-Styles in Karten.
   - **Erlaubt**: nur Selektoren, die in \`css_variables\` oder \`tab_bar_html\` definiert sind, plus die \`.sektor\`/\`.locked\`/\`.sektor-lock-hint\`-Klassen aus dem ergänzten Inline-CSS.

# HALT-BEDINGUNGEN
Falls eine der folgenden Bedingungen zutrifft, gib AUSSCHLIESSLICH eine einzige, kurze Fehlerzeile aus (kein FILE-Block, kein Markdown):

- \`uiConfigPayload.ui_global_config.css_variables\` ist null oder leer.
- \`uiConfigPayload.ui_global_config.tab_bar_html\` ist null oder leer.
- \`structurePayload.scorm_file_mapping\` fehlt, ist leer oder enthält nicht alle vier Pflicht-Dashboards.

Format der Fehlerzeile:
\`FEHLER: <kurze Begründung>\`

# WICHTIGE PRINZIPIEN
- Du bist stateless. Was nicht im Auftrag steht, weißt du nicht.
- Du kommunizierst NICHT mit dem Operator über Phasen, Befehle, Payload-Sequenzen — der Aufruf ist ein einmaliger, isolierter Funktionsaufruf.
- Du erfindest KEINE Aufgabeninhalte. Karten in Dashboards sind nur Titel + Link.
- Bei Unklarheit im Mapping: lieber den Fallback-Link "(noch nicht generiert)" setzen, als zu erfinden.`;

// ── FNV-1a-Hash (16-Zeichen Hex) für input_hash. Klein und stabil ohne Crypto-API. ──
function fnv1a64Hex(str) {
  // Gleiche Implementierung wie in lib/systemContextHash.js — bewusst dupliziert,
  // weil Deno-Functions keine lokalen Imports erlauben.
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

// ── FILE-Block-Parser (Mini-Variante, weil keine lokalen Imports) ──
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

function classifyFilename(filename) {
  if (filename === 'imsmanifest.xml') return 'manifest';
  if (filename.startsWith('dashboard-')) return 'dashboard';
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { einheitId, uiConfigPayload, structurePayload, model, targetFilename } = body;

    if (!einheitId || !uiConfigPayload || !structurePayload) {
      return Response.json(
        { error: 'einheitId, uiConfigPayload und structurePayload sind erforderlich.' },
        { status: 400 }
      );
    }

    // ── Erlaubte Einzeldateien für targetFilename. Alles andere → "alle 5". ──
    const SINGLE_FILE_WHITELIST = new Set([
      'imsmanifest.xml',
      'dashboard-minimalist.html',
      'dashboard-pragmatiker.html',
      'dashboard-ehrgeizig.html',
      'dashboard-passioniert.html',
    ]);
    const isSingle = typeof targetFilename === 'string' && SINGLE_FILE_WHITELIST.has(targetFilename);

    // ── User-Prompt zusammenbauen — kompakt: nur die zwei Payloads + klarer Auftrag. ──
    const auftragsZeile = isSingle
      ? `Liefere GENAU EINEN FILE-Block für die Datei "${targetFilename}". Erzeuge keine weiteren Dateien.`
      : 'Liefere genau 5 FILE-Blöcke in dieser Reihenfolge: imsmanifest.xml, dashboard-minimalist.html, dashboard-pragmatiker.html, dashboard-ehrgeizig.html, dashboard-passioniert.html.';

    const userPrompt = [
      'Erzeuge das statische SCORM-Gerüst gemäß den Regeln im System-Prompt.',
      '',
      '## UI-Config (Payload 1)',
      '```json',
      JSON.stringify(uiConfigPayload, null, 2),
      '```',
      '',
      '## Strukturpayload (Payload 2)',
      '```json',
      JSON.stringify(structurePayload, null, 2),
      '```',
      '',
      auftragsZeile,
    ].join('\n');

    // Override-Prompt aus MBKGlobalPrompt (Schlüssel `mbk_architekt_system_prompt`)
    // — wenn vorhanden und aktiv, ersetzt er den eingebauten Default. So kann
    // der Operator den Architekten-Prompt in der MBK-Konsole live anpassen,
    // ohne dass ein Re-Deploy nötig ist.
    let systemPrompt = ARCHITEKT_SYSTEM_PROMPT;
    try {
      const overrides = await base44.asServiceRole.entities.MBKGlobalPrompt.filter({
        schluessel: 'mbk_architekt_system_prompt',
      });
      const ov = overrides?.[0];
      if (ov && ov.ist_aktiv !== false && typeof ov.prompt_text === 'string' && ov.prompt_text.trim().length > 0) {
        systemPrompt = ov.prompt_text;
      }
    } catch (_err) {
      // Fallback auf Default reicht — Override ist optional.
    }

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const usedModel = model || 'claude_sonnet_4_6';

    // ── LLM-Call ──
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

    // ── Persistieren: pro filename ein Upsert. ──
    const inputHash = fnv1a64Hex(JSON.stringify({
      ui: uiConfigPayload?.meta?.ui_config_hash || null,
      sys: structurePayload?.meta?.system_context_hash || null,
      mapLen: structurePayload?.scorm_file_mapping?.length || 0,
    }));

    const persisted = [];
    for (const block of blocks) {
      const kind = classifyFilename(block.filename);
      if (!kind) {
        // Architekt soll nichts anderes liefern — wenn doch, ignorieren.
        continue;
      }
      // Im Single-File-Modus alles ignorieren, was nicht das angeforderte File ist.
      if (isSingle && block.filename !== targetFilename) {
        continue;
      }

      // Existierenden Datensatz finden (max 1 pro (einheit_id, filename))
      const existing = await base44.asServiceRole.entities.MBKGeneratedFile.filter({
        einheit_id: einheitId,
        filename: block.filename,
      });

      const data = {
        einheit_id: einheitId,
        filename: block.filename,
        kind,
        source_id: kind === 'manifest' ? null : block.filename.replace('dashboard-', '').replace('.html', ''),
        content: block.content,
        generator: 'scaffold',
        model: usedModel,
        input_hash: inputHash,
      };

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.MBKGeneratedFile.update(existing[0].id, data);
        persisted.push({ ...data, id: existing[0].id, action: 'updated' });
      } else {
        const created = await base44.asServiceRole.entities.MBKGeneratedFile.create(data);
        persisted.push({ ...data, id: created.id, action: 'created' });
      }
    }

    return Response.json({
      success: true,
      generator: 'scaffold',
      model: usedModel,
      file_count: persisted.length,
      files: persisted.map((f) => ({
        id: f.id,
        filename: f.filename,
        kind: f.kind,
        action: f.action,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});