import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * aufgabenFormatVorschlag
 * ───────────────────────
 * Sucht in der INTERNEN Aufgabengalerie nach Formaten, die zu dem passen, was
 * eine Lehrkraft vorhat.
 *
 * BEWUSST GENÜGSAM: Übergeben werden nur Name und Beschreibung der
 * freigegebenen Formate — NIE deren HTML. Das hält den Abgleich billig und
 * schnell, auch bei vielen Formaten; das HTML lädt die App erst, wenn die
 * Lehrkraft ein Format ausgewählt hat.
 *
 * Formate ohne Beschreibung werden übersprungen: Sie sind für den Abgleich
 * wertlos und würden nur Rauschen erzeugen.
 *
 * Request  (POST): { beschreibung }
 * Response:        { treffer: [{ id, name, begruendung, passung }] }  (max 3)
 */

const MAX_TREFFER = 3;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const beschreibung = String(body.beschreibung || '').trim();
    if (!beschreibung) {
      return Response.json({ error: 'beschreibung ist erforderlich.' }, { status: 400 });
    }

    const alle = await base44.asServiceRole.entities.AufgabenFormat
      .filter({ status: 'freigegeben' })
      .catch(() => []);

    const kandidaten = (alle || []).filter((f) => String(f?.beschreibung || '').trim());
    if (kandidaten.length === 0) return Response.json({ treffer: [] });

    const liste = kandidaten
      .map((f, i) => `${i + 1}. [${f.id}] ${f.name}\n   ${String(f.beschreibung).slice(0, 800)}`)
      .join('\n');

    const prompt = `Eine Lehrkraft möchte eine interaktive Übungsaufgabe für Schüler:innen erstellen und beschreibt ihr Vorhaben. Prüfe, welche der vorhandenen Aufgabenformate dafür taugen.

VORHABEN DER LEHRKRAFT:
${beschreibung}

VORHANDENE AUFGABENFORMATE:
${liste}

REGELN:
- Es geht um die MECHANIK, nicht um den Inhalt. Ein Format zum Markieren von Textstellen passt für jedes Fach und jedes Thema — der Inhalt wird später eingesetzt.
- Nenne höchstens ${MAX_TREFFER} Formate, das beste zuerst.
- Nenne NUR Formate, die die Lehrkraft wirklich weiterbringen. Passt keines, gib eine leere Liste zurück. Ein unpassender Vorschlag kostet die Lehrkraft mehr Zeit als keiner.
- "passung": "hoch" = macht genau das, was beschrieben wurde. "mittel" = andere Mechanik, aber für dieses Vorhaben brauchbar.
- "begruendung": EIN Satz an die Lehrkraft, warum dieses Format zu ihrem Vorhaben passt. Sprich über den Unterricht, nicht über Technik.
- Verwende als "id" ausschließlich die Kennung in eckigen Klammern, zeichengenau.`;

    const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          treffer: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                begruendung: { type: 'string' },
                passung: { type: 'string', enum: ['hoch', 'mittel'] },
              },
              required: ['id'],
            },
          },
        },
        required: ['treffer'],
      },
    });

    // Nur echte Formate durchlassen und Name/Fragment aus der Datenbank
    // nehmen — was das Modell an Namen zurückgibt, ist unerheblich, und eine
    // erfundene Kennung darf nicht als Treffer erscheinen.
    const nachId = new Map(kandidaten.map((f) => [String(f.id), f]));
    const treffer = (antwort?.treffer || [])
      .map((t) => {
        const f = nachId.get(String(t?.id || '').trim());
        if (!f) return null;
        return {
          id: f.id,
          name: f.name,
          fragment: f.fragment,
          begruendung: String(t.begruendung || '').trim(),
          passung: t.passung === 'hoch' ? 'hoch' : 'mittel',
        };
      })
      .filter(Boolean)
      .slice(0, MAX_TREFFER);

    return Response.json({ treffer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}