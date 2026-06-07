import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * generateDiagnoseQuiz
 *
 * Erzeugt für den Standardbaustein „Einstiegsdiagnose" (sys_diagnose_entry)
 * ein echtes Multiple-Choice-Wissensquiz. Ziel: der Schüler – der die Einheit
 * noch NICHT bearbeitet hat – bekommt ein grobes Gefühl, ob er die Themen
 * schon kennt/versteht. Es ist kein benoteter Test, sondern eine
 * Selbstorientierung mit ermutigender Abschluss-Rückmeldung.
 *
 * Regeln (vom Konzept vorgegeben):
 *   - 3-8 Fragen, Anzahl entscheidet die KI je nach Umfang der Einheit.
 *   - AUSSCHLIESSLICH Multiple Choice.
 *   - 4-5 Antwortoptionen pro Frage, GENAU EINE ist richtig.
 *   - Distraktoren müssen plausibel/themennah sein (nicht offensichtlich
 *     absurd), damit man die richtige Antwort nicht raten kann.
 *   - Sehr schülergerechte Sprache (Einheit noch nicht durchgearbeitet).
 *   - Bezug auf konkrete Inhalte/Lernpakete/Lernziele der Einheit.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    const einheitListe = await base44.entities.Einheiten.filter({ id: einheitId });
    const einheit = Array.isArray(einheitListe) ? einheitListe[0] : null;
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
    let lernziele = [];
    try {
      lernziele = await base44.entities.Lernziele.filter({ einheit_id: einheitId });
    } catch (_e) {
      lernziele = [];
    }
    let aufgaben = [];
    try {
      aufgaben = await base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
    } catch (_e) {
      aufgaben = [];
    }
    let themenfelder = [];
    try {
      themenfelder = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
    } catch (_e) {
      themenfelder = [];
    }

    const lernpaketTitel = (lernpakete || [])
      .filter((p) => p?.sync_status !== 'to_delete')
      .map((p) => p.titel_des_pakets)
      .filter(Boolean);
    const lernzielTexte = (lernziele || [])
      .map((l) => l.formulierung_fachsprache || l.titel || l.beschreibung || l.text)
      .filter(Boolean)
      .slice(0, 40);
    const aufgabenTitel = (aufgaben || [])
      .map((a) => a.titel)
      .filter(Boolean)
      .slice(0, 30);
    const themenfeldTitel = (themenfelder || [])
      .map((t) => t.titel)
      .filter(Boolean);

    const kontext = {
      titel: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      gesamtziele: einheit.gesamtziele || [],
      grundgeruest: einheit.grundgeruest_rohtext || '',
      themenfelder: themenfeldTitel,
      lernpakete: lernpaketTitel,
      aufgaben: aufgabenTitel,
      lernziele: lernzielTexte,
    };

    const prompt = `Du erstellst eine EINSTIEGSDIAGNOSE als Multiple-Choice-Quiz für eine Unterrichtseinheit – direkt an Schülerinnen und Schüler gerichtet.

KONTEXT DER EINHEIT (als JSON):
${JSON.stringify(kontext, null, 2)}

ZIEL: Ein Schüler, der die Einheit NOCH NICHT bearbeitet hat, soll mit diesen Fragen ein grobes Gefühl dafür bekommen, ob er die Themen der Einheit schon kennt und versteht. Es ist KEIN benoteter Test – es geht um Selbsteinschätzung und Orientierung. Schüler überschätzen oder unterschätzen sich oft; die Diagnose hilft ihnen, sich realistisch einzuordnen.

ANZAHL DER FRAGEN: Entscheide SELBST je nach Umfang der Einheit zwischen 3 und 8 Fragen. Kleine Einheit (wenige Themenfelder/Lernpakete) → eher 3-4 Fragen. Umfangreiche Einheit → eher 6-8 Fragen.

STRIKTE REGELN ZU DEN FRAGEN:
- AUSSCHLIESSLICH Multiple-Choice-Fragen. Keine offenen Fragen.
- Jede Frage hat 4 ODER 5 Antwortoptionen.
- GENAU EINE Option ist richtig (Index in 'richtige_antwort_index', 0-basiert).
- Die FALSCHEN Optionen (Distraktoren) müssen PLAUSIBEL und themennah sein – sie müssen theoretisch denkbare Antworten sein, damit der Schüler nicht durch reines Raten die richtige Antwort findet.
  NEGATIV-BEISPIEL (verboten): Frage „Wie heißt der Erdtrabant?" mit Optionen Mond / Banane / Affe / Schaukel → die falschen Optionen sind absurd, die richtige ist sofort erkennbar.
  POSITIV-BEISPIEL: Frage „Wie heißt der Erdtrabant?" mit Optionen Mond / Phobos / Io / Titan / Europa → alle sind echte Monde, also alle plausibel.
- Sehr schülergerechte, einfache, klare Sprache (Klasse ${einheit.jahrgangsstufe || ''}). Direkte Ansprache ("du").
- Beziehe dich KONKRET auf die Inhalte/Themen/Lernziele der Einheit aus dem Kontext.
- KEINE erfundenen Fakten. Wenn du unsicher bist, formuliere die Frage allgemeiner statt falsch.

ABSCHLUSS-RÜCKMELDUNGEN: Liefere drei ermutigende Rückmeldungstexte (schülergerecht, motivierend), passend zu drei Ergebnis-Bändern:
- 'hoch' (viele richtig): z. B. „Stark – du hast schon richtig viel Ahnung!"
- 'mittel' (teils richtig): z. B. „Nicht schlecht, du hast schon ein gutes Überblickswissen!"
- 'niedrig' (wenige richtig): z. B. „Noch viel Neues für dich – aber genau dafür ist die Einheit ja da!"`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer, einladender Titel der Einstiegsdiagnose' },
          intro: { type: 'string', description: 'Kurzer, beruhigender Einstiegssatz (kein benoteter Test!)' },
          fragen: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                frage: { type: 'string', description: 'Die Multiple-Choice-Frage in schülergerechter Sprache' },
                optionen: {
                  type: 'array',
                  description: '4 oder 5 plausible Antwortoptionen',
                  items: { type: 'string' },
                },
                richtige_antwort_index: {
                  type: 'number',
                  description: '0-basierter Index der genau einen richtigen Option',
                },
              },
              required: ['frage', 'optionen', 'richtige_antwort_index'],
            },
          },
          feedback: {
            type: 'object',
            properties: {
              hoch: { type: 'string' },
              mittel: { type: 'string' },
              niedrig: { type: 'string' },
            },
            required: ['hoch', 'mittel', 'niedrig'],
          },
        },
        required: ['titel', 'fragen', 'feedback'],
      },
    });

    return Response.json({ diagnose: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});