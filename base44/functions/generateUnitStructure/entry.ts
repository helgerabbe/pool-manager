import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
      ? `\nAktuell bestehende Struktur (nur gezielt anpassen, nicht komplett neu generieren):\n${currentStructure}`
      : '';

    const conversationHistory = messages.length > 0
      ? `\nBisheriger Gesprächsverlauf:\n${messages.map(m => `${m.role === 'user' ? 'Lehrkraft' : 'KI'}: ${m.content}`).join('\n')}\n\nBitte passe die Struktur entsprechend dem letzten Wunsch der Lehrkraft an.`
      : 'Erstelle einen passenden Struktur-Entwurf für diese Einheit.';

    const prompt = `Du bist ein Didaktik-Experte für Gesamtschulen in Niedersachsen. Du erstellst kompetenzorientierte Unterrichtsstrukturen nach dem POOL-MANAGER-Prinzip.

Hierarchie:
- THEMENFELD: thematische Klammer für ca. 1-2 Wochen
- LERNPAKET: konkrete Untereinheit innerhalb eines Themenfelds

Unterrichtseinheit:
- Titel: ${stammdaten.titel_der_einheit}
- Fach: ${stammdaten.fach}
- Jahrgangsstufe: ${stammdaten.jahrgangsstufe}
- Zeitraum: ${stammdaten.zeit_phase_id || '–'}
${stammdaten.beschreibung && stammdaten.beschreibung.trim()
  ? `\nBeschreibung der Lehrkraft, was in dieser Einheit gelernt werden soll (höchste Priorität — daraus ergibt sich der inhaltliche Schwerpunkt der Struktur):\n${stammdaten.beschreibung.trim()}\n`
  : ''}
${documentUrls?.length > 0 ? `- Dokumente hochgeladen: ${documentUrls.length}` : ''}
${structureContext}
${conversationHistory}

WICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON ohne Markdown-Formatierung, Erklärungen oder sonstigen Text.
Das JSON muss exakt diesem Schema folgen:
{
  "themenfelder": [
    {
      "titel": "Themenfeld-Name",
      "lernpakete": [
        { "titel": "Lernpaket-Name", "geschaetzte_dauer_minuten": 45 }
      ]
    }
  ]
}`;

    const rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    // Bereinige Markdown-Codeblöcke
    let jsonString = (rawResponse || '').trim();
    jsonString = jsonString.replace(/^```(json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let structure = null;
    try {
      structure = JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      console.error('Raw response was:', jsonString.substring(0, 500));
      return Response.json({
        success: false,
        aiResponse: 'Die KI konnte keine gültige Struktur generieren. Bitte versuche es erneut.',
        structure: null,
      });
    }

    const aiResponse = messages.length === 0
      ? `Ich habe einen ersten Entwurf für die Einheit erstellt. Du siehst ihn links in der Vorschau. Was sollen wir anpassen?`
      : `Ich habe die Struktur entsprechend deinem Wunsch aktualisiert. Was möchtest du als nächstes ändern?`;

    return new Response(JSON.stringify({ aiResponse, structure }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generateUnitStructure error:', error);
    return Response.json(
      { error: error.message || 'Structure generation failed' },
      { status: 500 }
    );
  }
});