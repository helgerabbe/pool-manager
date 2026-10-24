// Kernaufgaben (2026-10-24): Pflichtschritt vor dem Planungsgespräch, in drei Stufen.
// 1) kern: EINE Kernaufgabe im mittleren Niveau (optional eine zweite, additiv), 2) diff: je Kernaufgabe drei Niveaus
// (Förderangebot / normal / leistungsstärker), 3) vorstufen: Pool möglicher Teilaufgaben je Kernaufgabe, mit Sternebewertung.
import { kontextText, gespraechText, kiMitMaterial } from '@/lib/kiGrobplanung';

const STUFE = {
  kern: `Schritt 1: KERNAUFGABE. Schlage GENAU EINE Kernaufgabe im mittleren Leistungsniveau vor: die inhaltsbezogene Hauptaufgabe, die die Schüler am Ende der Stunde lösen können sollen und an der sie zeigen, was sie gelernt haben. Es geht um die eigentliche kognitive Leistung (z. B. beim Satz des Pythagoras: die Hypotenuse aus den Katheten berechnen), NICHT um allgemeine Formate wie Lückentext oder Begriffe zuordnen. Sag klar: "Aus dem, was du mir gesagt hast, würde ich sagen, das ist die Kernaufgabe."
Hat die Lehrkraft Rückmeldung gegeben, überarbeite die Kernaufgabe entsprechend. Bittet sie ausdrücklich um eine zweite Kernaufgabe, ergänze sie und lass die erste unverändert. Höchstens 2 Kernaufgaben.`,
  diff: `Schritt 2: DIFFERENZIERUNG. Die Kernaufgaben stehen fest. Differenziere JEDE Kernaufgabe in drei Niveaus:
- "foerder": Förderangebot. Das absolute Minimum, das ein Förderschüler aus der Stunde mitnimmt; mit starker Hilfestellung (z. B. Wortspeicher, Vorstrukturierung, Bildunterstützung), aber immer noch am Kern der Stunde.
- "normal": was man von allen "normalen" Schülern erwartet (entspricht im Wesentlichen der Kernaufgabe).
- "stark": für leistungsstärkere Schüler, etwas mehr Anspruch (nicht "Rakete", sondern eine Stufe weiter).
Geht die Lehrkraft auf eine Rückmeldung ein, passe die Niveaus an.`,
  vorstufen: `Schritt 3: MÖGLICHE TEILAUFGABEN. Kernaufgaben und Differenzierung stehen fest. Wir sammeln je Kernaufgabe einen Pool möglicher Teilaufgaben, die als Teilziele zur Kernaufgabe hinführen; ob sie in der Stunde, als Hausaufgabe oder später geübt werden, ist noch offen. Allgemeine Formate wie Lückentext sind erlaubt, wenn sie sinnvoll hinführen.
Schlage 3-5 NEUE Teilaufgaben vor (verteilt auf die Kernaufgaben, "kern" = Nummer der Kernaufgabe), die sich deutlich von den bisherigen unterscheiden. Orientiere dich an den Sternebewertungen der Lehrkraft (5 = richtig gut): mehr von dem, was gut bewertet ist.`,
};

const liste = (a = []) => a.map((x) => `- ${x.kern ? `[zu Kernaufgabe ${x.kern}] ` : ''}${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.bewertung ? ` (Bewertung der Lehrkraft: ${x.bewertung}/5)` : ''}`).join('\n') || '- keine';
const nivText = (n) => (n ? `\n   Förderangebot: ${n.foerder?.beschreibung || '–'}\n   Normal: ${n.normal?.beschreibung || '–'}\n   Leistungsstärker: ${n.stark?.beschreibung || '–'}` : '');
const kernListe = (a = []) => a.map((x, i) => `${i + 1}. ${x.titel}: ${x.beschreibung || ''}${x.beispiel ? ` (Beispiel: ${x.beispiel})` : ''}${nivText(x.niveaus)}`).join('\n') || '- keine';

