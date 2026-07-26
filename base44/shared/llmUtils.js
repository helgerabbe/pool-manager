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
  return out;
}