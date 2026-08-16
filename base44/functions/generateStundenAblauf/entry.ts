import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * KI-Stunden-Coach (MUG Paket 2)
 * ──────────────────────────────
 * Nimmt eine kurze Beschreibung der geplanten Stunde und schlägt einen
 * linearen Phasen-Ablauf vor (Regieblatt-Entwurf). Es wird NICHTS
 * gespeichert — die Lehrkraft übernimmt den Vorschlag bewusst im Frontend.
 *
 * payload: { stunde_id, beschreibung, dauer_gesamt }
 * returns: { vorschlag: { arbeitstitel, stundenziel, teilziele, phasen: [...] } }
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { stunde_id, beschreibung, dauer_gesamt } = body;
    if (!stunde_id || !beschreibung?.trim()) {
      return Response.json({ error: 'stunde_id und beschreibung sind erforderlich.' }, { status: 400 });
    }

    const stunde = await base44.asServiceRole.entities.Unterrichtsstunde.get(stunde_id);
    if (!stunde) return Response.json({ error: 'Unterrichtsstunde nicht gefunden.' }, { status: 404 });

    const prompt = `Du bist ein erfahrener didaktischer Coach und planst mit einer Lehrkraft EINE einzelne Unterrichtsstunde.

Rahmen:
- Fach: ${stunde.fach || 'unbekannt'}
- Jahrgangsstufe: ${stunde.jahrgangsstufe || 'unbekannt'}
- Gesamtdauer: ${dauer_gesamt || 45} Minuten
- Bisheriger Arbeitstitel: ${stunde.arbeitstitel || '(keiner)'}

Beschreibung der Lehrkraft, was in dieser Stunde passieren soll:
"""
${beschreibung.trim()}
"""

Erstelle einen realistischen, LINEAREN Stundenablauf in 3-6 Phasen.
Regeln:
- Die Summe der Phasendauern entspricht etwa der Gesamtdauer.
- Wähle für jede Phase einen passenden Typ:
  "lehrer_input" = Lehrkraft agiert (Vortrag, Unterrichtsgespräch),
  "schueler_aktivitaet" = digitale Schüleraktivität am Gerät,
  "analog" = Aufgabe ohne Gerät (Arbeitsblatt, Partnerarbeit),
  "sicherung" = Auswertung/Zwischensicherung.
- "lehrer_hinweis" ist eine knappe Regieanweisung NUR für die Lehrkraft.
- "schueler_anweisung" ist der Text, den Schüler:innen auf ihrem Gerät lesen (direkte Anrede, einfache Sprache).
- Differenzierung: "standard", "stark" (leistungsstarke Schüler:innen) und "foerderung" (Hilfestellung) — jeweils 1 kurzer Satz.
- Schreibe auf Deutsch, in normaler Groß-/Kleinschreibung, ohne Markdown.
Schlage außerdem einen prägnanten Arbeitstitel, ein Stundenziel und 2-3 Teilziele vor.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          arbeitstitel: { type: 'string' },
          stundenziel: { type: 'string' },
          teilziele: { type: 'array', items: { type: 'string' } },
          phasen: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phasenname: { type: 'string' },
                typ: { type: 'string', enum: ['lehrer_input', 'schueler_aktivitaet', 'analog', 'sicherung'] },
                dauer_minuten: { type: 'number' },
                lehrer_hinweis: { type: 'string' },
                schueler_anweisung: { type: 'string' },
                differenzierung: {
                  type: 'object',
                  properties: {
                    standard: { type: 'string' },
                    stark: { type: 'string' },
                    foerderung: { type: 'string' },
                  },
                },
              },
              required: ['phasenname', 'typ'],
            },
          },
        },
        required: ['phasen'],
      },
    });

    return Response.json({ vorschlag: result });
  } catch (error) {
    console.error('[generateStundenAblauf] Error:', error);
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 });
  }
}