import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * aufgabenFormatVorschlag
 * ───────────────────────
 * Sucht ein passendes Aufgabenformat für das, was eine Lehrkraft vorhat —
 * in ZWEI Beständen:
 *
 *   1. Aktivitätenkatalog (unsere Standardformate: Lückentext, Zuordnung …)
 *   2. Interne Aufgabengalerie (freigegebene, in der Werkstatt entstandene
 *      HTML-Formate)
 *
 * Beide zusammen, weil die Lehrkraft die Unterscheidung nicht treffen muss:
 * Sie beschreibt ihr Vorhaben, und es zählt nur, ob es dafür schon eine
 * erprobte Mechanik gibt. Wo die herkommt, entscheidet danach die App.
 *
 * BEWUSST GENÜGSAM: Übergeben werden nur Name und Beschreibung — NIE das HTML.
 * Das hält den Abgleich billig und schnell; das Fragment lädt die App erst,
 * wenn die Lehrkraft ein Format ausgewählt hat.
 *
 * Request  (POST): { beschreibung }
 * Response:        { treffer: [{ art:'katalog'|'galerie', id, name,
 *                                fragment?, begruendung, passung }] }  (max 4)
 */

const MAX_TREFFER = 4;

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

    const [formateRoh, katalogRoh] = await Promise.all([
      base44.asServiceRole.entities.AufgabenFormat.filter({ status: 'freigegeben' }).catch(() => []),
      base44.asServiceRole.entities.AktivitaetenKatalog.filter({ is_active: true }).catch(() => []),
    ]);

    // Galerie-Formate ohne Beschreibung sind für den Abgleich wertlos.
    // Katalogformate dürfen ohne Beschreibung mitlaufen — ihr Name ist
    // aussagekräftig („Lückentext"), und sie sind der verlässlichere Weg.
    const formate = (formateRoh || []).filter((f) => String(f?.beschreibung || '').trim());
    // „Offene Aufgabe" ist im Katalog KEIN Format, sondern der Auftrag, eines zu
    // bauen. Als Vorschlag wäre sie immer die passende Antwort und würde jedes
    // echte Format verdrängen — genau deshalb fragt der Assistent hier nach
    // Formaten und bietet den Neubau separat als eigenen Weg an.
    const katalog = (katalogRoh || []).filter(
      (k) => String(k?.name || '').trim() && !/offene\s+aufgabe/i.test(String(k.name)),
    );
    if (formate.length === 0 && katalog.length === 0) return Response.json({ treffer: [] });

    const zeile = (praefix, id, name, text) =>
      `[${praefix}:${id}] ${name}\n   ${String(text || 'Keine Beschreibung hinterlegt.').slice(0, 700)}`;

    const katalogListe = katalog
      .map((k) => zeile('K', k.id, k.name, k.beschreibung))
      .join('\n') || '(keine)';
    const galerieListe = formate
      .map((f) => zeile('G', f.id, f.name, f.beschreibung))
      .join('\n') || '(keine)';

    const prompt = `Eine Lehrkraft möchte eine Aufgabe für Schüler:innen erstellen und beschreibt ihr Vorhaben. Prüfe, welche der vorhandenen Aufgabenformate dafür taugen.

VORHABEN DER LEHRKRAFT:
${beschreibung}

A) STANDARDFORMATE AUS DEM AKTIVITÄTENKATALOG:
${katalogListe}

B) FORMATE AUS DER AUFGABENGALERIE:
${galerieListe}

REGELN:
- Es geht um die MECHANIK, nicht um den Inhalt. Ein Format zum Markieren von Textstellen passt für jedes Fach und jedes Thema — der Inhalt wird später eingesetzt.
- Nenne höchstens ${MAX_TREFFER} Formate, das beste zuerst. Beide Bestände sind gleichwertig; bei gleicher Passung nenne das Standardformat zuerst, weil es verlässlicher ist.
- Nenne NUR Formate, die die Lehrkraft wirklich weiterbringen. Passt keines, gib eine leere Liste zurück. Ein unpassender Vorschlag kostet die Lehrkraft mehr Zeit als keiner.
- "passung": "hoch" = macht genau das, was beschrieben wurde. "mittel" = andere Mechanik, aber für dieses Vorhaben brauchbar.
- "begruendung": EIN Satz an die Lehrkraft, warum dieses Format zu ihrem Vorhaben passt. Sprich über den Unterricht, nicht über Technik.
- Verwende als "id" ausschließlich die Kennung in eckigen Klammern, zeichengenau MIT Präfix (z. B. "K:abc123" oder "G:def456").`;

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

    // Nur echte Formate durchlassen; Name und Fragment kommen aus der
    // Datenbank. Was das Modell an Namen zurückgibt, ist unerheblich, und eine
    // erfundene Kennung darf nicht als Treffer erscheinen.
    const katalogById = new Map(katalog.map((k) => [String(k.id), k]));
    const formatById = new Map(formate.map((f) => [String(f.id), f]));

    const treffer = (antwort?.treffer || [])
      .map((t) => {
        const roh = String(t?.id || '').trim();
        const begruendung = String(t?.begruendung || '').trim();
        const passung = t?.passung === 'hoch' ? 'hoch' : 'mittel';

        if (roh.startsWith('K:')) {
          const k = katalogById.get(roh.slice(2));
          if (!k) return null;
          return { art: 'katalog', id: k.id, name: k.name, beschreibung: k.beschreibung || '', begruendung, passung };
        }
        if (roh.startsWith('G:')) {
          const f = formatById.get(roh.slice(2));
          if (!f) return null;
          return { art: 'galerie', id: f.id, name: f.name, fragment: f.fragment, begruendung, passung };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, MAX_TREFFER);

    return Response.json({ treffer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}