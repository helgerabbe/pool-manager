import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { master_id, anzahl = 5, zusatz_hinweise = '' } = body;

    if (!master_id) {
      return Response.json({ error: 'master_id ist erforderlich' }, { status: 400 });
    }
    if (anzahl < 1 || anzahl > 20) {
      return Response.json({ error: 'Anzahl muss zwischen 1 und 20 liegen' }, { status: 400 });
    }

    // Masteraufgabe laden
    const master = await base44.asServiceRole.entities.Aufgabenbausteine.get(master_id);
    if (!master) {
      return Response.json({ error: 'Masteraufgabe nicht gefunden' }, { status: 404 });
    }

    // Lernpaket laden → Einheit → Gesamtziel + Metadaten
    const lernpaket = master.lernpaket_id
      ? await base44.asServiceRole.entities.Lernpakete.get(master.lernpaket_id).catch(() => null)
      : null;

    const einheit = lernpaket?.einheit_id
      ? await base44.asServiceRole.entities.Einheiten.get(lernpaket.einheit_id).catch(() => null)
      : null;

    // Lernziel laden
    const lernziel = master.lernziel_id
      ? await base44.asServiceRole.entities.Lernziele.get(master.lernziel_id).catch(() => null)
      : null;

    const fach = einheit?.fach || 'unbekanntes Fach';
    const jahrgangsstufe = einheit?.jahrgangsstufe || 'unbekannte Jahrgangsstufe';
    const gesamtziel = einheit?.gesamtziel || '';
    const lernzielText = lernziel?.formulierung_fachsprache || '';
    const paketTitel = lernpaket?.titel_des_pakets || '';
    const masterText = master.aufgabentext_inhalt || '';
    const masterLoesung = master.erwartungshorizont_ki_prompt || '';
    const aktivitaetstyp = master.baustein_typ || 'Übung';

    const systemPrompt = `Du bist ein erfahrener Pädagoge aus Norddeutschland, spezialisiert auf die Erstellung differenzierter Unterrichtsmaterialien.
Deine Aufgabe: Erstelle didaktisch gleichwertige Varianten einer vorhandenen Masteraufgabe.

WICHTIGE REGELN:
- Behalte den Schwierigkeitsgrad und die Kompetenzanforderungen exakt bei.
- Verwende andere Beispiele, Texte oder Zahlen als die Masteraufgabe, aber das gleiche Aufgabenformat.
- Passe die Aufgaben an den norddeutschen Schulkontext an (wenn sinnvoll).
- Antworte ausschließlich mit gültigem JSON.`;

    const userPrompt = `Kontext:
- Fach: ${fach}
- Jahrgangsstufe: ${jahrgangsstufe}
- Region: Norddeutschland
- Gesamtziel der Einheit: ${gesamtziel || '(nicht angegeben)'}
- Lernpaket: ${paketTitel || '(nicht angegeben)'}
- Lernziel: ${lernzielText || '(nicht angegeben)'}
- Aktivitätstyp: ${aktivitaetstyp}

MASTERAUFGABE:
"""${masterText}"""

ERWARTETE LÖSUNG DER MASTERAUFGABE:
"""${masterLoesung}"""

${zusatz_hinweise ? `ZUSÄTZLICHE HINWEISE DES LEHRERS:\n"""${zusatz_hinweise}"""\n` : ''}

Erstelle jetzt genau ${anzahl} Aufgabenvariante(n), die didaktisch gleichwertig zur Masteraufgabe sind, aber andere Inhalte/Beispiele verwenden.

Antworte mit diesem JSON-Format:
{
  "replicas": [
    {
      "aufgabentext": "Vollständiger Aufgabentext hier",
      "loesung": "Musterlösung / Lösungshinweise hier"
    }
  ]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: userPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          replicas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aufgabentext: { type: 'string' },
                loesung: { type: 'string' },
              },
              required: ['aufgabentext', 'loesung'],
            },
          },
        },
        required: ['replicas'],
      },
    });

    const replicas = result?.replicas || [];

    return Response.json({
      success: true,
      replicas,
      metadata: {
        master_id,
        anzahl_generiert: replicas.length,
        fach,
        jahrgangsstufe,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});