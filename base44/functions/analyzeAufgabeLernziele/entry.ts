import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * analyzeAufgabeLernziele
 *
 * Phase 1 der KI-gestützten Lernzielanalyse.
 *
 * Nimmt eine Aufgaben-ID, lädt die Aufgabe + ihren didaktischen Kontext
 * (Einheit, Themenfeld) und lässt die KI eine sortierte Liste der
 * FACHBEZOGENEN Lernziele erstellen, die ein Schüler beherrschen muss,
 * um diese Aufgabe lösen zu können.
 *
 * Wichtig:
 *   - STRIKT fachbezogen — keine trivialen Voraussetzungen
 *     ("Stift halten", "Computer einschalten").
 *   - Zusätzlich ein optionaler Hinweis auf fachübergreifende /
 *     aus anderen Fächern stammende Voraussetzungen.
 *
 * Diese Funktion SCHREIBT nichts in die DB — sie liefert nur den Vorschlag
 * zurück. Das Speichern (kuratierte Liste) übernimmt das Frontend.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabeId } = await req.json();
    if (!aufgabeId) {
      return Response.json({ error: 'aufgabeId fehlt' }, { status: 400 });
    }

    const aufgabe = await base44.entities.AllgemeineAufgabe.get(aufgabeId);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    // Kontext laden: Einheit + Themenfeld (best effort).
    let einheit = null;
    let themenfeld = null;
    try {
      if (aufgabe.einheit_id) einheit = await base44.entities.Einheiten.get(aufgabe.einheit_id);
    } catch { /* ignore */ }
    try {
      if (aufgabe.themenfeld_id) themenfeld = await base44.entities.Themenfeld.get(aufgabe.themenfeld_id);
    } catch { /* ignore */ }

    const fach = einheit?.fach || 'unbekanntes Fach';
    const jahrgang = einheit?.jahrgangsstufe ? `Jahrgangsstufe ${einheit.jahrgangsstufe}` : 'unbekannte Jahrgangsstufe';
    const einheitTitel = einheit?.titel_der_einheit || 'unbekannte Einheit';
    const themenfeldTitel = themenfeld?.titel || 'kein Themenfeld';

    const prompt = `Du bist ein erfahrener Fachdidaktiker und unterstützt eine Lehrkraft bei der Lernzielanalyse einer Aufgabe.

KONTEXT:
- Fach: ${fach}
- ${jahrgang}
- Unterrichtseinheit: "${einheitTitel}"
- Themenfeld: "${themenfeldTitel}"

DIE AUFGABE:
- Titel: ${aufgabe.titel || '(kein Titel)'}
- Aufgabenstellung: ${aufgabe.aufgabenstellung || '(keine Aufgabenstellung hinterlegt)'}
${aufgabe.erwartungshorizont ? `- Erwartungshorizont: ${aufgabe.erwartungshorizont}` : ''}
${aufgabe.hinweise_zum_material ? `- Material-Hinweise: ${aufgabe.hinweise_zum_material}` : ''}

DEINE AUFGABE:
Analysiere die Aufgabe auf ihren didaktischen Kern. Erstelle eine sortierte Liste der FACHBEZOGENEN Lernziele bzw. Fähigkeiten und Fertigkeiten, die ein Schüler beherrschen muss, um diese Aufgabe lösen zu können.

STRIKTE REGELN:
1. NUR fachbezogene Lernziele. KEINE trivialen oder allgemeinen Voraussetzungen wie "einen Stift halten", "lesen können", "einen Computer bedienen".
2. Formuliere jedes Lernziel präzise und kompetenzorientiert aus Schülersicht (z.B. "Der Schüler kann …").
3. Sortiere die Liste sinnvoll: von grundlegenden Voraussetzungen hin zu komplexeren, aufgabenspezifischen Fähigkeiten.
4. 3 bis 8 Lernziele sind ein guter Richtwert — lieber wenige, treffende als viele oberflächliche.
5. Gib zusätzlich EINEN kurzen Hinweis (1-2 Sätze), falls in dieser Aufgabe auch fachübergreifende oder aus anderen Fächern stammende Voraussetzungen stecken, an denen der Schüler scheitern könnte. Wenn es keine solchen gibt, lasse das Feld leer.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          lernziele: {
            type: 'array',
            items: { type: 'string' },
            description: 'Sortierte Liste fachbezogener Lernziel-Formulierungen.',
          },
          fachuebergreifender_hinweis: {
            type: 'string',
            description: 'Optionaler Hinweis auf fachübergreifende Voraussetzungen. Leer, wenn keine.',
          },
        },
        required: ['lernziele'],
      },
    });

    return Response.json({
      lernziele: Array.isArray(result?.lernziele) ? result.lernziele : [],
      fachuebergreifender_hinweis: result?.fachuebergreifender_hinweis || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});