/**
 * aufgabeFragment.js
 *
 * Ein Aufgaben-Fragment ist der Inhalt EINER interaktiven Aufgabe:
 * ein <div class="aufgabe"> mit eigenem <style> und <script>, ohne
 * <html>/<head>/<body>. So — und nur so — wird es später an die MBK
 * übergeben, die es in ihre eigene Hülle einsetzt.
 *
 * Für die Vorschau im Pool-Manager und für die Schüleransicht brauchen wir
 * dagegen ein vollständiges Dokument. Diese Datei ist die einzige Stelle,
 * die aus einem Fragment ein solches Dokument macht.
 *
 * Die Design-Variablen unten sind bewusst nur ein FALLBACK: Sobald die MBK
 * die Aufgabe in den Kurs einsetzt, gelten deren Variablen. Die Aufgabe
 * selbst schreibt keine Farben fest.
 */

const VORSCHAU_VARIABLEN = `
  :root {
    --color-primary: #2563eb;
    --color-primary-hell: #dbeafe;
    --color-text: #0f172a;
    --color-text-schwach: #64748b;
    --color-hintergrund: #ffffff;
    --color-flaeche: #f8fafc;
    --color-rand: #e2e8f0;
    --color-richtig: #059669;
    --color-falsch: #dc2626;
    --radius: 12px;
    --abstand: 16px;
    --schrift: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--color-hintergrund);
    color: var(--color-text);
    font-family: var(--schrift);
    -webkit-text-size-adjust: 100%;
  }
  body { padding: var(--abstand); }
  * { box-sizing: border-box; }
`;

/**
 * Verpackt ein Fragment in ein vollständiges HTML-Dokument für das iframe.
 * @param {string} fragment
 * @returns {string} vollständiges Dokument
 */
export function fragmentZuDokument(fragment = '') {
  const inhalt = String(fragment || '').trim();
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${VORSCHAU_VARIABLEN}</style>
</head>
<body>
${inhalt}
</body>
</html>`;
}

/**
 * Grobe Plausibilitätsprüfung eines Fragments. Kein Sicherheitsmechanismus —
 * eine Hilfe für die Lehrkraft, damit offensichtlich Kaputtes auffällt,
 * bevor die Aufgabe übernommen wird.
 * @returns {string[]} Liste von Hinweisen (leer = unauffällig)
 */
export function pruefeFragment(fragment = '') {
  const s = String(fragment || '');
  const hinweise = [];
  if (!s.trim()) return ['Es ist noch keine Aufgabe erzeugt worden.'];
  if (/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]/i.test(s)) {
    hinweise.push('Die Aufgabe enthält ein komplettes Dokumentgerüst — beim Einbau in den Kurs kann das zu Problemen führen.');
  }
  if (!/class\s*=\s*["'][^"']*\baufgabe\b/i.test(s)) {
    hinweise.push('Die äußere Hülle <div class="aufgabe"> fehlt.');
  }
  if (/<(img|script|link)[^>]+(src|href)\s*=\s*["']https?:/i.test(s)) {
    hinweise.push('Die Aufgabe lädt etwas aus dem Internet nach. Das funktioniert im Kurs möglicherweise nicht.');
  }
  return hinweise;
}

/**
 * Falls doch einmal ein vollständiges Dokument ankommt (z. B. aus einem alten
 * Snapshot): den Körper herauslösen, damit daraus ein Fragment wird.
 */
export function dokumentZuFragment(html = '') {
  const s = String(html || '');
  const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const kopfStyles = [...s.matchAll(/<style[\s\S]*?<\/style>/gi)].join('\n');
  if (!body) return s.trim();
  const inhalt = body[1].trim();
  if (/class\s*=\s*["'][^"']*\baufgabe\b/i.test(inhalt)) return inhalt;
  return `<div class="aufgabe">\n${kopfStyles}\n${inhalt}\n</div>`;
}
