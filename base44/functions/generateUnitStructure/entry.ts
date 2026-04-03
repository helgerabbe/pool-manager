import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYSTEM_PROMPT = `Du bist ein erfahrener Didaktiker für Gesamtschulen in Niedersachsen. Deine Aufgabe ist es, basierend auf dem Kerncurriculum eine strukturierte Unterrichtseinheit zu entwerfen.

Strukturvorgabe:
- Eine Einheit besteht aus Themenfeldern (thematische Container).
- Jedes Themenfeld enthält mehrere Lernpakete (zeitlich abgegrenzte Lernsequenzen von 45-90 Min).
- Jedes Lernpaket kann später Lernziele, Aktivitäten und Aufgaben enthalten.

Deine Antwort muss IMMER in zwei Teilen bestehen:
1. Eine kurze, motivierende pädagogische Erklärung für den Lehrer (2-3 Absätze). Diese erklärt die Struktur und warum sie sinnvoll ist.
2. Ein technisches JSON-Block am Ende (getrennt durch '---JSON---'), das die exakte Struktur für die App-Datenbank enthält.

Das JSON muss folgende Struktur haben:
\`\`\`json
{
  "themenfelder": [
    {
      "id": "tf1",
      "titel": "Themenfeld-Name",
      "beschreibung": "Kurze Beschreibung"
    }
  ],
  "lernpakete": [
    {
      "id": "lp1",
      "themenfeld_id": "tf1",
      "titel_des_pakets": "Lernpaket-Name",
      "geschaetzte_dauer_minuten": 60
    }
  ]
}
\`\`\`

Stelle sicher, dass:
- Jedes Lernpaket eindeutig einer themenfeld_id zugeordnet ist.
- Die Lernpakete realistisch zeitlich geschätzt sind.
- Die Struktur an Jahrgangsstufe und Lehrplan angepasst ist.
- Mindestens 2-3 Themenfelder und 6-10 Lernpakete enthalten sind.

WICHTIG: Das JSON muss VALID sein und muss IMMER zwischen '---JSON---' Markern stehen.`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      stammdaten,
      messages = [],
      documentUrls = [],
    } = await req.json();

    if (!stammdaten) {
      return Response.json({ error: 'Missing stammdaten' }, { status: 400 });
    }

    // Baue Kontext aus Stammdaten
    const contextInfo = `
Unterrichtseinheit:
- Titel: ${stammdaten.titel_der_einheit}
- Fach: ${stammdaten.fach}
- Jahrgangsstufe: ${stammdaten.jahrgangsstufe}
- Zeitraum: ${stammdaten.zeit_phase_id}
${documentUrls?.length > 0 ? `- Dokumente hochgeladen: ${documentUrls.length}` : ''}

Entwirf eine strukturierte Unterrichtseinheit basierend auf diesen Vorgaben.`;

    // Baue LLM-Request mit Chat-Verlauf
    const conversationMessages = [
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const fullPrompt = `${contextInfo}

Basierend auf dem bisherigen Gesprächsverlauf und den Stammdaten, generiere jetzt die strukturierte Einheit mit Themenfeldern und Lernpaketen.`;

    // Rufe LLM auf
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: 'claude_sonnet_4_6',
      // Für echte Dokument-Verarbeitung würde man file_urls übergeben
      // file_urls: documentUrls && documentUrls.length > 0 ? documentUrls : undefined,
    });

    const aiResponse = response || '';

    // Extrahiere JSON aus Antwort
    const jsonMatch = aiResponse.match(/---JSON---\s*([\s\S]*?)\s*(?:---JSON---|$)/);
    let structure = null;

    if (jsonMatch && jsonMatch[1]) {
      try {
        structure = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('JSON Parse Error:', e);
      }
    }

    return Response.json({
      success: true,
      aiResponse,
      structure,
    });
  } catch (error) {
    console.error('generateUnitStructure error:', error);
    return Response.json(
      { error: error.message || 'Structure generation failed' },
      { status: 500 }
    );
  }
});