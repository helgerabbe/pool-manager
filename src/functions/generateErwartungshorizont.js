/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabenstellung, einheitId } = await req.json();

    if (!aufgabenstellung || !aufgabenstellung.trim()) {
      return Response.json({ error: 'Aufgabenstellung ist erforderlich' }, { status: 400 });
    }

    // Lade alle Lernziele der Einheit für den Kontext
    const themenfelder = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
    const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
    
    const lernziele = [];
    for (const lp of lernpakete) {
      const lz = await base44.entities.Lernziele.filter({ lernpaket_id: lp.id });
      lernziele.push(...lz);
    }

    // Generiere Lernlandkarte-Zusammenfassung
    const lernzieleText = lernziele
      .slice(0, 20)
      .map(lz => `- ${lz.formulierung_fachsprache || lz.schueler_uebersetzung}`)
      .join('\n');

    const prompt = `Du bist ein erfahrener Pädagoge und erstellst strukturierte Erwartungshorizonte für Projekt- und Anwendungsaufgaben.

PROJEKTAUFGABE:
${aufgabenstellung}

LERNZIELE DER EINHEIT (Kontext):
${lernzieleText || '(Keine Lernziele vorhanden)'}

AUFGABE:
Erstelle einen strukturierten Erwartungshorizont für diese Projektaufgabe. Der Horizont dient als inhaltliche Leitplanke für einen KI-Tutor, der Schüler bei ihren Fragen methodisch zum erfolgreichen Abschluss führt.

STRUKTUR:
1. Erfolgskriterien: Was muss das Projektergebnis enthalten? (Umfang, Quantität)
2. Inhaltliche Standards: Welche fachlichen Anforderungen gelten? (Korrektheit, Tiefe, Verknüpfungen)
3. Methodische Aspekte: Welche Arbeitsschritte sind notwendig? (Analyse, Synthese, Reflexion)
4. Qualitätsindikatoren: Woran erkennt man ein gutes Ergebnis? (Konkrete Beispiele)

Antworte OHNE weitere Erklärung, nur mit dem strukturierten Text.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    const text = typeof response.data === 'string' ? response.data : response.data?.text || '';

    return Response.json({
      success: true,
      text: text.trim(),
    });
  } catch (error) {
    console.error('Error in generateErwartungshorizont:', error);
    return Response.json(
      { error: error.message || 'Fehler bei der Generierung' },
      { status: 500 }
    );
  }
});