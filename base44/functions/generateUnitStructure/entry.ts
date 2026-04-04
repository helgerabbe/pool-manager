import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYSTEM_PROMPT = `Du bist ein hochqualifizierter Didaktik-Experte für Gesamtschulen in Niedersachsen. Dein Spezialgebiet ist die kompetenzorientierte Unterrichtsentwicklung auf Basis der aktuellen Kerncurricula.

Du strukturierst Unterrichtseinheiten nach dieser Hierarchie:
1. THEMENFELD: Eine thematische Klammer für ca. 1-2 Wochen Unterricht.
2. LERNPAKET: Eine konkrete Untereinheit innerhalb eines Themenfelds.

Für JEDE Anfrage (initial oder Folge-Anfrage) gilt:
- Erstelle EINEN passgenauen Struktur-Entwurf als valides JSON.
- Bei Folge-Anfragen: Passe die bestehende Struktur gezielt an das Nutzerfeedback an, generiere sie NICHT komplett neu.
- Nutze niedersächsische Fachterminologie und achte auf logische Progression.

TECHNISCHE VORGABE (zwingend):
- Gib AUSSCHLIESSLICH das rohe JSON zurück. Keinen erklärenden Text, keine Einleitung, kein Markdown.
- Das JSON muss exakt diesem Schema folgen:
{
  "themenfelder": [
    {
      "titel": "Themenfeld-Name",
      "lernpakete": [
        { "titel": "Lernpaket-Name" }
      ]
    }
  ]
}`;

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
      currentStructure = null,
    } = await req.json();

    if (!stammdaten) {
      return Response.json({ error: 'Missing stammdaten' }, { status: 400 });
    }

    const structureContext = currentStructure
      ? `\nAktuell bestehende Struktur (nur gezielt anpassen):\n${currentStructure}`
      : '';

    const fullPrompt = `Unterrichtseinheit:
- Titel: ${stammdaten.titel_der_einheit}
- Fach: ${stammdaten.fach}
- Jahrgangsstufe: ${stammdaten.jahrgangsstufe}
- Zeitraum: ${stammdaten.zeit_phase_id || '–'}
${documentUrls?.length > 0 ? `- Dokumente hochgeladen: ${documentUrls.length}` : ''}
${structureContext}

${messages.length > 0
  ? `Bisheriger Gesprächsverlauf:\n${messages.map(m => `${m.role === 'user' ? 'Lehrkraft' : 'KI'}: ${m.content}`).join('\n')}\n\nBitte passe die Struktur entsprechend dem letzten Wunsch der Lehrkraft an.`
  : 'Erstelle einen passenden Struktur-Entwurf für diese Einheit.'}

Antworte AUSSCHLIESSLICH mit dem rohen JSON. Kein Text davor oder danach.`;

    const rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: 'claude_sonnet_4_6',
    });

    // Bereinige Markdown-Codeblöcke falls vorhanden
    let jsonString = (rawResponse || '').trim();
    jsonString = jsonString.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let structure = null;
    let aiResponse = '';

    try {
      structure = JSON.parse(jsonString);
      // Erfolgs-Chat-Text manuell generieren
      if (messages.length === 0) {
        aiResponse = `Hier ist mein Vorschlag für die Struktur deiner Einheit „${stammdaten.titel_der_einheit}". Die Themenfelder und Lernpakete sind links sichtbar. Du kannst mir jetzt Änderungswünsche mitteilen – z.B. Lernpakete umbenennen, hinzufügen oder die Reihenfolge anpassen.`;
      } else {
        aiResponse = `Ich habe die Struktur entsprechend angepasst. Die aktualisierte Vorschau siehst du links. Was möchtest du als nächstes ändern?`;
      }
    } catch (e) {
      console.error('JSON Parse Error:', e);
      console.error('Raw response:', jsonString);
      aiResponse = 'Die KI konnte keine gültige Struktur generieren. Bitte versuche es erneut oder formuliere deinen Wunsch anders.';
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