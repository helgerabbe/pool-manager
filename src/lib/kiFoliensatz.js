import { base44 } from '@/api/base44Client';
import { folienBaukastenText } from '@/lib/folienBaukastenText';
import { FOLIEN_ELEMENT } from '@/lib/folienElemente';
import { VORGABEN } from '@/lib/folienStil';

// Grafikassistent (2026-10-21): baut aus der Anweisung einen Foliensatz, Folie für Folie.
// Schritt 1 plant die Folienfolge, Schritt 2 baut jede Folie einzeln (parallel, einzeln neu baubar).

export const FOLIE_B = 1024;
export const FOLIE_H = 576;

const kontext = (m, fach) => `Methode: ${m.name}. Fach: ${fach}. Jahrgang 7, Inhalte auf Deutsch.
Kurzbeschreibung: ${m.kurzbeschreibung || ''}
Ablauf und Funktionalität (Methodenbeschreiber):
${m.info_methodenbeschreiber || m.ablauf || ''}
Anweisung für den Grafikassistenten:
${m.info_grafikassistent || '(keine)'}`;

const textFeld = { type: 'string' };

export async function planeFoliensatz(methode, fach, kanal) {
  const r = await base44.integrations.Core.InvokeLLM({
    model: 'claude_sonnet_4_6',
    prompt: `Du bist der Grafikassistent. Plane den Foliensatz dieser Methode, noch ohne Folieninhalt.
${kontext(methode, fach)}
Wähle ein typisches Beispielthema aus dem Fach. Lege NUR den ${kanal === 'digital' ? 'DIGITALEN' : 'ANALOGEN'} Foliensatz in Ablaufreihenfolge an (so wie die Anweisung ihn beschreibt), jede Folie mit Kanal "${kanal}". Je Folie: kurzer Titel, Phase der Methode (z. B. Think, Pair, Share), Kanal (analog oder digital), Freigabe (lehrkraft | zeit | alle_fertig | anteil | geloest | code) mit Minuten falls zeit, und eine knappe Beschreibung, was auf Tafel und Tablet zu sehen ist.`,
    response_json_schema: { type: 'object', properties: {
      thema: textFeld,
      folien: { type: 'array', items: { type: 'object', properties: {
        titel: textFeld, phase: textFeld, kanal: { type: 'string', enum: ['analog', 'digital'] },
        freigabe: textFeld, minuten: { type: 'number' }, beschreibung: textFeld,
      } } },
    } },
  });
  return { thema: r.thema, folien: (r.folien || []).map((f, i) => ({ ...f, id: `f${Date.now()}${i}`, status: 'offen' })) };
}

const elementSchema = { type: 'array', items: { type: 'object', additionalProperties: true, properties: {
  typ: textFeld, x: { type: 'number' }, y: { type: 'number' }, b: { type: 'number' }, h: { type: 'number' },
  inhalt: textFeld, farbe: textFeld, stufe: { type: 'number' }, groesse: { type: 'number' }, schrift: textFeld,
  symbol: textFeld, bedingung: textFeld, minuten: { type: 'number' },
} } };

const vervollstaendigen = (liste, praefix) => (liste || []).filter((e) => FOLIEN_ELEMENT[e.typ]).map((e, i) => {
  const d = FOLIEN_ELEMENT[e.typ];
  return { ...VORGABEN[e.typ], ...e, id: `${praefix}${i}`, b: e.b || d.b, h: e.h || d.h, x: e.x || 0, y: e.y || 0 };
});

export async function baueFolie(methode, fach, plan, folie) {
  const nr = plan.folien.findIndex((f) => f.id === folie.id) + 1;
  const r = await base44.integrations.Core.InvokeLLM({
    model: 'claude_sonnet_4_6',
    prompt: `Du bist der Grafikassistent und baust GENAU EINE Folie eines Foliensatzes aus den Bausteinen des Folien-Designers.
${kontext(methode, fach)}
Beispielthema: ${plan.thema}
Folienfolge: ${plan.folien.map((f, i) => `${i + 1}. ${f.titel} (${f.phase}, ${f.kanal})`).join(' · ')}
DEINE FOLIE: Nr. ${nr} "${folie.titel}" · Phase ${folie.phase} · ${folie.kanal} · ${folie.beschreibung}

BAUKASTEN:
${folienBaukastenText()}

Erlaubte Element-Typen (Feld typ): ${Object.keys(FOLIEN_ELEMENT).join(', ')}.
Koordinaten in Pixeln auf einer Fläche von ${FOLIE_B} × ${FOLIE_H} (x, y = linke obere Ecke, b = Breite, h = Höhe). Nichts darf überlappen oder über den Rand ragen, großzügige Abstände, gut lesbar.
Felder je nach Typ: ueberschrift (inhalt, stufe 0-3), text (inhalt, groesse 14-32), symbol (symbol = lesen|schreiben|sprechen|zuhoeren|einzel|partner|gruppe|plenum|denken|recherche|zeit|leise|kontrolle|frage|zusatz), freigabe (bedingung, minuten), farbe als Hex aus der Palette.
- lehrer: Elemente der Tafel (was die Klasse vorne sieht).
- schueler: Elemente des Schüler-Tablets. Bei analogen Folien leer lassen.
- erklaerung: welche Elemente warum auf der Folie liegen (2-4 Sätze).
- fest: was fest vorgegeben ist. abfrage: was die Lehrkraft vorher eintragen muss (je Punkt eine Zeile).`,
    response_json_schema: { type: 'object', properties: {
      lehrer: elementSchema, schueler: elementSchema, erklaerung: textFeld, fest: textFeld, abfrage: textFeld,
    } },
  });
  return { ...folie, status: 'fertig', lehrer: vervollstaendigen(r.lehrer, 'l'), schueler: vervollstaendigen(r.schueler, 's'), erklaerung: r.erklaerung, fest: r.fest, abfrage: r.abfrage };
}