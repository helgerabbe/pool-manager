import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * generateInterneInhalte
 *
 * Export-Center-Trigger „Interne Inhalte erzeugen".
 *
 * Durchläuft den Lernpfad ALLER vier Lerntypen einer Einheit und erzeugt für
 * jede KI-Baustein-Instanz, die noch keinen SchuelerInhaltSnapshot besitzt,
 * einmalig einen Snapshot (Single Source of Truth). Bereits vorhandene
 * Snapshots bleiben unangetastet (Idempotenz) — es sei denn, force=true.
 *
 * Aktuell unterstützter KI-Baustein: sys_themenfeld_intro (Einführung in das
 * Themenfeld). Weitere Bausteine werden hier ergänzt, sobald sie einen
 * Generator haben — die Iteration deckt sie dann automatisch ab.
 *
 * Liefert eine Zusammenfassung zurück: { erzeugt, uebersprungen, fehler, details[] }.
 */

// Welche System-Bausteine haben einen KI-Generator? Map baustein_id → Generator-Key.
const KI_BAUSTEINE = {
  sys_themenfeld_intro: 'themenfeld_intro',
};

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

const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

async function generateThemenfeldIntro(base44, { einheit, themenfeldId, userEmail }) {
  let themenfeldTitel = '';
  let themenfeldBeschreibung = '';
  if (themenfeldId) {
    try {
      const tf = await base44.asServiceRole.entities.Themenfeld.get(themenfeldId);
      themenfeldTitel = tf?.titel || '';
      themenfeldBeschreibung = tf?.beschreibung || '';
    } catch (_e) { /* optional */ }
  }

  let lernpaketTitel = [];
  try {
    const lernpakete = themenfeldId
      ? await base44.asServiceRole.entities.Lernpakete.filter({ themenfeld_id: themenfeldId })
      : await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheit.id });
    lernpaketTitel = (lernpakete || [])
      .filter((p) => p?.sync_status !== 'to_delete')
      .map((p) => p.titel_des_pakets)
      .filter(Boolean);
  } catch (_e) { lernpaketTitel = []; }

  const kontext = {
    einheit: einheit.titel_der_einheit,
    fach: einheit.fach,
    jahrgangsstufe: einheit.jahrgangsstufe,
    themenfeld: themenfeldTitel,
    themenfeld_beschreibung: themenfeldBeschreibung,
    lernpakete: lernpaketTitel,
    grundgeruest: einheit.grundgeruest_rohtext || '',
  };

  let instruktion = FALLBACK_INSTRUKTION;
  try {
    const bausteine = await base44.asServiceRole.entities.SystemBausteine.filter({ baustein_id: 'sys_themenfeld_intro' });
    const dbText = Array.isArray(bausteine) ? bausteine[0]?.export_instruktion : null;
    if (dbText && dbText.trim()) instruktion = dbText.trim();
  } catch (_e) { /* Fallback */ }

  const prompt = `${instruktion}

KONTEXT (als JSON):
${JSON.stringify(kontext, null, 2)}

Hinweis: Schreibe in einer Sprache, die für Klasse ${einheit.jahrgangsstufe || ''} angemessen ist.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        titel: { type: 'string' },
        intro: { type: 'string' },
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
        bild_prompt: { type: 'string' },
      },
      required: ['titel', 'intro', 'abschnitte', 'bild_prompt'],
    },
  });

  let bildUrl = '';
  if (result?.bild_prompt) {
    try {
      const img = await base44.integrations.Core.GenerateImage({ prompt: result.bild_prompt });
      bildUrl = img?.url || '';
    } catch (_e) { bildUrl = ''; }
  }

  return {
    titel: result.titel,
    intro: result.intro,
    abschnitte: Array.isArray(result.abschnitte) ? result.abschnitte : [],
    bild_url: bildUrl,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, force = false } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId ist erforderlich' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    // Bestehende Snapshots der Einheit indizieren (Idempotenz).
    const vorhandene = await base44.asServiceRole.entities.SchuelerInhaltSnapshot.filter({ einheit_id: einheitId });
    const snapByKey = new Map();
    for (const s of vorhandene || []) {
      snapByKey.set(`${s.lerntyp}::${s.instance_id}`, s);
    }

    // Alle KI-Baustein-Instanzen über alle Lerntypen sammeln.
    const aufgaben = [];
    const konfig = einheit.lernpfade_konfiguration || {};
    for (const lerntyp of LERNTYPEN) {
      const sektoren = konfig[lerntyp] || [];
      for (const sektor of sektoren) {
        for (const item of sektor?.items || []) {
          if (item?.type !== 'system') continue;
          if (!KI_BAUSTEINE[item.ref_id]) continue;
          aufgaben.push({
            lerntyp,
            instanceId: item.instance_id,
            bausteinId: item.ref_id,
            themenfeldId: sektor?.themenfeld_id || null,
          });
        }
      }
    }

    const now = new Date().toISOString();
    let erzeugt = 0;
    let uebersprungen = 0;
    let fehler = 0;
    const details = [];

    for (const auf of aufgaben) {
      const key = `${auf.lerntyp}::${auf.instanceId}`;
      const existing = snapByKey.get(key);
      if (existing && !force) {
        uebersprungen += 1;
        details.push({ ...auf, status: 'uebersprungen' });
        continue;
      }
      try {
        // Aktuell nur ein Generator-Typ.
        const inhalt = await generateThemenfeldIntro(base44, {
          einheit, themenfeldId: auf.themenfeldId, userEmail: user.email,
        });
        if (existing) {
          await base44.asServiceRole.entities.SchuelerInhaltSnapshot.update(existing.id, {
            baustein_id: auf.bausteinId,
            themenfeld_id: auf.themenfeldId,
            inhalt,
            generiert_am: now,
            generiert_von: 'export_center',
          });
        } else {
          await base44.asServiceRole.entities.SchuelerInhaltSnapshot.create({
            einheit_id: einheitId,
            lerntyp: auf.lerntyp,
            instance_id: auf.instanceId,
            baustein_id: auf.bausteinId,
            themenfeld_id: auf.themenfeldId,
            inhalt,
            generiert_am: now,
            generiert_von: 'export_center',
          });
        }
        erzeugt += 1;
        details.push({ ...auf, status: 'erzeugt' });
      } catch (e) {
        fehler += 1;
        details.push({ ...auf, status: 'fehler', message: e?.message });
      }
    }

    return Response.json({
      gesamt: aufgaben.length,
      erzeugt,
      uebersprungen,
      fehler,
      details,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});