// Online-Test-Assistent (2026-11-10): Erstellt bzw. überarbeitet den Abschlusstest (Systembaustein
// „Externer Test“) aus dem Pragmatiker-Dashboard nach den Regeln für die App „NeunZehn“.
// Die KI liefert nur den Aufgabenpool + Teil 2 + Teil 3; die test.html baut onlineTestHtml.js.
import { base44 } from '@/api/base44Client';

const ohneHtml = (t, n = 400) => String(t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** Kontext aus dem Pragmatiker-Dashboard: Sektoren, darin liegende Aufgaben/Lernpakete und deren Lernziele. */
export async function onlineTestKontext({ einheit, sektoren, aufgabenById }) {
  const ids = sektoren.flatMap((s) => (s.items || []).filter((i) => i.type === 'aufgabe').map((i) => i.ref_id));
  const paketIds = ids.filter((id) => aufgabenById.get(id)?._isLernpaket);
  const ziele = paketIds.length ? await base44.entities.Lernziele.filter({ lernpaket_id: { $in: paketIds } }) : [];
  const zeilen = sektoren.map((s) => {
    const items = (s.items || []).filter((i) => i.type === 'aufgabe').map((i) => {
      const a = aufgabenById.get(i.ref_id);
      if (!a) return null;
      const z = ziele.filter((x) => x.lernpaket_id === a.id).map((x) => x.formulierung_fachsprache).filter(Boolean);
      return `  - ${a._isLernpaket ? 'Lernpaket' : 'Aufgabe'}: ${a.titel}${a.aufgabenstellung ? ` – ${ohneHtml(a.aufgabenstellung)}` : ''}${z.length ? `\n    Lernziele: ${z.join(' / ')}` : ''}`;
    }).filter(Boolean);
    return items.length ? `Sektor „${s.titel_snapshot || s.titel || 'ohne Titel'}“:\n${items.join('\n')}` : null;
  }).filter(Boolean);
  return `Fach: ${einheit.fach}\nJahrgang: ${einheit.jahrgangsstufe}\nThema der Einheit: ${einheit.titel_der_einheit}
${einheit.gesamtziele?.length ? `Gesamtziele: ${einheit.gesamtziele.join(' / ')}\n` : ''}Inhalte des Pragmatiker-Lernplans (grundlegendes Niveau):\n${zeilen.join('\n') || '(keine Inhalte gefunden)'}`;
}

const VARIANTE = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    typ: { type: 'string', enum: ['auswahl', 'mehrfach', 'zahl', 'kurz', 'text', 'zuordnung', 'reihenfolge'] },
    frage: { type: 'string' },
    optionen: { type: 'array', items: { type: 'string' } },
    einheit: { type: 'string' },
    links: { type: 'array', items: { type: 'string' } },
    rechts: { type: 'array', items: { type: 'string' } },
    elemente: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'typ', 'frage'],
};
const SCHEMA = {
  type: 'object',
  properties: {
    nachricht: { type: 'string' },
    titel: { type: 'string' },
    aufgaben: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, thema: { type: 'string' }, varianten: { type: 'array', items: VARIANTE } }, required: ['id', 'thema', 'varianten'] } },
    hintergrund: { type: 'string' },
    erwartungshorizont: { type: 'string' },
  },
  required: ['nachricht', 'titel', 'aufgaben', 'hintergrund', 'erwartungshorizont'],
};

