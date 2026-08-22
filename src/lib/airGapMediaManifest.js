/**
 * airGapMediaManifest.js
 *
 * Datei-Beipack für den Air-Gap-Export (airgap-1.16.0, MBK-Feedback 21.08.):
 * Materialien (PDFs, Bilder, Audio, Video) hängen in den Payloads bisher nur
 * als URLs auf base44-Hosting. Für ein autarkes SCORM-Paket müssen die
 * Dateien MITGELIEFERT werden.
 *
 * Dieses Modul ist die reine Sammel-Logik (keine I/O):
 *   - collectMediaEntries(payloads) → dedupliziete Liste { url, filename }
 *     aller app-gehosteten Datei-URLs, die irgendwo in den Payloads stecken.
 *   - buildMediaManifest(entries)   → media-manifest.json-Inhalt
 *     (URL → lokaler Pfad im ZIP + Download-Status).
 *
 * Externe Links (YouTube, Vimeo, fremde Websites) werden bewusst NICHT
 * eingesammelt — sie sind Verweise, keine Materialien der App.
 */

/** Hostnames, die als App-eigenes Datei-Hosting gelten. */
function isAppHostedFileUrl(value) {
  if (typeof value !== 'string') return false;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    return h === 'base44.app' || h.endsWith('.base44.app') || h === 'base44.com' || h.endsWith('.base44.com');
  } catch {
    return false;
  }
}

/** Sicherer lokaler Dateiname aus einer URL (letztes Pfad-Segment). */
function safeBasename(url) {
  try {
    const path = new URL(url).pathname;
    const raw = decodeURIComponent(path.split('/').filter(Boolean).pop() || 'datei');
    const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
    return cleaned || 'datei';
  } catch {
    return 'datei';
  }
}

/**
 * Läuft rekursiv durch beliebige JSON-Strukturen und sammelt alle
 * app-gehosteten Datei-URLs ein (dedupliziert, stabile Reihenfolge).
 */
function walkForUrls(node, found) {
  if (typeof node === 'string') {
    if (isAppHostedFileUrl(node)) found.add(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkForUrls(item, found);
    return;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) walkForUrls(value, found);
  }
}

/**
 * Sammelt aus einer Liste von Payload-Objekten alle app-gehosteten
 * Datei-URLs und weist jedem eine eindeutige lokale ZIP-Position
 * (`media/<name>`) zu. Namenskollisionen werden mit Suffix aufgelöst.
 *
 * @param {Array<object>} payloads — die gebauten Payload-Objekte
 * @returns {Array<{ url: string, filename: string }>}
 */
export function collectMediaEntries(payloads = []) {
  const found = new Set();
  for (const p of payloads) walkForUrls(p, found);

  const usedNames = new Set();
  const entries = [];
  for (const url of found) {
    let name = safeBasename(url);
    if (usedNames.has(name)) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let i = 2;
      while (usedNames.has(`${stem}_${i}${ext}`)) i += 1;
      name = `${stem}_${i}${ext}`;
    }
    usedNames.add(name);
    entries.push({ url, filename: `media/${name}` });
  }
  return entries;
}

/**
 * Baut den Inhalt der media-manifest.json: pro Datei die Original-URL,
 * der lokale Pfad im ZIP und der Download-Status ('ok' | 'fehlgeschlagen').
 *
 * @param {Array<{ url: string, filename: string, ok: boolean }>} results
 */
export function buildMediaManifest(results = []) {
  return {
    beschreibung:
      'Datei-Beipack des Air-Gap-Exports: Alle app-gehosteten Materialien '
      + '(PDFs, Bilder, Audio, Video) liegen unter media/ im ZIP. Der Generator '
      + 'soll die lokalen Pfade verwenden, wo in den Payloads die hier '
      + 'gelisteten URLs stehen. Externe Links (z. B. YouTube) sind bewusst '
      + 'nicht enthalten.',
    dateien: results.map((r) => ({
      url: r.url,
      lokaler_pfad: r.filename,
      status: r.ok ? 'ok' : 'fehlgeschlagen',
    })),
    anzahl_gesamt: results.length,
    anzahl_fehlgeschlagen: results.filter((r) => !r.ok).length,
  };
}