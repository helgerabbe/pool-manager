/**
 * mbkParser.js
 *
 * Reiner Helper, um aus einer LLM-Antwort die `=== FILE: <name> ===` …
 * `=== END ===`-Blöcke zu extrahieren. Wird von allen vier internen
 * MBK-Generatoren (Architekt, Aufgaben-Bauer, Systembaustein-Autor,
 * KI-Aufgaben-Autor) gemeinsam genutzt.
 *
 * Vertragsannahmen:
 *   - FILE-Header und END-Marker stehen jeweils auf eigenen Zeilen.
 *   - Filename darf NICHT leer sein.
 *   - Zwischen Header und END steht ausschließlich Quelltext (kein
 *     Markdown-Codefence — Meta-Prompt verbietet das ausdrücklich).
 *   - Mehrere Blöcke pro Antwort sind erlaubt; Reihenfolge bleibt erhalten.
 *
 * Output: Array von { filename, content } in Reihenfolge des Auftretens.
 */

// Globaler Multiline-Match — beginnt am Header, endet am END-Marker.
// `[\s\S]*?` ist der nicht-gierige Code-Block dazwischen.
const FILE_BLOCK_RE = /^[ \t]*=== FILE:\s*(.+?)\s*===[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*=== END ===[ \t]*$/gm;

/**
 * Extrahiert alle FILE-Blöcke aus einem freien LLM-Text.
 *
 * @param {string} llmText  — Roher Antwort-Text der MBK.
 * @returns {Array<{ filename: string, content: string }>}
 */
export function extractFileBlocks(llmText) {
  if (typeof llmText !== 'string' || llmText.length === 0) return [];
  const out = [];
  let match;
  // Wichtig: Regex auf jeden Aufruf zurücksetzen, weil das `g`-Flag
  // den lastIndex zwischen Aufrufen mitschleppen würde.
  FILE_BLOCK_RE.lastIndex = 0;
  while ((match = FILE_BLOCK_RE.exec(llmText)) !== null) {
    const filename = (match[1] || '').trim();
    const content = match[2] || '';
    if (filename) {
      out.push({ filename, content });
    }
  }
  return out;
}

/**
 * Heuristische Klassifikation eines Filenames in einen `kind`-Wert
 * gemäß MBKGeneratedFile-Entity. Für Generatoren, die nicht von vornherein
 * wissen, welcher Datei-Typ erzeugt wird (z. B. der Architekt liefert
 * Manifest + 4 Dashboards in einem Rutsch).
 */
export function classifyFilename(filename) {
  if (!filename) return null;
  if (filename === 'imsmanifest.xml') return 'manifest';
  if (filename.startsWith('dashboard-')) return 'dashboard';
  if (filename.startsWith('task-')) return 'lernpaket';
  if (filename.startsWith('tasks-themenfeld-')) return 'themenfeld_bundle';
  if (filename.startsWith('projekte-einheit-')) return 'projekt_bundle';
  if (filename.startsWith('system-')) return 'system_baustein';
  if (filename.startsWith('fragment-')) return 'fragment';
  return null;
}