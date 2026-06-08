import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * generateLerntypDiagnose
 *
 * Erzeugt für das 4. Onboarding-Element „KI-Lerntyp-Diagnose" einen
 * Gesprächs-Leitfaden für Brian. Wenn der Schüler nach Einführung,
 * Fragenblock und Einstiegsdiagnose immer noch unsicher ist, welcher der
 * vier Lerntypen (Minimalist, Pragmatiker, Ehrgeizig, Passioniert) zu ihm
 * passt, kann er mit Brian sprechen. Brian stellt ein paar freundliche
 * Fragen und spricht am Ende eine Empfehlung aus.
 *
 * Ausgabe ist KEIN Quiz, sondern ein Gesprächs-Leitfaden (Reihe von
 * Leitfragen + Hinweis), den der Export 1:1 als Brian-Briefing verwendet.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, verfeinerung } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    const einheitListe = await base44.entities.Einheiten.filter({ id: einheitId });
    const einheit = Array.isArray(einheitListe) ? einheitListe[0] : null;
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
    const lernpaketTitel = (lernpakete || [])
      .filter((p) => p?.sync_status !== 'to_delete')
      .map((p) => p.titel_des_pakets)
      .filter(Boolean);

    const kontext = {
      titel: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      gesamtziele: einheit.gesamtziele || [],
      grundgeruest: einheit.grundgeruest_rohtext || '',
      lernpakete: lernpaketTitel,
    };

    const FALLBACK_INSTRUKTION = `Du erstellst einen GESPRÄCHS-LEITFADEN für den KI-Lernbegleiter „Brian". Dieses Gespräch ist das LETZTE Element der Orientierungsphase einer Unterrichtseinheit.

ZIEL: Ein Schüler, der sich nach Einführung, Selbsteinschätzung und Einstiegsdiagnose IMMER NOCH unsicher ist, welcher der vier Lerntypen zu ihm passt, kann mit Brian sprechen. Brian stellt ein paar freundliche, lockere Fragen und gibt am Ende eine Empfehlung.

DIE VIER LERNTYPEN, die Brian empfehlen kann:
- Minimalist: will zügig und fokussiert das Nötigste lernen.
- Pragmatiker: will einen ausgewogenen, strukturierten Weg mit Tempo.
- Ehrgeizig: will mehr üben, sich fordern, gut vorbereitet sein.
- Passioniert: will tief eintauchen, Projekte machen, viel begleitet werden.

REGELN:
- Sehr schülergerechte, freundliche, lockere Sprache. Direkte Ansprache ("du").
- Erstelle 4 bis 6 Leitfragen, die Brian dem Schüler stellt, um seinen Lerntyp herauszufinden (z. B. zu Tempo, Gründlichkeit, Lust auf Projekte, Sicherheitsbedürfnis).
- Die Fragen sollen locker und nicht prüfungshaft sein.
- Beziehe dich, wo es passt, leicht auf die Themen der Einheit aus dem Kontext.
- Es geht um Orientierung, nicht um Bewertung.`;

    let instruktion = FALLBACK_INSTRUKTION;
    try {
      const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_diagnose' });
      const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
      if (dbText && dbText.trim()) instruktion = dbText.trim();
    } catch (_e) {
      // Fallback bleibt aktiv.
    }

    const verfeinerungBlock = (typeof verfeinerung === 'string' && verfeinerung.trim())
      ? `\n\nZUSÄTZLICHER WUNSCH DER LEHRKRAFT (mit Vorrang berücksichtigen, aber die technische Ausgabe-Vorgabe bleibt zwingend):\n${verfeinerung.trim()}`
      : '';

    const prompt = `${instruktion}

KONTEXT DER EINHEIT (als JSON):
${JSON.stringify(kontext, null, 2)}

TECHNISCHE AUSGABE-VORGABE (von der Vorschau-/Export-Komponente erzwungen, NICHT verhandelbar):
- 4 bis 6 Leitfragen für das Brian-Gespräch.
- Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.${verfeinerungBlock}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer, einladender Titel (z. B. „Sprich mit Brian über deinen Lerntyp")' },
          intro: { type: 'string', description: 'Kurzer, ermutigender Einstiegssatz: nur falls du dir noch unsicher bist.' },
          gespraechs_leitfaden: {
            type: 'array',
            description: 'Die Leitfragen, die Brian dem Schüler stellt.',
            items: {
              type: 'object',
              properties: {
                frage: { type: 'string', description: 'Eine lockere Leitfrage' },
                ziel: { type: 'string', description: 'Wozu die Frage dient (für Brian, kurz)' },
              },
              required: ['frage'],
            },
          },
          hinweis: { type: 'string', description: 'Kurzer Abschluss-Hinweis: Brian gibt nur eine Empfehlung, die Entscheidung bleibt beim Schüler.' },
        },
        required: ['titel', 'intro', 'gespraechs_leitfaden'],
      },
    });

    return Response.json({ diagnose: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});