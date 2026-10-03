/**
 * unterrichtVerlaufPlanen — Schritt 2 der Unterrichtsplanung.
 * Verteilt die ausgewählten Inhalte auf die vorhandenen Einzel- (40 Min. netto)
 * und Doppelstunden (85 Min. netto). Mit `wunsch` wird der bestehende Verlauf
 * im Gespräch angepasst. Payload: { planung_id, wunsch? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { unwrapLLM } from '../../shared/llmUtils.js';
import { ladePlanung, NETTO_MINUTEN } from '../../shared/unterrichtsPlanung.js';

const VERLAUF_SCHEMA = {
  type: 'object',
  properties: {
    antwort: { type: 'string' },
    stunden: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          minuten: { type: 'number' },
          zeit_text: { type: 'string' },
          titel: { type: 'string' },
          uebung_empfohlen: { type: 'boolean' },
          uebung_hinweis: { type: 'string' },
          lernziel: { type: 'string' },
          vorschlag: { type: 'string' },
          inhalte: { type: 'array', items: { type: 'string' } },
        },
        required: ['minuten', 'titel', 'lernziel', 'vorschlag'],
      },
    },
  },
  required: ['antwort', 'stunden'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { planung, ue, fehler } = await ladePlanung(base44, user, body?.planung_id);
    if (fehler) return fehler;

    const einzel = Number(planung.einzelstunden) || 0;
    const doppel = Number(planung.doppelstunden) || 0;
    if (einzel + doppel === 0) return Response.json({ error: 'Bitte zuerst Einzel- und/oder Doppelstunden angeben.' }, { status: 400 });
    const auswahl = (planung.inhalte || []).filter((i) => i.prioritaet !== 'raus');
    if (!auswahl.length) return Response.json({ error: 'Es ist kein Inhalt ausgewählt.' }, { status: 400 });

    const wunsch = String(body?.wunsch || '').trim();
    const neuBerechnen = !!body?.neu_berechnen;
    const budget = einzel * NETTO_MINUTEN.einzel + doppel * NETTO_MINUTEN.doppel;
    const gespraech = [...(planung.gespraech || []), ...(wunsch ? [{ role: 'user', content: wunsch }] : body?.neu_berechnen ? [{ role: 'user', content: 'Bitte nach meinen Gewichtungen neu berechnen.' }] : [])];

    const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: JSON.stringify({
        rolle: 'Du bist eine erfahrene Lehrkraft und Fachdidaktikerin und planst mit einer Kollegin den Verlauf einer Unterrichtseinheit. Antworte nur mit JSON nach Schema, auf Deutsch.',
        kontext: {
          fach: ue?.fach, jahrgangsstufe: ue?.jahrgangsstufe, thema: planung.thema,
          leitidee: planung.fundament?.leitidee, stolpersteine: planung.fundament?.stolpersteine,
          zeitbudget: { einzelstunden: einzel, doppelstunden: doppel, netto_minuten: NETTO_MINUTEN },
          inhalte: auswahl.map((i) => ({ titel: i.titel, beschreibung: i.beschreibung, prioritaet: i.prioritaet, minuten: i.minuten })),
          bisheriger_verlauf: planung.verlauf || [],
          gespraech,
        },
        auftrag: neuBerechnen
          ? 'Berechne die Zeitverteilung neu nach den Gewichtungen der Lehrkraft im bisherigen Verlauf: gewichtung "wichtiger" = deutlich mehr Zeit, "weniger" = weniger Zeit (knapper, ggf. in eine Übung auslagern), "passt" oder leer = Zeit möglichst beibehalten. Behalte Abschnitte und Reihenfolge bei; verschiebe nur Zeit, damit das Budget aufgeht.'
          : wunsch
            ? 'Passe den bisherigen Verlauf gemäß der letzten Nachricht der Lehrkraft an. Ändere nur, was nötig ist.'
            : 'Erstelle den Verlauf der Einheit als geordnete Folge von Abschnitten (erstens, zweitens, …) mit je einem Zeitvorschlag.',
        regeln: [
          `Gesamtbudget: ${budget} Minuten (${einzel} Einzelstunden à 40 Min., ${doppel} Doppelstunden à 85 Min.). Die Summe aller minuten muss ungefähr ${budget} ergeben und mit den Stundenblöcken umsetzbar sein.`,
          'Ein Abschnitt ist eine inhaltliche Einheit, KEINE Stundennummer. minuten: geplante Zeit (z. B. 40, 80, 85, 125). zeit_text: wie du die Zeit nutzen würdest, kurz, z. B. "1 Einzelstunde", "2 × 40 Min.", "1 Doppelstunde", "40 Min. + Übung".',
          'Alle Inhalte mit prioritaet "muss" kommen vor. "vielleicht"-Inhalte nur, wenn Zeit bleibt — sonst in "antwort" nennen, was weggefallen ist.',
          'Plane realistisch: Erarbeitung–Übung–Sicherung braucht Zeit. Plane Übungs- und Wiederholungszeit ein, gegen Ende ggf. eine Sicherung/Überprüfung.',
          'uebung_empfohlen: true, wenn die Unterrichtszeit hier knapp ist und eine ausgelagerte selbstständige Übung (Poolzeit/Hausaufgabe) sinnvoll wäre. uebung_hinweis: dann EIN Satz, was die Schüler üben sollten; sonst leer.',
          'titel: kurzer Titel. lernziel: EIN Satz "Die Schüler können …". vorschlag: 1–2 Sätze zur Gestaltung. inhalte: Titel der behandelten Inhalte aus der Liste.',
          'antwort: 1–3 Sätze an die Lehrkraft (was du gemacht hast, was weggefallen ist, wo es eng wird).',
        ],
      }),
      model: 'claude-sonnet-5',
      response_json_schema: VERLAUF_SCHEMA,
    });
    const ergebnis = unwrapLLM(antwort);
    const stunden = Array.isArray(ergebnis?.stunden) ? ergebnis.stunden : [];
    if (!stunden.length) return Response.json({ error: 'Der Verlauf war leer. Bitte erneut versuchen.' }, { status: 502 });

    const verlauf = stunden.map((s, i) => ({
      nr: i + 1,
      minuten: Number(s.minuten) || 0,
      zeit_text: String(s.zeit_text || ''),
      titel: String(s.titel || ''), lernziel: String(s.lernziel || ''), vorschlag: String(s.vorschlag || ''),
      inhalte: Array.isArray(s.inhalte) ? s.inhalte.map(String) : [],
      gewichtung: 'passt',
      uebung_empfohlen: !!s.uebung_empfohlen,
      uebung_hinweis: String(s.uebung_hinweis || ''),
    }));

    const aktualisiert = await base44.asServiceRole.entities.UnterrichtsPlanung.update(planung.id, {
      verlauf,
      gespraech: [...gespraech, { role: 'assistant', content: String(ergebnis.antwort || '') }],
    });
    return Response.json({ planung: aktualisiert });
  } catch (error) {
    console.error('[unterrichtVerlaufPlanen]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}