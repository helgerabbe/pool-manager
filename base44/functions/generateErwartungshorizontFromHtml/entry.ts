import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const htmlCode = body.htmlCode;

    if (!htmlCode || typeof htmlCode !== 'string' || !htmlCode.trim()) {
      return Response.json({ error: 'htmlCode is required' }, { status: 400 });
    }

    // Begrenze HTML-Code auf max. 50000 Zeichen fuer die KI-Analyse
    const truncatedHtml = htmlCode.length > 50000 ? htmlCode.slice(0, 50000) : htmlCode;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere den folgenden HTML-Code einer interaktiven Lern-Aufgabe. Extrahiere daraus:

1. Eine kurze, praegnante Aufgabenstellung (was sollen die Schueler tun?)
2. Einen Erwartungshorizont bzw. Gelingensbedingungen (woran erkennt man, dass die Aufgabe erfolgreich bearbeitet wurde?)
3. Einen passenden Titel fuer die Aufgabe (falls aus dem HTML erkennbar)

Der HTML-Code stammt von Tools wie GeoGebra, LearningApps oder aehnlichen interaktiven Lernumgebungen. Analysiere den sichtbaren Text, Buttons, Labels und die Struktur, um den didaktischen Zweck zu verstehen.

HTML-Code:
${truncatedHtml}

Antworte NUR mit einem JSON-Objekt (keine Erklaerung, kein Markdown) mit den Feldern: aufgabenstellung, erwartungshorizont, titel.`,
      response_json_schema: {
        type: 'object',
        properties: {
          aufgabenstellung: { type: 'string', description: 'Eine praegnante Aufgabenstellung, was die Schueler auf der Seite tun sollen' },
          erwartungshorizont: { type: 'string', description: 'Gelingensbedingungen: woran erkennt man, dass die Aufgabe erfolgreich bearbeitet wurde? Welche Konzepte muessen verstanden sein?' },
          titel: { type: 'string', description: 'Ein passender Titel fuer die Aufgabe, aus dem HTML extrahiert oder abgeleitet' }
        },
        required: ['aufgabenstellung', 'erwartungshorizont', 'titel']
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});