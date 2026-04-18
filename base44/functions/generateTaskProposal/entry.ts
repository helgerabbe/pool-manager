import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { idee, task_type } = await req.json();

    if (!idee?.trim()) {
      return Response.json({ error: 'Idee ist erforderlich.' }, { status: 400 });
    }

    const prompt = `Du bist ein erfahrener Didaktiker und hilfst Lehrkräften, Aufgaben für den Unterricht zu entwickeln.

Aufgabentyp: ${task_type || 'Allgemeine Aufgabe'}

Die Lehrkraft hat folgende grobe Idee eingegeben:
"${idee}"

Erstelle daraus einen vollständigen Aufgabenentwurf mit:
1. Einem prägnanten Titel (max. 80 Zeichen)
2. Einer klar formulierten, vollständigen Aufgabenstellung (2-5 Sätze, direkt an Schüler gerichtet)
3. 3-5 Kompetenz-Schlagworten (z.B. "Analyse", "Vergleich", "Argumentation", "Kreativität")

Antworte ausschließlich im folgenden JSON-Format, ohne Markdown oder weitere Erklärungen:
{
  "titel": "...",
  "aufgabenstellung": "...",
  "kompetenzen": ["...", "...", "..."]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          aufgabenstellung: { type: 'string' },
          kompetenzen: { type: 'array', items: { type: 'string' } },
        },
        required: ['titel', 'aufgabenstellung', 'kompetenzen'],
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});