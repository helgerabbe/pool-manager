/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * generateLueckentext.js
 *
 * Sichere KI-gestützte Lückentext-Generierung mit:
 * - Try-Catch und strukturiertem Error-Handling
 * - Didaktischem Kontext (Fach, Jahrgangsstufe)
 * - Leistungsstarkem Modell (claude_sonnet_4_6)
 * - Markdown-Bereinigung
 */

Deno.serve(async (req) => {
  try {
    // ── AUTHENTIFIZIERUNG ────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── PAYLOAD DESTRUCTURING MIT DIDAKTISCHEM KONTEXT ──────────────────────────
    const {
      sourceMaterial = '',
      targetWords = [],
      fach = 'unbekannt',
      jahrgangsstufe = 'unbekannt',
    } = await req.json();

    // ── VALIDIERUNG ──────────────────────────────────────────────────────────────
    if (!sourceMaterial || sourceMaterial.trim().length === 0) {
      return Response.json(
        { error: 'sourceMaterial ist erforderlich' },
        { status: 400 }
      );
    }

    if (!Array.isArray(targetWords) || targetWords.length === 0) {
      return Response.json(
        { error: 'targetWords muss ein nicht-leeres Array sein' },
        { status: 400 }
      );
    }

    // ── DIDAKTISCHER PROMPT MIT KONTEXT ──────────────────────────────────────────
    const prompt = `Du bist ein erfahrener Pädagoge für das Fach ${fach}.

AUFGABE: Erstelle einen didaktisch hochwertigen Lückentext auf Basis des folgenden Quellmaterials.

JAHRGANGSSTUFE: ${jahrgangsstufe}
FACH: ${fach}

ZIELWÖRTER (ZWINGEND in Klammern [...]):
${targetWords.map((w) => `- [${w}]`).join('\n')}

QUELLMATERIAL:
${sourceMaterial}

ANFORDERUNGEN:
1. Integriere ALLE Zielwörter exakt in eckigen Klammern [...] in den neuen Text
2. Passe Satzstruktur, Vokabular und Komplexität an Schüler der Jahrgangsstufe ${jahrgangsstufe} an
3. Bewahre die fachlichen Inhalte und Lernziele des Quellmaterials
4. Der Text soll 150-300 Wörter umfassen
5. Stelle sicher, dass alle [...] korrekt gesetzt sind und der Text kohärent bleibt

RÜCKGABE: Nur der fertige Lückentext, ohne weitere Erklärungen oder Formatierung.`;

    // ── KI-GENERIERUNG MIT LEISTUNGSSTARKEM MODELL ────────────────────────────────
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    // ── MARKDOWN-BEREINIGUNG ─────────────────────────────────────────────────────
    // Entferne umschließende Markdown-Codeblöcke (```text, ```json, etc.)
    let cleanText = response;

    // Regex für öffnende Backticks: ```[language]\n
    cleanText = cleanText.replace(/^```[a-z]*\n/m, '');

    // Regex für schließende Backticks: \n```
    cleanText = cleanText.replace(/\n```$/m, '');

    // Trim für extra Whitespace
    cleanText = cleanText.trim();

    // ── RESPONSE ─────────────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      text: cleanText,
      metadata: {
        fach,
        jahrgangsstufe,
        targetWordsCount: targetWords.length,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in generateLueckentext:', error);
    return Response.json(
      {
        error: `KI-Generierung fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`,
      },
      { status: 500 }
    );
  }
});