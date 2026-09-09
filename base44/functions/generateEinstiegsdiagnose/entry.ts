import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * generateEinstiegsdiagnose
 *
 * Erzeugt für den Onboarding-Baustein „Freiwilliger Fragenblock für die
 * Einstiegsdiagnose" (sys_sec0_qblock) 5-6 Orientierungsfragen, die der
 * Schüler per Schieberegler beantwortet. Ziel ist KEIN Quiz, sondern ein
 * Selbst-Gefühl: „Wie sicher fühle ich mich bei sowas?" — als Entscheidungs-
 * hilfe für die Lerntyp-Wahl.
 *
 * Jede Frage hat einen Unsicher-Pol (links) und einen Sicher-Pol (rechts).
 * Der Schieberegler links = unsicher, rechts = sicher (konsistente Polung,
 * damit das Frontend daraus eine einfache Einschätzung berechnen kann).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, verfeinerung, anzahl, bestehendeFragen } = await req.json();
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

    const lernpaketTitel = (lernpakete || [])
      .filter((p) => p?.sync_status !== 'to_delete')
      .map((p) => p.titel_des_pakets)
      .filter(Boolean);
    const lernzielTexte = (lernziele || [])
      .map((l) => l.titel || l.beschreibung || l.text)
      .filter(Boolean)
      .slice(0, 25);

    const kontext = {
      titel: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      gesamtziele: einheit.gesamtziele || [],
      grundgeruest: einheit.grundgeruest_rohtext || '',
      lernpakete: lernpaketTitel,
      lernziele: lernzielTexte,
    };

    // Didaktische Bauanleitung aus der Verwaltung (Single Source of Truth).
    // Fällt der DB-Text weg, greift der bewährte Default.
    const FALLBACK_INSTRUKTION = `Du erstellst einen FREIWILLIGEN ORIENTIERUNGS-FRAGENBLOCK für die Einstiegsdiagnose einer Unterrichtseinheit – direkt an Schülerinnen und Schüler gerichtet.

ZIEL: Der Schüler steht VOR der Einheit und kennt deren Thema in der Regel noch nicht. Er soll sich deshalb NICHT zur neuen Einheit einschätzen, sondern zu seiner GRUNDSÄTZLICHEN Sicherheit: im Fach allgemein, im übergeordneten Bereich des Fachs (z. B. Geometrie, Grammatik, Mechanik) und in den Arbeitsweisen und dem VORWISSEN, auf die die Einheit aufbaut. Daraus zieht er ein Gefühl für seine Ausgangslage und wählt seinen Lerntyp.

STRIKT VERBOTEN:
- Fragen zum konkreten NEUEN Thema der Einheit („Wie sicher fühlst du dich bei Zylinder-Volumen?") – das würde fast alle Schüler unsicher wirken lassen, obwohl sie es einfach noch nicht hatten.
- Jede Wissensabfrage mit richtigen Antworten.

SO SIEHT ES RICHTIG AUS – frage nach Selbsteinschätzung, Erfahrung, Bauchgefühl:
- Sicherheit im Fach: „Wie sicher fühlst du dich generell im Fach …?"
- Sicherheit im übergeordneten Bereich: „Wie sicher fühlst du dich, wenn es um … (Bereich, z. B. Geometrie / Textarbeit) geht?"
- Vorwissen und Grundlagen, auf denen die Einheit aufbaut: „Wie sicher bist du beim Rechnen mit Flächen?", „Wie gut kannst du Formeln einsetzen?"
- Haltung und Erfahrung: „Hast du solche Aufgaben bisher gern gemacht?", „Wie gut klappt es bei dir, allein an einer Aufgabe dranzubleiben?"

VORGEHEN: Leite aus dem Kontext der Einheit ab, welche VORAUSSETZUNGEN (Vorwissen, Fertigkeiten, Arbeitsweisen aus früheren Jahren) sie braucht, und frage NUR diese ab – nicht die Einheitsinhalte selbst.

REGELN:
- Sehr schülergerechte, einfache, freundliche Sprache. Direkte Ansprache ("du").
- Liefere einen VORRAT an Fragen zur Auswahl – die Lehrkraft wählt daraus die besten aus. Decke dabei verschiedene Blickwinkel ab (Fach allgemein, Bereich, einzelne Vorwissens-Bausteine, Arbeitshaltung).
- Jede Frage wird mit EINEM Schieberegler beantwortet.
- WICHTIG zur Polung: Das linke Label ist immer der UNSICHERE Pol, das rechte Label ist immer der SICHERE Pol. Halte diese Reihenfolge bei JEDER Frage ein.
- Halte die Pol-Labels kurz (max. ~4 Wörter).
- KEINE erfundenen Fakten, die dem Kontext widersprechen.`;

    let instruktion = FALLBACK_INSTRUKTION;
    try {
      const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_sec0_qblock' });
      const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
      if (dbText && dbText.trim()) instruktion = dbText.trim();
    } catch (_e) {
      // Fallback bleibt aktiv.
    }

    // Optionaler Verfeinerungs-Hinweis der Lehrkraft (ERSETZT, kumuliert nicht).
    const verfeinerungBlock = (typeof verfeinerung === 'string' && verfeinerung.trim())
      ? `\n\nZUSÄTZLICHER WUNSCH DER LEHRKRAFT (mit Vorrang berücksichtigen, aber die technische Ausgabe-Vorgabe bleibt zwingend):\n${verfeinerung.trim()}`
      : '';

    // Nachschlag-Modus: Die Lehrkraft hat bereits Fragen ausgewählt und will
    // weitere zur Auswahl. Die vorhandenen dürfen sich nicht wiederholen.
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
- Jede Frage hat ein 'links_label' (UNSICHERER Pol) und ein 'rechts_label' (SICHERER Pol) – diese Polung ist zwingend.
- Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.${vermeidenBlock}${verfeinerungBlock}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer, einladender Titel des Fragenblocks' },
          intro: { type: 'string', description: 'Ein kurzer, beruhigender Einstiegssatz (kein Test!)' },
          fragen: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                frage: { type: 'string', description: 'Die Orientierungsfrage' },
                links_label: { type: 'string', description: 'Unsicherer Pol (links)' },
                rechts_label: { type: 'string', description: 'Sicherer Pol (rechts)' },
              },
              required: ['frage', 'links_label', 'rechts_label'],
            },
          },
          hinweis: { type: 'string', description: 'Kurzer Abschluss-Hinweis, dass es nur um das eigene Gefühl geht' },
        },
        required: ['titel', 'intro', 'fragen'],
      },
    });

    return Response.json({ diagnose: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});