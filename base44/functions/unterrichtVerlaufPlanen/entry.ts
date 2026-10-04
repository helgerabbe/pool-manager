/**
 * unterrichtVerlaufPlanen — Schritt 3 (Verlauf) und Schritt 4 (Zeitplanung).
 * modus 'struktur' (Standard): geordnete Abschnitte OHNE Zeit; mit `wunsch` im Gespräch anpassen.
 * modus 'zeit': bestehende Abschnitte auf Einzel- (40 Min. netto) und Doppelstunden (85 Min. netto)
 *   verteilen; berücksichtigt die Gewichtungen der Lehrkraft.
 * Payload: { planung_id, modus?, wunsch? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { unwrapLLM } from '../../shared/llmUtils.js';
import { ladePlanung, NETTO_MINUTEN } from '../../shared/unterrichtsPlanung.js';

const SCHWERPUNKTE = ['erarbeitung', 'uebung', 'vertiefung', 'sicherung', 'ueberpruefung'];

const STRUKTUR_SCHEMA = {
  type: 'object',
  properties: {
    antwort: { type: 'string' },
    abschnitte: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          schwerpunkt: { type: 'string', enum: SCHWERPUNKTE },
          lernziel: { type: 'string' },
          vorschlag: { type: 'string' },
          inhalte: { type: 'array', items: { type: 'string' } },
        },
        required: ['titel', 'schwerpunkt', 'lernziel', 'vorschlag'],
      },
    },
  },
  required: ['antwort', 'abschnitte'],
};

const ZEIT_SCHEMA = {
  type: 'object',
  properties: {
    antwort: { type: 'string' },
    zeiten: {
      type: 'array',
      items: {
        type: 'object',
        properties: { nr: { type: 'number' }, minuten: { type: 'number' }, zeit_text: { type: 'string' } },
        required: ['nr', 'minuten'],
      },
    },
  },
  required: ['antwort', 'zeiten'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { planung, ue, fehler } = await ladePlanung(base44, user, body?.planung_id);
    if (fehler) return fehler;

    const modus = body?.modus === 'zeit' ? 'zeit' : 'struktur';
    const wunsch = String(body?.wunsch || '').trim();
    const gespraech = [...(planung.gespraech || []), ...(wunsch ? [{ role: 'user', content: wunsch }] : [])];
    const kontext = {
      fach: ue?.fach, jahrgangsstufe: ue?.jahrgangsstufe, thema: planung.thema,
      leitidee: planung.fundament?.leitidee, stolpersteine: planung.fundament?.stolpersteine,
    };
    const rolle = 'Du bist eine erfahrene Lehrkraft und Fachdidaktikerin und planst mit einer Kollegin eine Unterrichtseinheit. Antworte nur mit JSON nach Schema, auf Deutsch.';
    let verlauf;
    let antwortText;

    if (modus === 'struktur') {
      const auswahl = (planung.inhalte || []).filter((i) => i.prioritaet !== 'raus');
      if (!auswahl.length) return Response.json({ error: 'Es ist kein Inhalt ausgewählt.' }, { status: 400 });
      const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify({
          rolle,
          kontext: {
            ...kontext,
            inhalte: auswahl.map((i) => ({ titel: i.titel, beschreibung: i.beschreibung, prioritaet: i.prioritaet })),
            bisheriger_verlauf: (planung.verlauf || []).map(({ titel, schwerpunkt, lernziel, vorschlag, inhalte }) => ({ titel, schwerpunkt, lernziel, vorschlag, inhalte })),
            gespraech,
          },
          auftrag: wunsch
            ? 'Passe den bisherigen Verlauf gemäß der letzten Nachricht der Lehrkraft an. Ändere nur, was nötig ist.'
            : 'Erstelle den didaktischen Verlauf der Einheit als geordnete Folge von Abschnitten. KEINE Zeitplanung — die folgt später als eigener Schritt.',
          regeln: [
            'Ein Abschnitt ist eine inhaltliche Einheit, KEINE Stunde. Plane keine Minuten.',
            'Alle Inhalte mit prioritaet "muss" kommen vor; "vielleicht"-Inhalte, wo sie didaktisch passen.',
            'Plane eine sinnvolle didaktische Progression: Erarbeitung, Übung, Vertiefung, Sicherung, gegen Ende ggf. Überprüfung.',
            'schwerpunkt: der HAUPTschwerpunkt — "erarbeitung" (Neues erarbeiten), "uebung" (Üben), "vertiefung" (vertiefte Übung/Transfer), "sicherung" (Sichern), "ueberpruefung" (Lernerfolgskontrolle).',
            'titel: kurzer Titel. lernziel: EIN Satz "Die Schüler können …". vorschlag: 1–2 Sätze zur Gestaltung. inhalte: Titel der behandelten Inhalte aus der Liste.',
            'antwort: 1–3 Sätze an die Lehrkraft.',
          ],
        }),
        model: 'claude-sonnet-5',
        response_json_schema: STRUKTUR_SCHEMA,
      });
      const ergebnis = unwrapLLM(antwort);
      const abschnitte = Array.isArray(ergebnis?.abschnitte) ? ergebnis.abschnitte : [];
      if (!abschnitte.length) return Response.json({ error: 'Der Verlauf war leer. Bitte erneut versuchen.' }, { status: 502 });
      verlauf = abschnitte.map((s, i) => ({
        nr: i + 1,
        titel: String(s.titel || ''), lernziel: String(s.lernziel || ''), vorschlag: String(s.vorschlag || ''),
        inhalte: Array.isArray(s.inhalte) ? s.inhalte.map(String) : [],
        schwerpunkt: SCHWERPUNKTE.includes(s.schwerpunkt) ? s.schwerpunkt : 'erarbeitung',
        gewichtung: 'passt',
      }));
      antwortText = String(ergebnis.antwort || '');
    } else {
      const einzel = Number(planung.einzelstunden) || 0;
      const doppel = Number(planung.doppelstunden) || 0;
      if (einzel + doppel === 0) return Response.json({ error: 'Bitte zuerst Einzel- und/oder Doppelstunden angeben.' }, { status: 400 });
      const bleibende = (planung.verlauf || []).filter((s) => s.gewichtung !== 'raus');
      if (!bleibende.length) return Response.json({ error: 'Es gibt keinen Verlauf zum Verplanen.' }, { status: 400 });
      const gestrichen = (planung.verlauf || []).filter((s) => s.gewichtung === 'raus').map((s) => s.titel);
      const budget = einzel * NETTO_MINUTEN.einzel + doppel * NETTO_MINUTEN.doppel;
      const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: JSON.stringify({
          rolle,
          kontext: {
            ...kontext,
            zeitbudget: { einzelstunden: einzel, doppelstunden: doppel, netto_minuten: NETTO_MINUTEN },
            abschnitte: bleibende.map((s, i) => ({ nr: i + 1, titel: s.titel, schwerpunkt: s.schwerpunkt, lernziel: s.lernziel, bisherige_minuten: s.minuten, gewichtung: s.gewichtung })),
            gestrichen,
          },
          auftrag: 'Verteile das Zeitbudget auf die Abschnitte. Reihenfolge und Abschnitte bleiben unverändert.',
          regeln: [
            `Gesamtbudget: ${budget} Minuten (${einzel} Einzelstunden à 40 Min., ${doppel} Doppelstunden à 85 Min.). Die Summe muss ungefähr ${budget} ergeben und mit den Stundenblöcken umsetzbar sein.`,
            'gewichtung: "wichtiger" = deutlich mehr Zeit als bisher, "weniger" = weniger Zeit, "passt"/leer = möglichst beibehalten. Gibt es noch keine bisherigen Minuten, verteile nach didaktischem Bedarf.',
            'zeit_text: kurz, wie die Zeit genutzt wird, z. B. "1 Einzelstunde", "1 Doppelstunde", "2 × 40 Min.".',
            'antwort: 1–3 Sätze an die Lehrkraft (wo es eng wird; nenne gestrichene Abschnitte, falls vorhanden).',
          ],
        }),
        model: 'claude-sonnet-5',
        response_json_schema: ZEIT_SCHEMA,
      });
      const ergebnis = unwrapLLM(antwort);
      const zeiten = Array.isArray(ergebnis?.zeiten) ? ergebnis.zeiten : [];
      // Gestrichene Abschnitte bleiben erhalten (deaktiviert, 0 Min.) – gelöscht wird nur im Verlauf.
      let k = 0;
      verlauf = (planung.verlauf || []).map((s, i) => {
        if (s.gewichtung === 'raus') return { ...s, nr: i + 1, minuten: 0, zeit_text: '' };
        k += 1;
        const z = zeiten.find((x) => Number(x.nr) === k) || {};
        return { ...s, nr: i + 1, minuten: Number(z.minuten) || 0, zeit_text: String(z.zeit_text || ''), gewichtung: 'passt' };
      });
      antwortText = String(ergebnis.antwort || '');
    }

    const aktualisiert = await base44.asServiceRole.entities.UnterrichtsPlanung.update(planung.id, {
      verlauf,
      gespraech: [...gespraech, { role: 'assistant', content: antwortText }],
    });
    return Response.json({ planung: aktualisiert });
  } catch (error) {
    console.error('[unterrichtVerlaufPlanen]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}