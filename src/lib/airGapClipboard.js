/**
 * airGapClipboard.js
 *
 * Helfer für den Air-Gap-Übergabe-Workflow:
 *   - copyAsMarkdownFence(payload)  → Clipboard mit ```json-Wrapping (§2.2)
 *   - downloadJson(payload, name)   → Browser-Download als .json
 *   - downloadZip(files, name)      → Browser-Download eines ZIP mit n Dateien
 *
 * Reine Frontend-Helfer, keine Side-Effects ausser Clipboard/Download.
 */
import JSZip from 'jszip';

/**
 * Schreibt ein Payload als ```json-gefenctes Markdown in die Zwischenablage.
 * Das Fence-Format ist Pflicht laut docs/mbk-air-gap-uebergabe.md §2.2,
 * damit die MBK den Block beim Paste eindeutig erkennen kann.
 */
export async function copyAsMarkdownFence(payload) {
  const json = JSON.stringify(payload, null, 2);
  const text = '```json\n' + json + '\n```';
  await navigator.clipboard.writeText(text);
}

/** Triggert einen Browser-Download für ein einzelnes JSON-Payload. */
export function downloadJson(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerBlobDownload(blob, filename);
}

/**
 * Erstellt ein ZIP-Archiv mit mehreren Dateien.
 * @param {Array<{name: string, content: string|object}>} files
 *   `content` darf String (1:1 ablegen) oder Objekt (wird stringified) sein.
 */
export async function downloadZip(files, zipName) {
  const zip = new JSZip();
  for (const f of files) {
    const data = typeof f.content === 'string' ? f.content : JSON.stringify(f.content, null, 2);
    zip.file(f.name, data);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, zipName);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Kleinen Delay, damit der Download wirklich gestartet ist, bevor wir die
  // URL freigeben — sonst verlieren manche Browser den Datei-Handle.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dateinamens-Helper: macht aus einem Titel einen safe Slug. */
export function slugify(input, fallback = 'einheit') {
  const s = (input || '').toString().toLowerCase().trim();
  if (!s) return fallback;
  return s
    .replace(/[äöüß]/g, (ch) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[ch]))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || fallback;
}