const NIV = { type: 'object', properties: { beschreibung: { type: 'string' }, beispiel: { type: 'string' } } };

export function kiUebungsGespraech({ vorgaben, u, stufe, nachricht, ...k }) {
  const verlauf = (u.gespraech || []).map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Assistent'}: ${m.content}`).join('\n');
  const ausgabe = {
    kern: '"aufgaben": die vollständige, aktuelle Liste der Kernaufgaben (1, höchstens 2). Je Aufgabe "titel" (kurz), "beschreibung" (ein Satz: was die Schüler konkret tun), "beispiel" (konkrete Beispielaufgabe, wie sie auf dem Blatt stünde).',
    diff: '"niveaus": je Kernaufgabe in derselben Reihenfolge ein Objekt mit "foerder", "normal", "stark", jeweils "beschreibung" (ein Satz) und "beispiel" (konkrete Aufgabe).',
    vorstufen: '"aufgaben": NUR die neuen Teilaufgaben. Je Aufgabe "kern" (Nummer der Kernaufgabe), "titel", "beschreibung", "beispiel".',
  }[stufe];
  return kiMitMaterial(k.assistent, `Du bist ein erfahrener Fachdidaktiker und planst mit einer Lehrkraft die Aufgaben einer Stunde. Du gehst aktiv voran und machst konkrete Vorschläge, dann fragst du kurz, ob es passt. Einfache Lehrersprache, Du-Form. Keine Methoden oder Sozialformen.
${kontextText(k)}
Grobes Stundenziel: ${vorgaben.ziel?.haupt || 'noch offen'}
${gespraechText(vorgaben)}
${STUFE[stufe]}
${u.beschreibung ? `Hinweise der Lehrkraft zu den Aufgaben: ${u.beschreibung}` : ''}
${u.beispiele?.length ? 'Die Lehrkraft hat Beispielaufgaben als Dateien angehängt; orientiere dich an Art und Niveau.' : ''}
Bisherige Kernaufgaben:\n${kernListe(u.kern)}
${stufe === 'vorstufen' ? `Bisherige Teilaufgaben:\n${liste(u.vorstufen)}` : ''}
${verlauf ? `Bisheriges Gespräch:\n${verlauf}` : ''}
${nachricht ? `Neue Nachricht der Lehrkraft: "${nachricht}" – geh darauf ein.` : ''}

Antworte mit:
- "antwort": höchstens 3 kurze Sätze (Begründung deines Vorschlags bzw. Reaktion)
- ${ausgabe}`, {
    type: 'object',
    properties: {
      antwort: { type: 'string' },
      aufgaben: { type: 'array', items: { type: 'object', properties: { titel: { type: 'string' }, beschreibung: { type: 'string' }, beispiel: { type: 'string' }, kern: { type: 'number' } } } },
      niveaus: { type: 'array', items: { type: 'object', properties: { foerder: NIV, normal: NIV, stark: NIV } } },
    },
    required: ['antwort'],
  }, [...(k.anker?.materialien || []), ...(u.beispiele || [])]);
}

export const uebungenText = (u) => {
  const kern = u?.kern || [];
  if (!kern.length) return 'Kernaufgaben: noch offen. Plane eine sinnvolle Übungs- bzw. Anwendungsphase passend zum Ziel ein.';
  const teil = (u.vorstufen || []).map((x) => `- ${x.kern ? `[zu Kernaufgabe ${x.kern}] ` : ''}${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.bewertung ? ` (Lehrkraft: ${x.bewertung}/5)` : ''}`).join('\n');
  return `Aufgaben der Stunde (mit der Lehrkraft abgestimmt):
Kernaufgaben (zentrale Leistung am Ende der Stunde, mit Differenzierung):\n${kernListe(kern)}${teil ? `\nMögliche Teilaufgaben (Teilziele auf dem Weg dorthin; Einsatz in Stunde, Hausaufgabe oder Übungsstunde noch offen, gut bewertete bevorzugen):\n${teil}` : ''}`;
};