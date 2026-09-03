/**
 * shared/llmUtils.js
 *
 * Gemeinsame Helfer für InvokeLLM-Aufrufe in Backend-Funktionen.
 */

/**
 * InvokeLLM liefert das Schema-Objekt je nach Modell teils direkt, teils
 * in einem { response: ... }-Umschlag — und darin teils als JSON-String.
 * Alle drei Formen unterstützen.
 */
/**
 * Entfernt Rahmensätze der Modellantwort aus einem Text, der später als
 * Schülertext im Kurs landet (MBK-Meldung 2026-09-01, Fall 3): Sprachmodelle
 * leiten ihre Ausgabe gern ein („Hier ist die präzise Aufgabenbeschreibung:")
 * und setzen Trennlinien darunter. Bis dahin wanderte das unverändert ins
 * Payload-Feld und stand vor der Klasse.
 *
 * Bewusst konservativ: Es wird NUR am Anfang und Ende geschnitten, und nur
 * eine Einleitungszeile, die auf einen Doppelpunkt endet und selbst keinen
 * Inhalt trägt. Mitten im Text wird nichts angetastet.
 */
export function entferneRahmensaetze(text) {
  if (typeof text !== 'string') return text;
  let t = text.trim();
  // Code-Fences (```), die manche Modelle um Prosa legen.
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  // Einleitungszeile: "Hier ist/kommt … :" / "Gerne … :" / "Natürlich … :"
  t = t.replace(/^(?:hier\s+(?:ist|kommt|sind)|gerne|nat[üu]rlich|selbstverst[äa]ndlich)\b[^\n:]{0,160}:\s*\n+/i, '');
  // Trennlinien am Anfang und Ende (***, ---, ___).
  t = t.replace(/^(?:\*{3,}|-{3,}|_{3,})\s*\n+/, '').replace(/\n+\s*(?:\*{3,}|-{3,}|_{3,})\s*$/, '');
  return t.trim();
}

/** Wendet entferneRahmensaetze rekursiv auf alle Strings einer Struktur an. */
function bereinigeTief(wert) {
  if (typeof wert === 'string') return entferneRahmensaetze(wert);
  if (Array.isArray(wert)) return wert.map(bereinigeTief);
  if (wert && typeof wert === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(wert)) out[k] = bereinigeTief(v);
    return out;
  }
  return wert;
}

export function unwrapLLM(res) {
  let out = res;
  if (out && typeof out === 'object' && 'response' in out) {
    out = out.response;
  }
  if (typeof out === 'string') {
    const cleaned = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      out = JSON.parse(cleaned);
    } catch {
      // Fallback: rohe Steuerzeichen (z. B. echte Zeilenumbrüche innerhalb
      // von String-Werten) durch escaped \n ersetzen und erneut parsen.
      try {
        out = JSON.parse(cleaned.replace(/[\u0000-\u001f]+/g, '\\n'));
      } catch {
        return null;
      }
    }
  }
  // Alle Textfelder von Modell-Rahmensätzen befreien, bevor sie irgendwo
  // gespeichert werden — ein Ort für alle Generatoren.
  return bereinigeTief(out);
}