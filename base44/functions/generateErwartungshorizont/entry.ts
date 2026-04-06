/**
 * generateErwartungshorizont.js
 *
 * Generiert einen strukturierten Erwartungshorizont für Ebene-3-Aufgaben
 * basierend auf Aufgabenstellung, Lernzielen und Lernpaketen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabenstellung, lernziele = [], lernpakete = [] } = await req.json();

    if (!aufgabenstellung?.trim()) {
      return Response.json(
        { error: 'Aufgabenstellung ist erforderlich' },
        { status: 400 }
      );
    }

    // Formatiere Lernziele für Kontex
    const lernzielContext = lernziele
      .map(lz => `- ${lz.formulierung_fachsprache || lz.title || lz}`)
      .join('\n');

    const lernpaketContext = lernpakete
      .map(lp => `- ${lp.titel_des_pakets}`)
      .join('\n');

    const prompt = `Du bist ein erfahrener Didaktiker und Tutor. Erstelle einen strukturierten Erwartungshorizont für eine Projektaufgabe.

**Aufgabenstellung:**
${aufgabenstellung}

**Verknüpfte Lernziele der Einheit:**
${lernzielContext || '(Keine Lernziele verknüpft)'}

**Lernpakete der Einheit:**
${lernpaketContext || '(Keine Lernpakete verknüpft)'}

**Deine Aufgabe:**
Erstelle einen detaillierten, strukturierten Erwartungshorizont, der folgende Punkte abdeckt:

1. **Inhaltliche Kriterien:** Welche fachlichen Anforderungen muss die Lösung erfüllen?
2. **Umfang & Struktur:** Wie umfangreich und strukturiert soll das Ergebnis sein?
3. **Methoden & Prozess:** Welche Arbeitsschritte oder Methoden sind angemessen?
4. **Qualitätsmerkmale:** Woran erkennt man eine gute/exzellente Lösung?
5. **Lernziel-Bezug:** Wie trägt die Bearbeitung zu den genannten Lernzielen bei?

Formatiere die Antwort strukturiert und präzise, damit sie als Richtlinie für die KI-Lernbegleitung dient.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic'
    });

    const generatedText = response.data;

    return Response.json({
      success: true,
      erwartungshorizont: generatedText
    });
  } catch (error) {
    console.error('[generateErwartungshorizont] Error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
});