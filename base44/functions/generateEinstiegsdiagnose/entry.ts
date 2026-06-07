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

ZIEL: Ein Schüler, der noch nicht weiß, ob er Vorwissen hat oder sich selbst schwer einschätzen kann, soll durch 5-6 Fragen ein GEFÜHL dafür bekommen, ob er sich in dieser Einheit sicher fühlt. Das hilft ihm, seinen Lerntyp zu wählen.

WICHTIG – das ist KEIN Quiz und KEINE Wissensabfrage:
- Frage NICHT nach richtigen Antworten.
- Frage nach Selbsteinschätzung / Erfahrung / Bauchgefühl.
- Gute Frage-Muster: „Hast du schon mal …?", „Wenn du dieses Beispiel siehst – könntest du damit etwas anfangen?", „In dieser Einheit kommen Aufgaben wie … vor. Hast du eine Idee, wie man die lösen könnte?", „Wie sicher fühlst du dich beim Thema …?"
- Beziehe dich KONKRET auf die Inhalte/Themen/Lernziele der Einheit aus dem Kontext.

REGELN:
- Sehr schülergerechte, einfache, freundliche Sprache. Direkte Ansprache ("du").
- Genau 5 bis 6 Fragen.
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

    const prompt = `${instruktion}

KONTEXT DER EINHEIT (als JSON):
${JSON.stringify(kontext, null, 2)}

TECHNISCHE AUSGABE-VORGABE (von der Vorschau-/Export-Komponente erzwungen, NICHT verhandelbar):
- Genau 5 bis 6 Fragen.
- Jede Frage hat ein 'links_label' (UNSICHERER Pol) und ein 'rechts_label' (SICHERER Pol) – diese Polung ist zwingend.
- Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.`;

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