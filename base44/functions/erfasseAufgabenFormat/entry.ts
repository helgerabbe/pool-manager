import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * erfasseAufgabenFormat
 * ─────────────────────
 * Nimmt eine fertig gebaute offene Aufgabe als VORSCHLAG in die interne
 * Aufgabengalerie auf — automatisch, sobald eine Lehrkraft sie übernimmt.
 *
 * WARUM AUTOMATISCH: Wer gerade eine Aufgabe gebaut hat, will weiterarbeiten
 * und nicht noch ein Formular für die Galerie ausfüllen. Würde man auf
 * freiwillige Beiträge warten, bliebe die Sammlung leer. Aufgenommen wird
 * deshalb ohne Zutun — aber nur als Vorschlag, sichtbar allein in den
 * Systemeinstellungen. Erst ein Administrator gibt frei.
 *
 * NAME UND BESCHREIBUNG werden hier gleich mit erzeugt: Ohne Beschreibung
 * würde das Format später nie gefunden (der Abgleich arbeitet nur mit ihr),
 * und ein Stapel unbenannter Vorschläge ist für die Administration nicht
 * durchzusehen. Beides bleibt änderbar.
 *
 * KEINE DUBLETTEN: Wird derselbe Schritt erneut übernommen, wird sein
 * Vorschlag aktualisiert statt ein zweiter angelegt. Aufgaben, die AUS einer
 * Galerie-Vorlage entstanden sind, schickt das Frontend gar nicht her — sie
 * würden das Format nur verdoppeln.
 *
 * Request  (POST): { fragment, aufgabe_id?, schritt_id? }
 * Response:        { erfasst: boolean, id?, grund? }
 */

const MAX_FRAGMENT_FUER_KI = 16000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fragment = String(body.fragment || '').trim();
    const aufgabeId = String(body.aufgabe_id || '').trim();
    const schrittId = String(body.schritt_id || '').trim();

    if (fragment.length < 200) {
      return Response.json({ erfasst: false, grund: 'Kein brauchbares Fragment.' });
    }

    const vorhandene = await base44.asServiceRole.entities.AufgabenFormat
      .list()
      .catch(() => []);

    // Genau dieses Fragment liegt schon in der Sammlung — nichts zu tun.
    if ((vorhandene || []).some((f) => String(f?.fragment || '').trim() === fragment)) {
      return Response.json({ erfasst: false, grund: 'Bereits vorhanden.' });
    }

    // Derselbe Schritt wurde erneut übernommen: seinen Vorschlag auf den
    // neuen Stand bringen, statt einen zweiten daneben zu legen.
    const alterVorschlag = schrittId
      ? (vorhandene || []).find((f) => f?.quelle_schritt_id === schrittId && f?.status === 'vorschlag')
      : null;

    const beschreibungKI = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Unten steht der Code einer interaktiven Übungsaufgabe für Schüler:innen. Beschreibe daraus das FORMAT — also die Mechanik, losgelöst von den konkreten Fachinhalten.

Antworte als JSON mit:
- "name": kurzer, sprechender Name der Mechanik, den Lehrkräfte verstehen (z. B. "Aussagen in Spalten zuordnen", "Textstellen markieren"). Kein Fachinhalt im Namen.
- "beschreibung": 3 bis 6 Sätze, INHALTSNEUTRAL: Was sehen die Schüler:innen, was tun sie, welche Rückmeldung bekommen sie, wofür eignet sich das Format? Nenne keine Fachbegriffe aus dem Beispielinhalt und keine Technik. Dieser Text ist die Grundlage dafür, dass das Format später gefunden wird, wenn eine Lehrkraft ihr Vorhaben beschreibt — sei deshalb genau in der Mechanik.

AUFGABE:
${fragment.slice(0, MAX_FRAGMENT_FUER_KI)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          beschreibung: { type: 'string' },
        },
        required: ['name', 'beschreibung'],
      },
    }).catch(() => null);

    const felder = {
      name: String(beschreibungKI?.name || '').trim() || 'Neues Aufgabenformat',
      beschreibung: String(beschreibungKI?.beschreibung || '').trim(),
      fragment,
      status: 'vorschlag',
      herkunft: 'poolmanager',
      quelle_aufgabe_id: aufgabeId,
      quelle_schritt_id: schrittId,
      erstellt_von: user.email,
    };

    const gespeichert = alterVorschlag
      ? await base44.asServiceRole.entities.AufgabenFormat.update(alterVorschlag.id, felder)
      : await base44.asServiceRole.entities.AufgabenFormat.create(felder);

    return Response.json({ erfasst: true, id: gespeichert?.id || alterVorschlag?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}