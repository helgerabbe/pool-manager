import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * empfehleLerntyp
 *
 * Wertet die Onboarding-Eingaben eines Schülers aus und spricht eine
 * Lerntyp-Empfehlung (minimalist | pragmatiker | ehrgeizig | passioniert) aus.
 *
 * Eingaben (alle optional – je mehr, desto fundierter):
 *   - selbsteinschaetzung_avg: 0..100 (Durchschnitt der Schieberegler)
 *   - quiz_anteil_richtig:     0..100 (% richtig beantworteter Quizfragen)
 *   - brian_transkript:        [{ rolle, text }] (simuliertes Brian-Gespräch)
 *   - einheitId:               für Kontext (Titel/Fach)
 *
 * Liefert: { empfehlung, begruendung }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      einheitId,
      selbsteinschaetzung_avg = null,
      quiz_anteil_richtig = null,
      brian_transkript = [],
    } = await req.json();

    let titel = '';
    let fach = '';
    if (einheitId) {
      const liste = await base44.entities.Einheiten.filter({ id: einheitId });
      const e = Array.isArray(liste) ? liste[0] : null;
      titel = e?.titel_der_einheit || '';
      fach = e?.fach || '';
    }

    const transkriptText = (Array.isArray(brian_transkript) ? brian_transkript : [])
      .map((m) => `${m.rolle === 'user' ? 'Schüler' : 'Brian'}: ${m.text}`)
      .join('\n');

    const prompt = `Du bist Brian, ein freundlicher KI-Lernbegleiter. Du sollst einem Schüler einen passenden LERNTYP für die Einheit "${titel}" (Fach: ${fach}) empfehlen.

Es gibt genau vier Lerntypen:
- "minimalist": Klar, kompakt, das Wichtigste zuerst. Für sichere Schüler, die zügig durchwollen.
- "pragmatiker": Effizient zum Ziel, ohne Umwege. Ausgewogen – etwas Übung, klare Struktur.
- "ehrgeizig": Tiefer einsteigen, mehr erreichen. Für Schüler, die mehr üben und vertiefen wollen.
- "passioniert": Mit Begeisterung in die Tiefe. Für sehr motivierte Schüler, die viel Begleitung und Projekte mögen.

DATEN DES SCHÜLERS:
- Selbsteinschätzung (0 = sehr unsicher, 100 = sehr sicher): ${selbsteinschaetzung_avg ?? 'nicht angegeben'}
- Wissensquiz-Ergebnis (% richtig): ${quiz_anteil_richtig ?? 'nicht angegeben'}
${transkriptText ? `\nGESPRÄCH MIT BRIAN:\n${transkriptText}` : ''}

FAUSTREGEL (als Orientierung, das Gespräch hat Vorrang):
- Sehr sicher / hohes Quiz (>70%) → minimalist oder pragmatiker
- Mittel (40–70%) → pragmatiker
- Unsicher (<40%) / Wunsch nach mehr Übung → ehrgeizig oder passioniert

Sprich eine klare Empfehlung aus und begründe sie in 2–3 warmen, ermutigenden Sätzen direkt an den Schüler ("du").`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          empfehlung: {
            type: 'string',
            enum: ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'],
          },
          begruendung: { type: 'string' },
        },
        required: ['empfehlung', 'begruendung'],
      },
    });

    return Response.json({
      empfehlung: result.empfehlung,
      begruendung: result.begruendung,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});