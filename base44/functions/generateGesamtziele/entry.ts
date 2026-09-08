import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * generateGesamtziele
 * ───────────────────
 * Entwickelt aus der FERTIGEN Einheit maximal fünf Gesamtziele — die
 * Formulierungen, die später in einem Lernentwicklungsbericht stehen können.
 *
 * Grundlage sind bewusst NICHT die Aufgabeninhalte im Detail, sondern die
 * Gliederung der Einheit (Themenfelder, Lernpakete) und die dort eingetragenen
 * Lernzielformulierungen. Gesamtziele sind Dach-Ziele: aus vielen kleinen
 * Lernzielen werden wenige, die den Kern der Einheit abdecken.
 *
 * Schreibt NICHTS. Payload: { einheit_id } → { vorschlaege: [{ ziel, deckt_ab[] }] }
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const einheitId = String(body.einheit_id || '').trim();
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const einheit = await base44.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const [themenfelder, pakete, aufgaben] = await Promise.all([
      base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
      base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
      base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }).catch(() => []),
    ]);

    const aktivePakete = (pakete || []).filter((p) => p.sync_status !== 'to_delete');
    const zielListen = await Promise.all(
      aktivePakete.map((p) => base44.entities.Lernziele.filter({ lernpaket_id: p.id }).catch(() => [])),
    );
    const zieleJePaket = new Map(aktivePakete.map((p, i) => [p.id, zielListen[i] || []]));

    // ── Gliederung als Text ──────────────────────────────────────────────
    const bloecke = [];
    for (const tf of (themenfelder || []).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))) {
      const eigene = aktivePakete
        .filter((p) => p.themenfeld_id === tf.id)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
      const zeilen = eigene.map((p) => {
        const ziele = (zieleJePaket.get(p.id) || [])
          .map((z) => `      • ${z.formulierung_fachsprache || z.schueler_uebersetzung || ''}`)
          .filter((s) => s.trim().length > 8);
        return `   – Lernpaket: ${p.titel_des_pakets}\n${zeilen.length ? ziele.join('\n') : '      (ohne eingetragene Lernziele)'}`;
      });
      bloecke.push(
        `THEMENFELD: ${tf.titel}${tf.leitfrage ? `\n   Leitfrage: ${tf.leitfrage}` : ''}\n${zeilen.join('\n') || '   (noch keine Lernpakete)'}`,
      );
    }

    const ohneThemenfeld = aktivePakete.filter((p) => !p.themenfeld_id);
    if (ohneThemenfeld.length) {
      bloecke.push(`OHNE THEMENFELD:\n${ohneThemenfeld.map((p) => `   – ${p.titel_des_pakets}`).join('\n')}`);
    }

    const aufgabenTitel = (aufgaben || [])
      .filter((a) => a.sync_status !== 'to_delete' && a.titel)
      .slice(0, 40)
      .map((a) => `   – ${a.titel} (Ebene ${a.anforderungsebene || '?'})`);
    if (aufgabenTitel.length) bloecke.push(`ÜBERGREIFENDE AUFGABEN:\n${aufgabenTitel.join('\n')}`);

    if (bloecke.length === 0) {
      return Response.json({ vorschlaege: [], hinweis: 'Die Einheit enthält noch keine Themenfelder oder Lernpakete.' });
    }

    const prompt = `Du bist eine erfahrene Lehrkraft und formulierst die GESAMTZIELE einer fertigen Unterrichtseinheit — genau die wenigen Sätze, die in einem Lernentwicklungsbericht zu dieser Einheit stehen könnten.

RAHMEN
- Fach: ${einheit.fach || 'unbekannt'}, Jahrgangsstufe ${einheit.jahrgangsstufe || 'unbekannt'}
- Einheit: "${einheit.titel_der_einheit || ''}"
${(einheit.gesamtziele || []).length ? `- Bereits gesetzte Gesamtziele (dürfen ersetzt/geschärft werden):\n${einheit.gesamtziele.map((g) => `   • ${g}`).join('\n')}` : ''}

AUFBAU DER EINHEIT (Themenfelder, Lernpakete und ihre kleinteiligen Lernziele):
${bloecke.join('\n\n')}

WAS EIN GESAMTZIEL IST
- Ein DACH-Ziel über viele kleine Lernziele hinweg: es bringt auf den Punkt, was ein Schüler am Ende dieser Einheit kann.
- Es orientiert sich in der Regel an den Themenfeldern, muss das aber nicht.
- Formulierung in der Du-Form, beginnend mit "Du kannst …" — schlicht, verständlich für Eltern und Schüler, ohne Fachjargon-Kette.
- Kein Verweis auf Aufgabenformate, Moodle, Materialien oder Arbeitsschritte.

DEINE AUFGABE
Formuliere HÖCHSTENS 5 Gesamtziele — lieber 3 als 5, wenn drei den Kern schon abdecken. Zusammen sollen sie den Großteil dessen abdecken, was die Schüler in dieser Einheit lernen. Keine Doppelungen, keine Nebensächlichkeiten.
Pro Vorschlag:
- "ziel": der vollständige Satz, beginnend mit "Du kannst ".
- "deckt_ab": 1–3 kurze Verweise auf die Themenfelder/Lernpakete, die dieses Ziel zusammenfasst.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          vorschlaege: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ziel: { type: 'string' },
                deckt_ab: { type: 'array', items: { type: 'string' } },
              },
              required: ['ziel'],
            },
          },
        },
        required: ['vorschlaege'],
      },
    });

    const vorschlaege = (Array.isArray(result?.vorschlaege) ? result.vorschlaege : [])
      .map((v) => ({
        ziel: String(v?.ziel || '').trim(),
        deckt_ab: Array.isArray(v?.deckt_ab) ? v.deckt_ab : [],
      }))
      .filter((v) => v.ziel.length > 5)
      .slice(0, 5);

    return Response.json({
      vorschlaege,
      gescannt: { themenfelder: (themenfelder || []).length, lernpakete: aktivePakete.length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}