import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, lernpakete } = await req.json();

    if (!einheitId || !Array.isArray(lernpakete) || lernpakete.length === 0) {
      return Response.json(
        { error: 'Invalid input: einheitId and non-empty lernpakete array required' },
        { status: 400 }
      );
    }

    // Einheit-Details für Kontext
    const einheiten = await base44.entities.Einheiten.list();
    const einheit = einheiten.find(e => e.id === einheitId);

    const paketTitles = lernpakete.map(p => `- ${p.titel_des_pakets}`).join('\n');

    const prompt = `Du bist ein erfahrener Pädagoge für ${einheit?.fach || 'Schulunterricht'} (Jahrgangsstufe ${einheit?.jahrgangsstufe || 'unbek.'}).

Erstelle für die folgenden Lernpakete jeweils genau 2 hochwertige Lernziele:

${paketTitles}

Anforderungen:
1. **Fachsprache**: Kompetenzorientiert, nach Bloom'scher Taxonomie (Mind. Ebene 2-3), formale Sprache, mit klaren Verben wie "können", "verstehen", "anwenden".
2. **Schülersprache**: Ich-Kann-Formulierung, motivierend, verständlich für Schüler, einfache Sprache, konkret und erreichbar.

Gib das Ergebnis EXAKT in diesem JSON-Format zurück (ein Objekt, kein Array):
{
  "lernpaket_titel_1": {
    "ziel_fach": "Ich kann...[fachsprachlich]",
    "ziel_schueler": "Ich kann...[einfach verständlich]"
  },
  "lernpaket_titel_2": {
    "ziel_fach": "...",
    "ziel_schueler": "..."
  }
}

Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Worte.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
    });

    // Parse JSON aus der Antwort
    let objectives = {};
    try {
      objectives = JSON.parse(response);
    } catch (e) {
      // Fallback: Versuche JSON aus dem Response zu extrahieren
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        objectives = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON in LLM response');
      }
    }

    // Mapppe die Ziele auf Lernpaket-IDs
    const result = lernpakete.map(paket => {
      const ziele = objectives[paket.titel_des_pakets] || { ziel_fach: '', ziel_schueler: '' };
      return {
        lernpaket_id: paket.id,
        lernpaket_titel: paket.titel_des_pakets,
        ziel_fach: ziele.ziel_fach || '',
        ziel_schueler: ziele.ziel_schueler || '',
      };
    });

    return Response.json({ objectives: result });
  } catch (error) {
    console.error('Error in generateLearningObjectives:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});