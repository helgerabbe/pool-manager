import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { output_formats = [], custom_format = '', quality_focus = '', aufgabenstellung = '' } = await req.json();

    const alleFormate = [...output_formats];
    if (custom_format?.trim()) alleFormate.push(custom_format.trim());

    const formateText = alleFormate.length > 0 ? alleFormate.join(', ') : 'nicht spezifiziert';
    const fokusText = quality_focus?.trim()
      ? `Die Lehrkraft legt besonderen Wert auf: ${quality_focus.trim()}.`
      : '';
    const aufgabeText = aufgabenstellung?.trim()
      ? `Die Aufgabenstellung lautet: "${aufgabenstellung.trim()}"`
      : '';

    const prompt = `Du bist ein didaktischer Assistent für deutsche Schulen. Erstelle 2 bis 3 thematische Bewertungsrubriken (Kategorien) für eine schulische Projektaufgabe.

${aufgabeText}
Abgabeformate: ${formateText}.
${fokusText}

Erstelle 2-3 sinnvolle Bewertungskategorien (z.B. "Inhaltliche Tiefe", "Darstellung & Struktur", "Quellenarbeit").
Für jede Kategorie:
- Ein prägnanter Titel (max. 5 Wörter)
- Eine Punktzahl (typisch: 10 oder 15 Punkte je nach Gewichtung, Gesamtsumme ca. 25-30 Punkte)
- Einen Kriterienstext: Ausformulierte Beschreibung was für die volle Punktzahl erwartet wird (3-5 Sätze)

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in folgendem Format:
{
  "rubrics": [
    {
      "title": "Inhaltliche Tiefe",
      "points": 15,
      "criteria_text": "..."
    },
    {
      "title": "Darstellung & Struktur",
      "points": 10,
      "criteria_text": "..."
    }
  ]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          rubrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                points: { type: 'number' },
                criteria_text: { type: 'string' },
              },
              required: ['title', 'points', 'criteria_text'],
            },
          },
        },
        required: ['rubrics'],
      },
    });

    if (!result?.rubrics || result.rubrics.length === 0) {
      return Response.json({ error: 'KI hat kein gültiges Rubriken-Array zurückgegeben.' }, { status: 502 });
    }

    return Response.json({ rubrics: result.rubrics });

  } catch (error) {
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});