/**
 * generateBildbeschriftungVorschlag
 *
 * Dialogischer KI-Assistent für die Aktivität „Bildbeschriftung":
 * Die Lehrkraft lädt eine fertige Vorlage hoch (z. B. eine Karte, in der die
 * Bundesstaaten schon beschriftet sind), beschreibt, welche Begriffe zugeordnet
 * werden sollen — die KI analysiert das Bild und schlägt Zielbegriffe inkl.
 * Position (Prozentkoordinaten) und Distraktoren vor.
 *
 * Dialogisch: Über `vorherigerVorschlag` + `feedback` kann die Lehrkraft
 * nachschärfen („du hast einen Bundesstaat vergessen").
 *
 * Optional (`bildBereinigen`): Es wird zusätzlich versucht, eine Variante des
 * Bildes OHNE die Beschriftungen zu erzeugen, damit die Lösung nicht im Bild
 * steht. Das Ergebnis ist ein Vorschlag — die Lehrkraft entscheidet.
 *
 * Payload:
 *   { bildUrl, beschreibung?, vorherigerVorschlag?, feedback?, bildBereinigen? }
 * Antwort:
 *   { aufgabenstellung, dropZones: [{label, x_percent, y_percent}], distractors, hinweis, bereinigtesBildUrl? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SCHEMA = {
  type: 'object',
  properties: {
    aufgabenstellung: { type: 'string' },
    dropZones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          x_percent: { type: 'number' },
          y_percent: { type: 'number' },
        },
        required: ['label', 'x_percent', 'y_percent'],
      },
    },
    distractors: { type: 'array', items: { type: 'string' } },
    hinweis: { type: 'string' },
  },
  required: ['dropZones'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const bildUrl = body?.bildUrl;
    if (!bildUrl) return Response.json({ error: 'bildUrl fehlt' }, { status: 400 });

    const beschreibung = (body?.beschreibung || '').trim();
    const feedback = (body?.feedback || '').trim();
    const vorher = body?.vorherigerVorschlag || null;
    const bildBereinigen = body?.bildBereinigen === true;

    let prompt = `Du hilfst einer Lehrkraft, aus einem bereits beschrifteten Bild eine interaktive Bildbeschriftungs-Aufgabe zu machen.

Analysiere das beigefügte Bild sorgfältig. Finde alle Elemente, die die Schüler:innen später zuordnen sollen, und gib für jedes einen Zielbegriff mit Position an.

Regeln für die Koordinaten:
- x_percent und y_percent sind Prozentwerte vom LINKEN bzw. OBEREN Bildrand (0–100) und bezeichnen den MITTELPUNKT der Zielstelle.
- Setze die Position genau dorthin, wo der Begriff im Bild steht bzw. wo das gemeinte Gebiet/Element liegt.
- Verwende exakt die Schreibweise, die im Bild steht (bzw. die fachlich korrekte Bezeichnung).
- Keine Dopplungen, keine Begriffe, die nicht im Bild vorkommen.

Zusätzlich:
- "aufgabenstellung": eine kurze, schülergerechte deutsche Arbeitsanweisung.
- "distractors": 2–4 plausible, aber FALSCHE Begriffe, die thematisch passen (nicht im Bild vorhanden).
- "hinweis": ein kurzer Satz an die Lehrkraft, worauf sie beim Prüfen achten sollte (z. B. unsichere Positionen).

Antworte auf Deutsch.`;

    if (beschreibung) {
      prompt += `\n\nVorgabe der Lehrkraft, welche Begriffe zugeordnet werden sollen:\n"${beschreibung}"\nHalte dich strikt daran: Nimm nur die genannten Kategorien auf, alles andere ignorieren.`;
    }

    if (vorher && feedback) {
      prompt += `\n\nDies ist eine Überarbeitung. Dein vorheriger Vorschlag war:\n${JSON.stringify(vorher)}\n\nRückmeldung der Lehrkraft:\n"${feedback}"\n\nErstelle den vollständigen, korrigierten Vorschlag (alle Begriffe erneut ausgeben, nicht nur die Änderungen).`;
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [bildUrl],
      response_json_schema: SCHEMA,
    });

    const zones = Array.isArray(result?.dropZones) ? result.dropZones : [];
    const clean = zones
      .filter((z) => z && String(z.label || '').trim())
      .map((z) => ({
        label: String(z.label).trim(),
        x_percent: Math.max(0, Math.min(100, Number(z.x_percent) || 50)),
        y_percent: Math.max(0, Math.min(100, Number(z.y_percent) || 50)),
      }));

    let bereinigtesBildUrl = null;
    let bereinigungsFehler = null;
    if (bildBereinigen && clean.length > 0) {
      try {
        const labels = clean.map((z) => z.label).join(', ');
        const img = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `Bearbeite das beigefügte Bild: Entferne ausschließlich die eingezeichneten Textbeschriftungen (${labels}) restlos, sodass an ihrer Stelle nur der ursprüngliche Hintergrund (Fläche, Farbe, Muster) zu sehen ist. Alle übrigen Bildinhalte – Umrisse, Grenzen, Linien, Symbole, Farben, Städte-Punkte und sonstige Texte – müssen exakt unverändert und an identischer Position bleiben. Verändere weder Bildausschnitt, Seitenverhältnis noch Perspektive.`,
          existing_image_urls: [bildUrl],
        });
        bereinigtesBildUrl = img?.url || null;
      } catch (e) {
        bereinigungsFehler = e?.message || 'Bildbereinigung fehlgeschlagen.';
      }
    }

    return Response.json({
      aufgabenstellung: result?.aufgabenstellung || '',
      dropZones: clean,
      distractors: (Array.isArray(result?.distractors) ? result.distractors : [])
        .map((d) => String(d || '').trim())
        .filter(Boolean),
      hinweis: result?.hinweis || '',
      bereinigtesBildUrl,
      bereinigungsFehler,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}