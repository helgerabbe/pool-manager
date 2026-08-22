/**
 * dateiTyp.js
 *
 * Kleine Helfer, um bei hochgeladenen Dateien zwischen Bild und PDF zu
 * unterscheiden. Hintergrund (2026-08-22): Felder wie das Kompaktwissen-
 * Übersichtsbild akzeptieren beides — ein Bild wird als <img> gerendert,
 * eine PDF muss dagegen in einen Viewer (iframe) statt in ein Bild-Tag.
 *
 * Die Unterscheidung läuft über die Dateiendung der gespeicherten URL, da im
 * Datenmodell nur die URL liegt (kein MIME-Typ).
 */

/** true, wenn die URL auf eine PDF-Datei zeigt. */
export function istPdfUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  // Query-/Hash-Teil abschneiden, damit auch ".pdf?token=…" erkannt wird.
  const pfad = url.split(/[?#]/)[0];
  return pfad.toLowerCase().endsWith('.pdf');
}

/** Lesbarer Dateiname aus einer Upload-URL (ohne Hash-Präfix des Speichers). */
export function dateiNameAusUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  const pfad = url.split(/[?#]/)[0];
  const letzter = pfad.split('/').pop() || '';
  return decodeURIComponent(letzter).replace(/^[0-9a-f]{6,}_/i, '');
}