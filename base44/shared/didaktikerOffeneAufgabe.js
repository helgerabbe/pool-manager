/**
 * shared/didaktikerOffeneAufgabe.js
 *
 * DER REGELFALL für Übungen: eine eigens gebaute, interaktive OFFENE AUFGABE.
 *
 * WARUM NICHT LÜCKENTEXT UND MINIQUIZ (Entscheidung 2026-09-13):
 * Ein Lückentext oder ein Miniquiz fragt den Inhalt auf einer META-EBENE ab —
 * die Schülerin liest über die Sache, statt sie zu tun. Wer Dezimalzahlen
 * addieren lernen soll, muss Zahlen stellenrichtig untereinander schieben, das
 * Komma unter das Komma setzen, zusammenrechnen und das Komma im Ergebnis
 * platzieren. Genau DIESE gedankliche Operation muss die Aufgabe abbilden;
 * sonst hat die Schülerin beschäftigt gearbeitet, aber nichts verstanden.
 *
 * Standardformate sind deshalb die AUSNAHME und nur dann zulässig, wenn das
 * Format die Operation selbst ist (Sortieren, wenn die Reihenfolge die
 * Denkleistung IST). Sonst wird gebaut — auch wenn das mehr kostet. Das Ziel
 * ist, dass die Schülerin lernt, nicht, dass wenig Rechenzeit anfällt.
 *
 * Reine Daten, ein LLM-Aufruf, keine Schreibvorgänge.
 */

/** Die didaktische Messlatte — geht in Planung UND Bau. */
export const OPERATIONS_REGELN = [
  'Eine Übung ist nur dann gut, wenn die Schülerin in ihr die GEDANKLICHE OPERATION selbst ausführt, die das Lernziel verlangt — nicht, wenn sie über die Operation Auskunft gibt.',
  'Verboten ist deshalb der reflexhafte Griff zu Lückentext, Quiz oder Wissensfrage: Das prüft Wiedergabe, nicht Verstehen.',
  'Nutze aus, dass die Schülerin am Bildschirm arbeitet: Dinge verschieben, einsetzen, ausrichten, an die richtige Stelle ziehen, eintragen, einen Schalter umlegen und beobachten, was sich ändert, einen Fehler finden und berichtigen, einen Zwischenschritt selbst setzen.',
  'Denke wie Brilliant.org: sichtbar machen, ausprobieren lassen, sofort und inhaltlich zurückmelden — bei einem Fehler nicht „leider falsch", sondern der Hinweis, WORAN es lag.',
  'Die Aufgabe darf ruhig aufwendig sein. Kürze nicht die Didaktik, um Aufwand zu sparen.',
];

/**
 * Bauordnung für das HTML-Fragment. Inhaltlich gleich wie im
 * Aufgabengenerator (base44/functions/aufgabeGeneratorChat) — dieselbe
 * Zielfläche, dieselbe Hülle, damit die Aufgaben aus beiden Wegen im Kurs
 * gleich funktionieren.
 */
