/**
 * generateLeseText.js
 *
 * KI-Generierung eines schülergerechten Lese-Textes für die Aktivität
 * "Text lesen". Die Lehrkraft beschreibt im Briefing, worum es im Text
 * gehen soll. Länge und Sprachniveau werden über strukturierte Parameter
 * gesteuert (kurz / mittel / lang × leichte Sprache / normal / anspruchsvoll).
 *
 * Rückgabe:
 *   { titel: string, text: string }
 *
 * Wir verwenden Claude Sonnet 4.6 — der Text muss sprachlich sauber und
 * pädagogisch sinnvoll sein. Höhere Kosten sind hier vertretbar, weil das
 * Ergebnis direkt für Schüler:innen sichtbar wird.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LAENGE_VORGABEN = {
  kurz: { woerter: '120–180 Wörter', absaetze: '1–2 Absätze' },
  mittel: { woerter: '250–400 Wörter', absaetze: '3–4 Absätze' },
  lang: { woerter: '500–700 Wörter', absaetze: '5–7 Absätze' },
};

const NIVEAU_VORGABEN = {
  leicht: 'Sehr einfache Sprache (Leichte Sprache). Kurze Sätze (max. 12 Wörter). Keine Fremdwörter ohne Erklärung. Aktivkonstruktionen. Nur ein Gedanke pro Satz.',
  normal: 'Altersangemessene, klare Sprache. Sätze mittlerer Länge. Fachbegriffe werden bei der ersten Verwendung kurz erklärt.',
  anspruchsvoll: 'Differenzierte Sprache mit komplexeren Satzstrukturen, Nebensätzen und Fachvokabular. Geeignet für leistungsstarke Schüler:innen oder ältere Jahrgangsstufen.',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      briefing = '',
      laenge = 'mittel',
      niveau = 'normal',
      fach = 'unbekannt',
      jahrgangsstufe = 'unbekannt',
      titelVorgabe = '',
    } = await req.json();

    const briefingClean = String(briefing || '').trim();
    if (!briefingClean) {
      return Response.json({ error: 'Bitte beschreibe, worum es im Text gehen soll.' }, { status: 400 });
    }
    if (briefingClean.length > 4000) {
      return Response.json({ error: 'Briefing zu lang (max. 4000 Zeichen).' }, { status: 400 });
    }

    const laengeCfg = LAENGE_VORGABEN[laenge] || LAENGE_VORGABEN.mittel;
    const niveauCfg = NIVEAU_VORGABEN[niveau] || NIVEAU_VORGABEN.normal;

    const titelHinweis = titelVorgabe?.trim()
      ? `Die Lehrkraft hat als Titel bereits "${titelVorgabe.trim()}" vorgegeben — übernimm diesen Titel exakt.`
      : 'Wähle einen kurzen, prägnanten und schülergerechten Titel (max. 8 Wörter).';

    const prompt = `Du bist ein:e erfahrene:r Pädagog:in und schreibst einen Lese-Text für Schüler:innen.

KONTEXT:
- Fach: ${fach}
- Jahrgangsstufe: ${jahrgangsstufe}

INHALTLICHES BRIEFING DER LEHRKRAFT:
${briefingClean}

ANFORDERUNGEN AN DEN TEXT:
- Länge: ca. ${laengeCfg.woerter} (${laengeCfg.absaetze}).
- Sprachniveau: ${niveauCfg}
- Der Text muss inhaltlich korrekt, didaktisch sinnvoll strukturiert und für die genannte Jahrgangsstufe angemessen sein.
- Keine Anrede ("Liebe Schüler:innen"), keine Meta-Kommentare. Schreibe direkt den fertigen Lese-Text.
- Keine Aufgaben oder Fragen am Ende — der Text dient ausschließlich zum Lesen.
- Verwende kurze, klare Absätze (durch Leerzeilen getrennt).

TITEL:
${titelHinweis}

ANTWORTFORMAT:
Liefere ein JSON-Objekt mit genau zwei Feldern:
- "titel": der Titel des Textes (String)
- "text": der vollständige Lese-Text (String, mit Absätzen durch \\n\\n getrennt)`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['titel', 'text'],
      },
    });

    const titel = String(result?.titel || '').trim();
    const text = String(result?.text || '').trim();
    if (!text) {
      return Response.json({ error: 'KI hat keinen Text zurückgegeben.' }, { status: 502 });
    }

    return Response.json({ titel, text });
  } catch (error) {
    console.error('[generateLeseText] Error:', error);
    return Response.json(
      { error: error.message || 'Interner Serverfehler bei der KI-Generierung.' },
      { status: 500 }
    );
  }
});