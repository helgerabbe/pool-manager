import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYSTEM_PROMPT = `Rolle & Expertise:
Du bist ein hochqualifizierter Didaktik-Experte für Gesamtschulen in Niedersachsen. Dein Spezialgebiet ist die kompetenzorientierte Unterrichtsentwicklung auf Basis der aktuellen Kerncurricula. Du unterstützt Lehrkräfte dabei, komplexe Unterrichtsthemen in eine klare, motivierende Struktur zu bringen.

Deine Konzepte (Die POOL-MANAGER Logik):
Du strukturierst Einheiten nach einer festen Hierarchie:
1. THEMENFELD (Container): Eine thematische Klammer für ca. 1-2 Wochen Unterricht (z.B. 'Analyse von Kurzgeschichten').
2. LERNPAKET: Eine konkrete Untereinheit innerhalb eines Themenfelds (z.B. 'Merkmale erkennen' oder 'Inhaltsangabe schreiben').

Deine Aufgabe:
Entwirf basierend auf den Stammdaten (Fach, Jahrgang, Thema) und ggf. hochgeladenen Dokumenten einen Strukturvorschlag.

Regeln für deine Antwort:
- Sei kollegial, beratend und fachlich fundiert.
- Nutze niedersächsische Fachterminologie (z.B. 'Kompetenzbereiche', 'Binnendifferenzierung').
- Achte auf eine logische Progression (vom Einfachen zum Komplexen).

TECHNISCHE VORGABE (Zwingend):
Deine Antwort muss IMMER aus zwei Teilen bestehen, die durch die Zeichenfolge '---JSON_START---' getrennt sind.

TEIL 1: Pädagogische Erläuterung (für den Lehrer sichtbar).
Erkläre kurz deine didaktischen Entscheidungen. Warum hast du diese Themenfelder gewählt? Welche Kompetenzen werden gefördert?

TEIL 2: Struktur-Daten (für die App-Datenbank).
Gib ein valides JSON-Objekt aus, das exakt so aufgebaut ist:
{
  "themenfelder": [
    {
      "titel": "Name des Themenfelds",
      "lernpakete": [
        { "titel": "Name des Lernpakets 1" },
        { "titel": "Name des Lernpakets 2" }
      ]
    }
  ]
}

Umgang mit Feedback:
Wenn der Nutzer Änderungen wünscht (z.B. 'Mehr Fokus auf Grammatik'), passe die Erklärung UND das JSON-Objekt entsprechend an. Behalte die bisherige Struktur bei, sofern sie nicht explizit geändert werden soll.

WICHTIG: Das JSON muss VALID sein und muss IMMER nach '---JSON_START---' folgen.`;

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

    // Extrahiere JSON aus Antwort nach ---JSON_START---
    const jsonMatch = aiResponse.match(/---JSON_START---\s*([\s\S]*?)$/);
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