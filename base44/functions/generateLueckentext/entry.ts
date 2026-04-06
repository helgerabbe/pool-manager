import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * generateLueckentext.js
 *
 * Generiert KI-basierte Lückentexte mit didaktischem Kontext
 *
 * Optimierungen:
 * - Umfassendes Error-Handling mit strukturiertem Fehler-Response
 * - Didaktischer Kontext (Fach, Jahrgangsstufe) im Prompt
 * - Explizites Modell für bessere Qualität
 * - Markdown-Bereinigung vor Response
 */

/**
 * Entfernt umschließende Markdown-Codeblöcke und Backticks
 */
function cleanMarkdownCodeBlocks(text) {
  return text
    .replace(/^```[a-z]*\n/m, '') // Opening backticks mit optionalem Language-Tag
    .replace(/\n```$/m, '') // Closing backticks
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ─────────────────────────────────────────────────────────────────
    // 1. Authentifizierung
    // ─────────────────────────────────────────────────────────────────
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Payload mit didaktischem Kontext erweitern
    // ─────────────────────────────────────────────────────────────────
    const { sourceMaterial, targetWords, fach = 'unbekannt', jahrgangsstufe = 'unbekannt' } = await req.json();

    // ─────────────────────────────────────────────────────────────────
    // 3. Input-Validierung
    // ─────────────────────────────────────────────────────────────────
    if (!sourceMaterial?.trim()) {
      return Response.json({ error: 'sourceMaterial ist erforderlich.' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. Zielwörter verarbeiten
    // ─────────────────────────────────────────────────────────────────
    const targetWordsClean = (targetWords || '')
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    const targetWordsList = targetWordsClean.length > 0
      ? `\nDiese Wörter MÜSSEN zwingend als Lücken markiert werden (in eckige Klammern setzen): ${targetWordsClean.join(', ')}`
      : '';

    // ─────────────────────────────────────────────────────────────────
    // 5. Prompt mit didaktischem Kontext konstruieren
    // ─────────────────────────────────────────────────────────────────
    const prompt = `Du bist ein erfahrener Pädagoge. Erstelle einen didaktisch hochwertigen Lückentext auf Basis des folgenden Quellmaterials.

KONTEXT:
- Fach: ${fach}
- Jahrgangsstufe: ${jahrgangsstufe}

REGELN:
1. Passe die Satzstruktur und das Vokabular (abseits der Fachbegriffe) an Schüler der Jahrgangsstufe ${jahrgangsstufe} an.
2. Identifiziere die wichtigsten Fachbegriffe und Schlüsselwörter im Text.
3. Ersetze diese Schlüsselwörter durch eckige Klammern: Schreibe das Wort IN die eckigen Klammern, z.B. [Photosynthese].
4. Der Text soll ohne die eingeklammerten Wörter noch sinnvoll lesbar sein.
5. Setze 5-10 Lücken, je nach Länge des Textes.${targetWordsList}

QUELLMATERIAL:
${sourceMaterial}

Antworte NUR mit dem fertigen Lückentext. Keine Erklärungen, keine Überschriften, nur den Text mit den eckigen Klammern.`;

    // ─────────────────────────────────────────────────────────────────
    // 6. LLM-Aufruf mit explizitem Modell
    // ─────────────────────────────────────────────────────────────────
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    // ─────────────────────────────────────────────────────────────────
    // 7. Markdown-Bereinigung
    // ─────────────────────────────────────────────────────────────────
    const cleanText = cleanMarkdownCodeBlocks(result);

    return Response.json({ text: cleanText });
  } catch (error) {
    console.error('[generateLueckentext] Error:', error);
    return Response.json(
      {
        error: error.message || 'Interner Serverfehler bei der KI-Generierung',
      },
      { status: 500 }
    );
  }
});