export const BAU_SYSTEM_PROMPT = `Du bist der Aufgaben-Baumeister einer schulischen Lernplattform und baust EINE interaktive Übungsaufgabe für Schüler:innen.

# WAS DU BAUST
Ein HTML-FRAGMENT — kein vollständiges Dokument.
- KEIN <!DOCTYPE>, KEIN <html>, KEIN <head>, KEIN <body>.
- Genau ein umschließendes <div class="aufgabe"> … </div>.
- CSS in genau einem <style>-Block INNERHALB dieses divs; alle Selektoren beginnen mit .aufgabe.
- JavaScript in genau einem <script>-Block am Ende des divs; kein Zugriff außerhalb von .aufgabe.
- KEINE externen Dateien, keine CDNs, keine Bilder von außen, keine Netzwerkaufrufe. Grafik mit CSS oder inline-SVG.
- KEINE Navigation, kein "Zurück"- oder "Erledigt"-Knopf — das liefert die Plattform.

# ZIELFLÄCHE
Tablet im Querformat, etwa 960px breit und 560px hoch. Nutze die Breite (mehrere Spalten nebeneinander sind erwünscht) und bring das Wesentliche ohne Scrollen unter. Klickflächen mindestens 44px, bedienbar mit Maus UND Finger, Drag-and-drop immer mit Klick-Alternative.

# DIDAKTIK — DARAUF KOMMT ES AN
${OPERATIONS_REGELN.map((r) => `- ${r}`).join('\n')}
- Die Aufgabe gibt unmittelbare, inhaltliche Rückmeldung und hat einen erkennbaren Abschluss (z. B. eine kurze Bilanz nach n Durchgängen).
- FERTIG-SIGNAL (Pflicht): Genau an der Stelle, an der die Aufgabe ihren Abschluss anzeigt (alles richtig zugeordnet, „Prüfen" gedrückt, Bilanz erscheint), rufe zusätzlich \`parent.postMessage({ mbkFertig: true }, "*");\` auf. Mehrfaches Senden ist unschädlich; die Plattform wertet nur „fertig oder nicht" und braucht keine Antwort. NICHT senden bei „Nochmal von vorne", „Neu mischen" oder „Zurücksetzen".
- Wo es passt: zufällig erzeugte Aufgaben, damit wiederholt geübt werden kann.

# SPRACHE
Deutsch, Du-Form, altersgerecht. Einzelarbeit am Bildschirm, kein Material aus dem Klassenraum.

# UMFANG
Kompakt bauen: keine Kommentare im Code, kein Reset-CSS, keine Hilfsfunktionen für Einmaliges. Ein gutes Fragment ist typischerweise 6.000–14.000 Zeichen lang.

# ANTWORTFORMAT
Gib AUSSCHLIESSLICH das Fragment aus, beginnend mit <div class="aufgabe"> und endend mit </div>. Kein Vorwort, keine Erklärung, keine Markdown-Codefences.`;

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
  html, body { margin: 0; padding: 0; background: var(--color-hintergrund); color: var(--color-text); font-family: var(--schrift); }
  body { padding: var(--abstand); }
  * { box-sizing: border-box; }
`;

/** Verpackt das Fragment in ein vollständiges Dokument (wie src/lib/aufgabeFragment.js). */
export function fragmentZuDokument(fragment = '') {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${VORSCHAU_VARIABLEN}</style>
</head>
<body>
${String(fragment || '').trim()}
</body>
</html>`;
}

/** Holt das Fragment aus der Modellantwort heraus (Codefences, Vorwort, ganzes Dokument). */
export function saeubereFragment(text = '') {
  let s = String(text || '').trim();
  s = s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
  const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) s = body[1].trim();
  const start = s.search(/<div[^>]*class\s*=\s*["'][^"']*\baufgabe\b/i);
  if (start > 0) s = s.slice(start);
  const ende = s.lastIndexOf('</div>');
  if (ende !== -1) s = s.slice(0, ende + 6);
  return s.trim();
}

/** Grobe Prüfung: taugt das Fragment als Aufgabe? */
export function istBrauchbaresFragment(fragment = '') {
  const s = String(fragment || '');
  if (s.length < 800) return false;
  if (!/class\s*=\s*["'][^"']*\baufgabe\b/i.test(s)) return false;
  if (/<!DOCTYPE|<html[\s>]/i.test(s)) return false;
  return true;
}

/**
 * Baut EINE offene Aufgabe: Fragment + schülersichtbarer Arbeitsauftrag.
 *
 * @returns {Promise<{ fragment: string, aufgabentext: string }|null>}
 */
export async function baueOffeneAufgabe(base44, { kontext, operation, idee }) {
  const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${BAU_SYSTEM_PROMPT}

# RAHMEN DIESER AUFGABE (nicht wörtlich anzeigen)
${JSON.stringify(kontext, null, 2)}

# DIE GEDANKLICHE OPERATION, DIE DIE SCHÜLERIN AUSFÜHREN MUSS
${String(operation || '').trim() || 'Siehe Lernziele des Lernpakets.'}

# SO IST DIE AUFGABE GEDACHT
${String(idee || '').trim() || 'Entwirf die Aufgabe selbst so, dass die Operation oben tatsächlich ausgeführt wird.'}

Baue jetzt das Fragment.`,
    model: 'claude-sonnet-5',
  });

  const rohText = typeof antwort === 'string' ? antwort : String(antwort?.output || antwort?.text || '');
  const fragment = saeubereFragment(rohText);
  if (!istBrauchbaresFragment(fragment)) return null;

  return {
    fragment,
    aufgabentext: String(idee || '').trim(),
  };
}