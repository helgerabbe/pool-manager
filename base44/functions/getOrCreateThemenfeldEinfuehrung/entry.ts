import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getOrCreateThemenfeldEinfuehrung
 *
 * Single-Source-of-Truth-Zugriff auf die schülergerechte „Einführung in das
 * Themenfeld" (System-Baustein sys_einfuehrung im Lernpfad).
 *
 * Ablauf:
 *  1. Existiert bereits ein SchuelerInhaltSnapshot für (einheit_id, lerntyp,
 *     instance_id)? → SOFORT zurückgeben (schnell, kein KI-Call).
 *  2. Sonst: einmalig per KI generieren (schülernah, mit Symbolen + Bild),
 *     als Snapshot speichern und zurückgeben. So generiert garantiert nur EINER.
 *
 * Schreibt zentral für ALLE Schüler. Überschreiben passiert über separate
 * „Übernehmen"-Pfade (Lehrer-Tool / Export-Center), nicht hier.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, lerntyp, instanceId, themenfeldId, force } = await req.json();
    if (!einheitId || !lerntyp || !instanceId) {
      return Response.json({ error: 'einheitId, lerntyp und instanceId sind erforderlich' }, { status: 400 });
    }

    // ── 1. Vorhandenen Snapshot prüfen (Single Source of Truth) ──────────
    const vorhandene = await base44.asServiceRole.entities.SchuelerInhaltSnapshot.filter({
      einheit_id: einheitId,
      lerntyp,
      instance_id: instanceId,
    });
    const existing = Array.isArray(vorhandene) ? vorhandene[0] : null;
    if (existing && !force) {
      return Response.json({ inhalt: existing.inhalt, snapshotId: existing.id, cached: true });
    }

    // ── 2. Kontext für die KI sammeln ────────────────────────────────────
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    let themenfeldTitel = '';
    let themenfeldBeschreibung = '';
    if (themenfeldId) {
      try {
        const tf = await base44.asServiceRole.entities.Themenfeld.get(themenfeldId);
        themenfeldTitel = tf?.titel || '';
        themenfeldBeschreibung = tf?.beschreibung || '';
      } catch (_e) {
        // Themenfeld optional – ohne Kontext geht es auch.
      }
    }

    let lernpaketTitel = [];
    try {
      const lernpakete = themenfeldId
        ? await base44.asServiceRole.entities.Lernpakete.filter({ themenfeld_id: themenfeldId })
        : await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });
      lernpaketTitel = (lernpakete || [])
        .filter((p) => p?.sync_status !== 'to_delete')
        .map((p) => p.titel_des_pakets)
        .filter(Boolean);
    } catch (_e) {
      lernpaketTitel = [];
    }

    const kontext = {
      einheit: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      themenfeld: themenfeldTitel,
      themenfeld_beschreibung: themenfeldBeschreibung,
      lernpakete: lernpaketTitel,
      grundgeruest: einheit.grundgeruest_rohtext || '',
    };

    // Didaktische Anweisung aus der Verwaltung (Single Source of Truth),
    // mit bewährtem Fallback.
    const FALLBACK_INSTRUKTION = `Du erstellst eine kurze, schülernahe EINFÜHRUNG IN EIN THEMENFELD – direkt an die Schülerinnen und Schüler gerichtet.

ZIEL: Die Schüler:innen sollen auf EINEN BLICK verstehen, worum es in diesem Themenfeld geht und was sie hier lernen. Das ist ein Ort, an den sie auch später immer wieder zurückkehren können.

REGELN:
- Sehr schülergerechte, EINFACHE Sprache. KURZE Sätze. Direkte Ansprache ("du").
- SEHR KURZ HALTEN: alles zusammen maximal 90 Wörter. Lieber weniger.
- 2 bis 4 kurze Abschnitte, jeder nur 1-2 kurze Sätze.
- Strukturiere mit Symbolen: jeder Abschnitt bekommt ein passendes Emoji, damit es NICHT wie ein Fließtext aussieht, sondern wie eine übersichtliche, motivierende Karte.
- Erkläre konkret: Worum geht es? Was wirst du hier machen/lernen? Warum ist das spannend oder nützlich?
- KEINE erfundenen Fakten, die dem Kontext widersprechen.
- Liefere zusätzlich einen englischen Bild-Prompt für eine fröhliche, kindgerechte Comic-Illustration (flat, bunt, freundlich), die zum Themenfeld passt.`;

    let instruktion = FALLBACK_INSTRUKTION;
    try {
      const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_themenfeld_intro' });
      const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
      if (dbText && dbText.trim()) instruktion = dbText.trim();
    } catch (_e) {
      // Fallback bleibt aktiv.
    }

    const prompt = `${instruktion}

KONTEXT (als JSON):
${JSON.stringify(kontext, null, 2)}

Hinweis: Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Kurzer, einladender Titel' },
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

    // ── 3. Optionales Bild erzeugen ──────────────────────────────────────
    let bildUrl = '';
    if (result?.bild_prompt) {
      try {
        const img = await base44.integrations.Core.GenerateImage({ prompt: result.bild_prompt });
        bildUrl = img?.url || '';
      } catch (_e) {
        bildUrl = '';
      }
    }

    const inhalt = {
      titel: result.titel,
      intro: result.intro,
      abschnitte: Array.isArray(result.abschnitte) ? result.abschnitte : [],
      bild_url: bildUrl,
    };

    // ── 4. Snapshot zentral speichern (Upsert) ───────────────────────────
    const now = new Date().toISOString();
    let snapshotId;
    if (existing) {
      await base44.asServiceRole.entities.SchuelerInhaltSnapshot.update(existing.id, {
        baustein_id: 'sys_themenfeld_intro',
        themenfeld_id: themenfeldId || null,
        inhalt,
        generiert_am: now,
        generiert_von: user.email,
      });
      snapshotId = existing.id;
    } else {
      const created = await base44.asServiceRole.entities.SchuelerInhaltSnapshot.create({
        einheit_id: einheitId,
        lerntyp,
        instance_id: instanceId,
        baustein_id: 'sys_themenfeld_intro',
        themenfeld_id: themenfeldId || null,
        inhalt,
        generiert_am: now,
        generiert_von: user.email,
      });
      snapshotId = created?.id;
    }

    return Response.json({ inhalt, snapshotId, cached: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});