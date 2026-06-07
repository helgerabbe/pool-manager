import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * generateEinheitEinfuehrung
 *
 * Erzeugt eine schülergerechte „Kurze Einführung in die Einheit" für die
 * Dashboard-Vorschau. Sammelt möglichst viel Einheits-Kontext (Titel, Fach,
 * Jahrgang, Gesamtziele, Grundgerüst, Lernpaket-Titel, Lernziele) und lässt
 * die KI daraus eine kurze, motivierende Einführung in sehr einfacher Sprache
 * formulieren – inkl. Prompt für ein Comic-Bild.
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
    const FALLBACK_INSTRUKTION = `Du erstellst eine kurze, motivierende EINFÜHRUNG in eine Unterrichtseinheit – direkt an die Schülerinnen und Schüler gerichtet.

ZIEL: Die Schüler:innen sollen nach dem Lesen ein Gefühl dafür haben, worum es in dieser Einheit geht und was sie erwartet – damit sie selbst einschätzen können, wie tief sie einsteigen möchten (Lerntyp-Wahl).

REGELN:
- Sehr schülergerechte, einfache, freundliche Sprache. Direkte Ansprache ("du").
- Kurz und ansprechend, nicht belehrend. Wecke Neugier.
- Erkläre konkret: Worum geht es? Was wirst du hier machen/lernen? Warum ist das spannend oder nützlich?
- Nutze gerne kleine, passende Emojis als Veranschaulichung.
- KEINE erfundenen Fakten, die dem Kontext widersprechen.
- Liefere zusätzlich einen englischen Bild-Prompt für eine fröhliche, kindgerechte Comic-Illustration (flat, bunt, freundlich), die zum Thema passt.`;

    let instruktion = FALLBACK_INSTRUKTION;
    try {
      const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_sec0_overview' });
      const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
      if (dbText && dbText.trim()) instruktion = dbText.trim();
    } catch (_e) {
      // Fallback bleibt aktiv.
    }

    const prompt = `${instruktion}

KONTEXT DER EINHEIT (als JSON):
${JSON.stringify(kontext, null, 2)}

Hinweis: Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer, einladender Titel der Einführung' },
          intro: { type: 'string', description: 'Ein motivierender Einstiegssatz (1-2 Sätze)' },
          abschnitte: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                emoji: { type: 'string' },
                ueberschrift: { type: 'string' },
                text: { type: 'string' },
              },
            },
          },
          bild_prompt: { type: 'string', description: 'Englischer Prompt für eine Comic-Illustration' },
        },
        required: ['titel', 'intro', 'abschnitte', 'bild_prompt'],
      },
    });

    return Response.json({ einfuehrung: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});