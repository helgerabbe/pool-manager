import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYSTEM_PROMPT = `Rolle & Expertise:
Du bist ein hochqualifizierter Didaktik-Experte für Gesamtschulen in Niedersachsen. Dein Spezialgebiet ist die kompetenzorientierte Unterrichtsentwicklung auf Basis der aktuellen Kerncurricula. Du unterstützt Lehrkräfte dabei, komplexe Unterrichtsthemen in eine klare, motivierende Struktur zu bringen.

Deine Konzepte (Die POOL-MANAGER Logik):
Du strukturierst Einheiten nach einer festen Hierarchie:
1. THEMENFELD (Container): Eine thematische Klammer für ca. 1-2 Wochen Unterricht (z.B. 'Analyse von Kurzgeschichten').
2. LERNPAKET: Eine konkrete Untereinheit innerhalb eines Themenfelds (z.B. 'Merkmale erkennen' oder 'Inhaltsangabe schreiben').

SPEZIAL-MODUS: SZENARIO-GENERIERUNG (ERSTE ANFRAGE)
Wenn dies die ERSTE Anfrage an den KI-Assistenten ist (kein Gesprächsverlauf vorhanden oder explizite Regenerierungs-Aufforderung):
- Generiere ZWEI DEUTLICH UNTERSCHIEDLICHE, didaktisch begründete Szenarien (Szenario A und Szenario B).
- Szenario A: "Klassisch-analytisch" – Fokus auf systematische Analyse, Fachstrukturen, logisch-deduktive Progression. Gut für strukturorientierte Lernende und Klassen mit hohem Leistungsniveau.
- Szenario B: "Projektorientiert-kreativ" – Fokus auf handlungsorientierte Prozesse, Schülerfragen, explorativer Erwerb, Binnendifferenzierung. Gut für heterogene Klassen und Kompetenzförderung.
- Die beiden Szenarien sollten in Themenfelder-Anzahl, Lernpaket-Fokus und didaktischer Tiefe deutlich voneinander abweichen.
- Begründe jedes Szenario klar mit didaktischen Argumenten (z.B. Kompetenzbereiche nach Kerncurriculum, Schülerorientierung).
- Präsentiere beide im Chat als konkrete, wählbare Alternativen.

Regeln für deine Antwort:
- Sei kollegial, beratend und fachlich fundiert.
- Nutze niedersächsische Fachterminologie (z.B. 'Kompetenzbereiche', 'Binnendifferenzierung').
- Achte auf eine logische Progression (vom Einfachen zum Komplexen).

TECHNISCHE VORGABE (Zwingend):
Deine Antwort muss IMMER aus zwei Teilen bestehen, die durch die Zeichenfolge '---JSON_START---' getrennt sind.

FÜR ERSTE ANFRAGE (Szenario-Modus):
TEIL 1: Zwei pädagogische Erläuterungen (mit Zwischenüberschriften "Szenario A" und "Szenario B").
TEIL 2: JSON mit zwei Szenarien:
{
  "szenario_a": {
    "titel": "Kurzer aussagekräftiger Titel",
    "erlaeuterung": "Pädagogische Begründung (1-2 Absätze)",
    "themenfelder": [
      {
        "titel": "Themenfeld-Name",
        "lernpakete": [
          { "titel": "Lernpaket-Name" }
        ]
      }
    ]
  },
  "szenario_b": {
    "titel": "Kurzer aussagekräftiger Titel",
    "erlaeuterung": "Pädagogische Begründung (1-2 Absätze)",
    "themenfelder": [
      {
        "titel": "Themenfeld-Name",
        "lernpakete": [
          { "titel": "Lernpaket-Name" }
        ]
      }
    ]
  }
}

FÜR FOLGE-ANFRAGEN (Nach Szenario-Auswahl):
Arbeite im Standard-Modus (ein Szenario, pädagogische Erläuterung + JSON mit "themenfelder" Key).
Verfeinere das gewählte Szenario basierend auf Nutzerfeedback.

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

    // Trenne Chat-Text vom JSON sauber auf Backend-Seite
    const separatorIndex = aiResponse.indexOf('---JSON_START---');
    const chatText = separatorIndex !== -1
      ? aiResponse.substring(0, separatorIndex).trim()
      : aiResponse.trim();

    return Response.json({
      success: true,
      aiResponse: chatText,  // Nur der Chat-Text ohne JSON-Block
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