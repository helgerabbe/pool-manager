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

    const { einheitId, anzahl, bestehendeFragen } = await req.json();
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

    // Didaktische Bauanleitung aus der Verwaltung (Single Source of Truth).
    // Fällt der DB-Text weg, greift der bewährte Default.
    const FALLBACK_INSTRUKTION = `Du erstellst eine EINSTIEGSDIAGNOSE als Multiple-Choice-Quiz für eine Unterrichtseinheit – direkt an Schülerinnen und Schüler gerichtet.

ZIEL: Der Schüler steht VOR der Einheit und hat ihr Thema meist noch nie gehabt. Die Diagnose prüft deshalb NICHT die Inhalte der neuen Einheit, sondern das VORWISSEN und die GRUNDLAGEN, auf denen die Einheit aufbaut – also das, was aus früheren Themen und Jahrgängen mitgebracht werden sollte. Es ist KEIN benoteter Test: Der Schüler soll erkennen, wie tragfähig seine Ausgangslage ist, und daraus seinen Lerntyp ableiten.

WAS ABGEFRAGT WIRD:
- Leite aus dem Kontext der Einheit ab, welche VORAUSSETZUNGEN sie braucht (z. B. Flächenberechnung, Umgang mit Formeln, Grundbegriffe, Rechenwege, Fachsprache aus früheren Themen) und frage GENAU DIESE ab.
- Beispiel: Bei einer Einheit über Zylinder-Volumen gehören Fragen zu Kreisfläche, Umfang und Formel-Einsetzen dazu – NICHT Fragen zur Zylinder-Volumenformel selbst.
- VERBOTEN sind Fragen, die man nur beantworten kann, wenn man die neue Einheit schon bearbeitet hat.

ANZAHL DER FRAGEN: Du lieferst einen VORRAT zur Auswahl – die Lehrkraft wählt daraus die besten Fragen aus. Halte dich an die vorgegebene Anzahl und decke verschiedene Vorwissens-Bausteine ab, statt eine Sache mehrfach zu fragen.

STRIKTE REGELN ZU DEN FRAGEN:
- AUSSCHLIESSLICH Multiple-Choice-Fragen. Keine offenen Fragen.
- Jede Frage hat 4 ODER 5 Antwortoptionen.
- GENAU EINE Option ist richtig.
- Die FALSCHEN Optionen (Distraktoren) müssen PLAUSIBEL und themennah sein – sie müssen theoretisch denkbare Antworten sein, damit der Schüler nicht durch reines Raten die richtige Antwort findet.
  NEGATIV-BEISPIEL (verboten): Frage „Wie heißt der Erdtrabant?" mit Optionen Mond / Banane / Affe / Schaukel → die falschen Optionen sind absurd, die richtige ist sofort erkennbar.
  POSITIV-BEISPIEL: Frage „Wie heißt der Erdtrabant?" mit Optionen Mond / Phobos / Io / Titan / Europa → alle sind echte Monde, also alle plausibel.
- Sehr schülergerechte, einfache, klare Sprache. Direkte Ansprache ("du").
- Beziehe dich auf das VORWISSEN, das die Einheit voraussetzt – nicht auf ihre neuen Inhalte.
- KEINE erfundenen Fakten. Wenn du unsicher bist, formuliere die Frage allgemeiner statt falsch.

ABSCHLUSS-RÜCKMELDUNGEN: Liefere drei ermutigende Rückmeldungstexte (schülergerecht, motivierend), passend zu drei Ergebnis-Bändern:
- 'hoch' (viele richtig): z. B. „Stark – deine Grundlagen sitzen, damit startest du gut in die Einheit!"
- 'mittel' (teils richtig): z. B. „Deine Grundlagen sind schon ordentlich, an ein paar Stellen lohnt ein Blick zurück."
- 'niedrig' (wenige richtig): z. B. „Ein paar Grundlagen fehlen noch – gut, dass du es jetzt weißt, wir holen sie unterwegs auf!"`;

    let instruktion = FALLBACK_INSTRUKTION;
    try {
      const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_diagnose_entry' });
      const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
      if (dbText && dbText.trim()) instruktion = dbText.trim();
    } catch (_e) {
      // Fallback bleibt aktiv.
    }

    // Nachschlag-Modus: bereits ausgewählte Fragen dürfen sich nicht wiederholen.
    const bestehendeListe = Array.isArray(bestehendeFragen)
      ? bestehendeFragen.filter((f) => typeof f === 'string' && f.trim()).slice(0, 40)
      : [];
    const vermeidenBlock = bestehendeListe.length
      ? `\n\nDIESE FRAGEN EXISTIEREN SCHON – erzeuge inhaltlich ANDERE, keine Umformulierungen davon:\n- ${bestehendeListe.join('\n- ')}`
      : '';
    const anzahlFragen = Number.isFinite(anzahl) && anzahl > 0 ? Math.min(Math.round(anzahl), 15) : 10;

    const prompt = `${instruktion}

KONTEXT DER EINHEIT (als JSON):
${JSON.stringify(kontext, null, 2)}

TECHNISCHE AUSGABE-VORGABE (von der Vorschau-/Export-Komponente erzwungen, NICHT verhandelbar):
- Genau ${anzahlFragen} Fragen, alle inhaltlich verschieden.
- Gib 'richtige_antwort_index' als 0-basierten Index der genau einen richtigen Option an.
- Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.${vermeidenBlock}`;

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