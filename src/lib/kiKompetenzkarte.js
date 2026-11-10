// Kompetenzkarten-Assistent (2026-11-10): Schlägt aus dem Pragmatiker-Dashboard eine Kompetenzkarte
// in Schülersprache vor (Grundkurs), gewichtet die Kompetenzen und verknüpft sie mit Lernpaketen/Aufgaben.
import { base44 } from '@/api/base44Client';

/** Alle Inhalte des Dashboards, auf die eine Kompetenz verweisen kann (Lernpakete samt ihren Aufgaben, einzelne Aufgaben). */
export async function kompetenzVerweise({ sektoren, aufgabenById }) {
  const ids = [...new Set(sektoren.flatMap((s) => (s.items || []).filter((i) => i.type === 'aufgabe').map((i) => i.ref_id)))];
  const items = ids.map((id) => aufgabenById.get(id)).filter(Boolean);
  const paketIds = items.filter((a) => a._isLernpaket).map((a) => a.id);
  const [akt, katalog] = paketIds.length
    ? await Promise.all([
        base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } }, { sort: 'reihenfolge', limit: 500 }),
        base44.entities.AktivitaetenKatalog.list({ limit: 500 }),
      ])
    : [{ items: [] }, { items: [] }];
  const katalogName = new Map(katalog.items.map((k) => [k.id, k.name]));
  return items.flatMap((a) =>
    a._isLernpaket
      ? [
          { id: a.id, art: 'lernpaket', titel: a.titel },
          ...akt.items.filter((x) => x.lernpaket_id === a.id).map((x) => ({
            id: x.id, art: 'aktivitaet', titel: x.field_values?.titel || katalogName.get(x.aktivitaet_id) || 'Aufgabe', paket: a.titel,
          })),
        ]
      : [{ id: a.id, art: 'aufgabe', titel: a.titel }]
  );
}

const KOMPETENZ = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    text: { type: 'string' },
    gewicht: { type: 'string', enum: ['zentral', 'wichtig', 'ergaenzend'] },
    verweise: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'text', 'gewicht'],
};
const SCHEMA = {
  type: 'object',
  properties: {
    nachricht: { type: 'string' },
    untertitel: { type: 'string' },
    titel: { type: 'string' },
    bereiche: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, titel: { type: 'string' }, kompetenzen: { type: 'array', items: KOMPETENZ } }, required: ['id', 'titel', 'kompetenzen'] },
    },
  },
  required: ['nachricht', 'untertitel', 'titel', 'bereiche'],
};

const REGELN = `ROLLE: Du erstellst eine KOMPETENZKARTE für Schüler einer Gesamtschule (IGS). Die Karte sagt dem Schüler klar, was er am Ende der Einheit wissen und können soll. Sie ist Orientierung beim Lernen, Grundlage der Selbsteinschätzung und Grundlage des Abschlusstests. Nur Grundkurs-Niveau (Pragmatiker-Lernplan), keine E-Kurs-Kompetenzen.

AUFBAU (wie die Kompetenzkarten der Schule):
- "untertitel": "Kompetenzkarte <Fach> <Jahrgang>", "titel": das Thema der Einheit, kurz.
- 2–4 Bereiche nach den Kompetenzbereichen des Fachs (z. B. Deutsch: „Lesen und mit Texten arbeiten“, „Texte verfassen“; Mathematik: „Mit Formeln arbeiten“, „Probleme lösen“). IDs B1, B2, …
- Je Bereich 3–7 Kompetenzen, insgesamt etwa 8–14. IDs K1, K2, … (fortlaufend über alle Bereiche).
- "text" setzt „Du kannst …“ fort: klein beginnen, mit Punkt enden, z. B. „Merkmale einer Kurzgeschichte nennen.“ Eine Kompetenz pro Zeile, konkret und überprüfbar, mit klaren Verben (nennen, erklären, berechnen, untersuchen, anwenden). Schülergerechte, einfache Sprache; Fachbegriffe nur, wenn sie gelernt werden.
- Nur Kompetenzen, die der Pragmatiker-Lernplan wirklich vermittelt.

GEWICHTUNG ("gewicht"):
- "zentral": die 1–3 Kernkompetenzen der Einheit, die der Abschlusstest vor allem prüft (z. B. „mit dem Satz des Pythagoras fehlende Seiten im rechtwinkligen Dreieck berechnen.“).
- "wichtig": zeigen, dass der Schüler das Thema gut beherrscht.
- "ergaenzend": zusätzliches Wissen und Können, das dazugehört, aber nicht im Mittelpunkt steht (z. B. „erkennen, dass die Seiten auch anders heißen können, z. B. x, y und z.“).

VERWEISE ("verweise"): Für jede Kompetenz 1–4 IDs aus der Liste VERWEISBARE INHALTE, mit denen der Schüler genau diese Kompetenz lernt: am besten das Lernpaket UND die passenden Aufgaben darin. Nur IDs aus der Liste verwenden. Passt nichts, leere Liste.

"nachricht": 1–3 kurze Sätze an die Lehrkraft (Du-Form), was du gebaut oder geändert hast.`;

const verweisListe = (verweise) =>
  verweise.map((v) => (v.art === 'aktivitaet' ? `    - ${v.id} | Aufgabe im Lernpaket: „${v.titel}“` : `- ${v.id} | ${v.art === 'lernpaket' ? 'Lernpaket' : 'Aufgabe'}: „${v.titel}“`)).join('\n');

const fuerKi = (karte) => ({
  untertitel: karte.untertitel, titel: karte.titel,
  bereiche: (karte.bereiche || []).map((b) => ({ ...b, kompetenzen: (b.kompetenzen || []).map((k) => ({ ...k, verweise: (k.verweise || []).map((v) => v.id) })) })),
});

/** Erstellt die Karte neu oder überarbeitet sie nach dem Wunsch der Lehrkraft. Verweise kommen als Objekte zurück. */
export async function kompetenzkarteBauen({ kontext, verweise, karte, wunsch, verlauf = [] }) {
  const bestand = karte?.bereiche?.length
    ? `\nAKTUELLE KARTE (überarbeite sie; ändere nur, was der Wunsch verlangt, behalte IDs unveränderter Kompetenzen und gib immer die KOMPLETTE Karte zurück):\n${JSON.stringify(fuerKi(karte))}`
    : '\nEs gibt noch keine Karte. Erstelle sie vollständig neu.';
  const gespraech = verlauf.length ? `\nGESPRÄCH BISHER:\n${verlauf.slice(-8).map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Du'}: ${m.content}`).join('\n')}` : '';
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `${REGELN}\n\nEINHEIT:\n${kontext}\n\nVERWEISBARE INHALTE:\n${verweisListe(verweise) || '(keine)'}${bestand}${gespraech}\n\nWUNSCH DER LEHRKRAFT: ${wunsch || 'Erstelle die Kompetenzkarte zu dieser Einheit.'}`,
    response_json_schema: SCHEMA,
  });
  const nachId = new Map(verweise.map((v) => [v.id, v]));
  return {
    ...r,
    bereiche: r.bereiche.map((b) => ({ ...b, kompetenzen: b.kompetenzen.map((k) => ({ ...k, verweise: (k.verweise || []).map((id) => nachId.get(id)).filter(Boolean) })) })),
  };
}