const REGELN = `ROLLE: Du erstellst Online-Tests für die Jahrgänge 9 und 10 einer Gesamtschule (IGS). Die Tests laufen in der Schul-App „NeunZehn“ im Prüfungsmodus auf iPads und Laptops. Die Korrektur übernimmt eine KI in der App. Der Test selbst enthält deshalb KEINE Lösungen.

AUFGABENPOOL:
- 8–10 Aufgaben (IDs A1, A2, …), jede mit 3–4 gleichwertigen Varianten (IDs A1-a, A1-b, …): gleiche Kompetenz, gleicher Schwierigkeitsgrad, andere Zahlen/Beispiele/Texte. Die App wählt je Aufgabe zufällig genau eine Variante.
- "thema" = geprüfte Kompetenz in wenigen Wörtern.
- Typen: "auswahl" (eine Option, "optionen" 3–5), "mehrfach" (mehrere Optionen richtig, "optionen" 4–6; im Fragetext sagen, dass mehrere richtig sein können), "zahl" (Zahleingabe, Komma erlaubt, ggf. "einheit" z. B. "€"), "kurz" (ein Wort / kurzer Satz), "text" (Freitext, 2–5 Sätze), "zuordnung" ("links" = Begriffe, "rechts" = Auswahlmöglichkeiten, gern mit 1 Ablenker; "rechts" in ZUFÄLLIGER Reihenfolge, nie paarweise passend zu "links"), "reihenfolge" ("elemente" in DURCHEINANDERGEWÜRFELTER Reihenfolge, nie in der richtigen).
- Keine Lösungen, keine Punkte, keine Hinweise auf richtige Antworten in Fragen oder Optionen. Keine Bilder, keine Links.
- Mischung: einige sichere Einstiegsaufgaben, mehrere Standardaufgaben und 1–2 Aufgaben, die ein A ermöglichen. Grundlegendes Niveau, passend zum Pragmatiker-Lernplan. Typen sinnvoll mischen.
- Sprache: einfaches, klares Deutsch, Du-Form, kurze Sätze; Fachbegriffe nur, wenn sie zum Test gehören.

BEWERTUNGSMODELL (Orientierung, die App setzt es um): A „überdurchschnittlich“ ab etwa 75–80 % der Erwartungen (ca. 20 % der Schüler), B „angemessen“ etwa 25–75 % (Normalfall), C „nicht ausreichend“ unter etwa 25 %.

TEIL 2 "hintergrund" (5–15 Zeilen, für die korrigierende KI): Fach, Thema, Jahrgang, geprüfte Kompetenzen, was auf grundlegendem Niveau erwartet wird, worauf es bei der Bewertung ankommt (z. B. „Einheiten müssen stimmen“). Liste die Aufgaben mit ihrem Thema auf.
TEIL 3 "erwartungshorizont": Für JEDE Variante eine Zeile, sortiert nach Varianten-ID, z. B. "A1-a: 30 € (40 € − 25 % = 30 €). Auch "30" ohne Einheit gilt als richtig." Bei Freitext/Kurzantworten: Kernpunkte, gleichwertige Formulierungen und wann „teilweise richtig“ gilt. Bei Zuordnung die richtigen Paare, bei Reihenfolge die richtige Reihenfolge.
"nachricht": 1–3 kurze Sätze an die Lehrkraft (Du-Form), was du gebaut oder geändert hast.`;

/** Erstellt den Test neu (ohne bestehenden Test) oder überarbeitet ihn nach dem Wunsch der Lehrkraft. */
export function onlineTestBauen({ kontext, test, wunsch, verlauf = [] }) {
  const bestand = test?.aufgaben?.length
    ? `\nAKTUELLER TEST (überarbeite ihn; ändere nur, was der Wunsch verlangt, gib aber immer den KOMPLETTEN Test mit allen drei Teilen zurück):\n${JSON.stringify({ titel: test.titel, aufgaben: test.aufgaben, hintergrund: test.hintergrund, erwartungshorizont: test.erwartungshorizont })}`
    : '\nEs gibt noch keinen Test. Erstelle ihn vollständig neu.';
  const gespraech = verlauf.length ? `\nGESPRÄCH BISHER:\n${verlauf.slice(-8).map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Du'}: ${m.content}`).join('\n')}` : '';
  return base44.integrations.Core.InvokeLLM({
    prompt: `${REGELN}\n\nEINHEIT:\n${kontext}${bestand}${gespraech}\n\nWUNSCH DER LEHRKRAFT: ${wunsch || 'Erstelle den Abschlusstest zu dieser Einheit.'}`,
    response_json_schema: SCHEMA,
  });
}