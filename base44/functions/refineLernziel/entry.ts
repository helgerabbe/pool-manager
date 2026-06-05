import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * refineLernziel
 * ──────────────
 * Nimmt ein vom Lehrer eingegebenes Lernziel (egal ob fach- oder
 * schülersprachlich formuliert) und liefert zwei abgestimmte Varianten zurück:
 *   1. formulierung_fachsprache  – offizielle, fachlich korrekte "Ich kann…"-Formulierung
 *   2. schueler_uebersetzung     – schülergerechte, leicht verständliche Variante
 *
 * Optional bekommt die KI Fach, Jahrgangsstufe und Lernpaket-Titel als Kontext,
 * damit die Vorschläge zum Niveau passen.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eingabe = (body?.eingabe || '').trim();
    const fach = body?.fach || '';
    const jahrgangsstufe = body?.jahrgangsstufe || '';
    const lernpaketTitel = body?.lernpaket_titel || '';
    const kategorie = body?.kategorie || '';

    if (!eingabe) {
      return Response.json({ error: 'Kein Lernziel-Text übergeben.' }, { status: 400 });
    }

    const kontextZeilen = [
      fach ? `Fach: ${fach}` : null,
      jahrgangsstufe ? `Jahrgangsstufe: ${jahrgangsstufe}` : null,
      lernpaketTitel ? `Lernpaket: ${lernpaketTitel}` : null,
      kategorie ? `Kategorie des Lernziels: ${kategorie}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Du bist ein erfahrener Didaktik-Experte und hilfst einer Lehrkraft, Lernziele klar zu formulieren.

Die Lehrkraft hat folgendes Lernziel eingegeben (es ist unklar, ob es bereits fachsprachlich oder schülergerecht formuliert ist):

"""${eingabe}"""

${kontextZeilen ? `Kontext:\n${kontextZeilen}\n` : ''}
Erstelle daraus ZWEI aufeinander abgestimmte Formulierungen DESSELBEN Lernziels:

1. "formulierung_fachsprache": Eine offizielle, fachlich präzise Formulierung in der Ich-Form (beginnend mit "Ich kann…" oder "Ich weiß…"). Fachbegriffe korrekt und vollständig verwenden. Diese Version richtet sich an Lehrkräfte und Curriculum.

2. "schueler_uebersetzung": Dieselbe Aussage in einfacher, schülergerechter Sprache (ebenfalls Ich-Form). Kurz, motivierend, ohne unnötiges Fachvokabular, so dass eine Schülerin / ein Schüler der angegebenen Jahrgangsstufe genau versteht, was sie/er lernen wird.

Behalte den fachlichen Kern der Eingabe bei – erfinde keine neuen Inhalte. Antworte nur mit den beiden Formulierungen.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          formulierung_fachsprache: { type: 'string' },
          schueler_uebersetzung: { type: 'string' },
        },
        required: ['formulierung_fachsprache', 'schueler_uebersetzung'],
      },
    });

    return Response.json({
      formulierung_fachsprache: result?.formulierung_fachsprache || '',
      schueler_uebersetzung: result?.schueler_uebersetzung || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});