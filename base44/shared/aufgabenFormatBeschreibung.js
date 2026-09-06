/**
 * shared/aufgabenFormatBeschreibung.js
 *
 * Leitet aus dem Code einer interaktiven Aufgabe Name und Funktionsbeschreibung
 * ihres FORMATS ab.
 *
 * Liegt hier, weil zwei Wege dieselbe Beschreibung brauchen: das automatische
 * Erfassen beim Übernehmen einer neu gebauten Aufgabe (erfasseAufgabenFormat)
 * und der Vorschlags-Knopf in der Verwaltung
 * (aufgabenFormatBeschreibungVorschlag). Zwei Fassungen desselben Auftrags
 * würden auseinanderlaufen — und damit auch die Trefferqualität des Abgleichs,
 * der allein auf dieser Beschreibung arbeitet.
 */

const MAX_FRAGMENT_FUER_KI = 16000;

export async function beschreibeAufgabenFormat(base44, fragment) {
  const code = String(fragment || '').trim();
  if (!code) return null;

  const ergebnis = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Unten steht der Code einer interaktiven Übungsaufgabe für Schüler:innen. Beschreibe daraus das FORMAT — also die Mechanik, losgelöst von den konkreten Fachinhalten.

Antworte als JSON mit:
- "name": kurzer, sprechender Name der Mechanik, den Lehrkräfte verstehen (z. B. "Aussagen in Spalten zuordnen", "Textstellen markieren"). Kein Fachinhalt im Namen, keine Frage als Name.
- "beschreibung": 3 bis 6 Sätze, INHALTSNEUTRAL: Was sehen die Schüler:innen, was tun sie, welche Rückmeldung bekommen sie, wofür eignet sich das Format? Nenne keine Fachbegriffe aus dem Beispielinhalt und keine Technik. Dieser Text ist die Grundlage dafür, dass das Format später gefunden wird, wenn eine Lehrkraft ihr Vorhaben beschreibt — sei deshalb genau in der Mechanik.

AUFGABE:
${code.slice(0, MAX_FRAGMENT_FUER_KI)}`,
    response_json_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        beschreibung: { type: 'string' },
      },
      required: ['name', 'beschreibung'],
    },
  });

  return {
    name: String(ergebnis?.name || '').trim(),
    beschreibung: String(ergebnis?.beschreibung || '').trim(),
  };
}