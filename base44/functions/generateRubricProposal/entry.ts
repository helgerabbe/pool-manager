import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { output_formats = [], custom_format = '', quality_focus = '' } = await req.json();

    // Formate zusammenbauen
    const alleFormate = [...output_formats];
    if (custom_format?.trim()) alleFormate.push(custom_format.trim());

    if (alleFormate.length === 0) {
      return Response.json({ error: 'Mindestens ein Abgabeformat muss angegeben werden.' }, { status: 400 });
    }

    const formateText = alleFormate.join(', ');
    const fokusText = quality_focus?.trim()
      ? `Die Lehrkraft legt besonderen Wert auf: ${quality_focus.trim()}.`
      : '';

    const prompt = `Du bist ein didaktischer Assistent für deutsche Schulen. Erstelle formelle Bewertungskriterien (Gütekriterien) für eine schulische Projektaufgabe.

Die Schülerinnen und Schüler sollen folgende Abgabeformate erstellen: ${formateText}.
${fokusText}

Formuliere drei kurze, präzise Textblöcke (je 2–4 Sätze) für die drei Niveaustufen:
- "Ausreichend": Minimale Anforderungen gerade erfüllt.
- "Gut": Solide Leistung mit erkennbarer Auseinandersetzung.
- "Sehr gut": Herausragende, eigenständige und durchdachte Leistung.

Die Kriterien sollen sich direkt auf die geforderten Formate und den genannten Fokus beziehen. Formuliere auf Deutsch, klar und beurteilbar.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in folgendem Format, ohne zusätzlichen Text oder Markdown:
{
  "sufficient": "Text für ausreichende Leistung...",
  "good": "Text für gute Leistung...",
  "excellent": "Text für sehr gute Leistung..."
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          sufficient: { type: 'string' },
          good: { type: 'string' },
          excellent: { type: 'string' },
        },
        required: ['sufficient', 'good', 'excellent'],
      },
    });

    // result ist bereits ein geparster dict dank response_json_schema
    if (!result?.sufficient || !result?.good || !result?.excellent) {
      return Response.json({ error: 'KI hat kein gültiges Kriterien-Objekt zurückgegeben.' }, { status: 502 });
    }

    return Response.json({
      sufficient: result.sufficient,
      good: result.good,
      excellent: result.excellent,
    });

  } catch (error) {
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});