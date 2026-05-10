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
const ARCHITEKT_SYSTEM_PROMPT = `Du bist der "Architekt" der Moodle-Builder-KI (MBK).
Deine einzige Aufgabe: aus einer UI-Config und einem Strukturpayload das statische SCORM-Gerüst einer Einheit erzeugen.

# Output-Format (STRIKT)
Liefere NUR FILE-Blöcke in dieser Form, exakt so, ohne Markdown-Codefences:

=== FILE: <dateiname> ===
<roher Quelltext der Datei>
=== END ===

Keine Erklärungen, keine Begrüßung, keine Kommentare außerhalb der FILE-Blöcke.

# Was du erzeugst (genau diese 5 Dateien, in dieser Reihenfolge)

1. **imsmanifest.xml** — SCORM 1.2 Manifest mit \`adlcp\`-Namespace und \`adlcp:scormtype="sco"\` auf jeder Resource. Die vier Dashboards sind die einzigen sichtbaren Items (\`isvisible="true"\`); ALLE anderen Items aus \`scorm_file_mapping\` setzen \`isvisible="false"\`. Start-Item ist \`dashboard-minimalist.html\`.

2. **dashboard-minimalist.html**
3. **dashboard-pragmatiker.html**
4. **dashboard-ehrgeizig.html**
5. **dashboard-passioniert.html**

Jedes Dashboard:
- vollständiges \`<!DOCTYPE html>\` mit \`<head>\` inkl. drei Pflicht-\`<meta>\`-Tags:
    \`<meta name="mbk-airgap-version" content="airgap-1.6.0" />\`
    \`<meta name="mbk-system-context-hash" content="[aus structurePayload.meta.system_context_hash]" />\`
    \`<meta name="mbk-ui-config-hash" content="[aus uiConfigPayload.meta.ui_config_hash]" />\`
- \`<style>\`-Tag im \`<head>\` mit dem Inhalt von \`uiConfigPayload.ui_global_config.css_variables\` (1:1 inline, kein Link).
- direkt nach \`<body>\`: die Tab-Bar aus \`uiConfigPayload.ui_global_config.tab_bar_html\` (1:1 übernehmen, keine eigene Tab-Bar erfinden).
- Hauptbereich: visualisiert den jeweiligen Lernpfad aus \`structurePayload.lernpfade.<lerntyp>\`. Pro Sektor eine Überschrift (\`titel\`), pro Item eine klickbare Karte mit \`href\` auf den Filename, der im \`scorm_file_mapping\` zur \`ref_id\` gehört. Items in Sektoren mit \`sektor_typ='arbeitsphase_themenfeld'\` werden unter \`themenfeld_titel\` gruppiert.
- B-Bündel-Items (parent_instance_id-Verweise) werden als verschachtelte Liste unter ihrem Bundle-Container dargestellt.
- Wenn ein \`ref_id\` nicht im \`scorm_file_mapping\` zu finden ist, setze trotzdem einen \`href="#missing-<ref_id>"\` und labele die Karte mit "(noch nicht generiert)" — niemals abbrechen.
- Strikt KEIN JavaScript, KEIN \`history.back()\`, KEINE externen Stylesheets.

# Halt-Bedingungen
- Brich ab und gib NUR eine kurze Fehlerzeile aus (kein FILE-Block), wenn:
  - \`uiConfigPayload.ui_global_config.css_variables\` oder \`tab_bar_html\` fehlen / null sind.
  - \`structurePayload.scorm_file_mapping\` leer ist oder die vier Pflicht-Dashboards nicht enthält.

Du arbeitest stateless. Jeder Aufruf bekommt frische Daten. Du erfindest keine Inhalte über das hinaus, was die Payloads vorgeben.`;

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
    const { einheitId, uiConfigPayload, structurePayload, model } = body;

    if (!einheitId || !uiConfigPayload || !structurePayload) {
      return Response.json(
        { error: 'einheitId, uiConfigPayload und structurePayload sind erforderlich.' },
        { status: 400 }
      );
    }

    // ── User-Prompt zusammenbauen — kompakt: nur die zwei Payloads + klarer Auftrag. ──
    const userPrompt = [
      'Erzeuge das vollständige statische SCORM-Gerüst gemäß den Regeln im System-Prompt.',
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
      'Liefere genau 5 FILE-Blöcke in dieser Reihenfolge: imsmanifest.xml, dashboard-minimalist.html, dashboard-pragmatiker.html, dashboard-ehrgeizig.html, dashboard-passioniert.html.',
    ].join('\n');

    const fullPrompt = `${ARCHITEKT_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;
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