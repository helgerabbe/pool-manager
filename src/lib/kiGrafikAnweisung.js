import { base44 } from '@/api/base44Client';
import { folienBaukastenText } from '@/lib/folienBaukastenText';

const methodenKontext = (m) => `Methode: ${m.name || ''}
Kurzbeschreibung: ${m.kurzbeschreibung || ''}
Zweck: ${m.zweck_lernziele || ''}
Ablauf: ${m.ablauf || ''}
Sozialformen: ${(m.sozialformen || []).join(', ')} · Dauer: ${m.dauer_min || '?'}–${m.dauer_max || '?'} Min.
Digitale Umsetzung: ${m.digital_umsetzung || ''}
Analoge Umsetzung: ${m.analog_umsetzung || ''}
Lehreransicht laut Bauplan: ${m.lehreransicht || ''}
Schüleransicht laut Bauplan: ${m.schueleransicht || ''}
Varianten: ${m.varianten || ''}
Stolpersteine: ${m.stolpersteine || ''}`;

const auftrag = (bisher, wunsch, verlauf) => `${bisher ? `BISHERIGER TEXT:\n${bisher}\n` : ''}${(verlauf || []).length ? `BISHERIGE WÜNSCHE:\n${verlauf.map((w) => `- ${w}`).join('\n')}\n` : ''}${wunsch ? `NEUER WUNSCH DER LEHRKRAFT: ${wunsch}\nÜberarbeite den Text entsprechend, alles andere bleibt erhalten.` : 'Schreibe einen ersten Vorschlag.'}`;

// Schutz gegen Hängen (2026-10-21): jede Anfrage bricht nach 90 Sekunden ab.
const mitZeitlimit = (p) => Promise.race([p, new Promise((_, nein) => setTimeout(() => nein(new Error('Zeitlimit')), 90000))]);

async function frage(prompt) {
  return mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt, model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: { text: { type: 'string' }, kurz: { type: 'string', description: 'Ein Satz, was du geschrieben bzw. geändert hast.' } } },
  }));
}

/** Methodenbeschreiber: beschreibt Ablauf und Funktionalität der Methode ausführlich (noch ohne Grafik). */
export function kiMethodenBeschreibung({ methode, bisher, wunsch, verlauf }) {
  return frage(`Du bist der Methodenbeschreiber. Erstelle eine FOLIENSATZ-EXPERTISE für diese Unterrichtsmethode: Wie läuft sie ab, und wie müsste ein Foliensatz (Presenter an der Tafel + ggf. Schüleransicht auf dem Gerät) aussehen, damit sie im Unterricht funktioniert? Noch kein Design, keine Farben.
${methodenKontext(methode)}
Bauplan-Rohtext: ${methode.bauplan_rohtext || ''}
Assistent-Fragen: ${methode.assistent_fragen || ''}
Prüfregeln: ${methode.pruefregeln || ''}

WAS DER LEHRKRAFT BESONDERS WICHTIG IST (unbedingt berücksichtigen, hat Vorrang):
${methode.info_wuensche || methode.info_wuensche_roh || '(nichts angegeben)'}

${auftrag(bisher, wunsch, verlauf)}

Gliederung (Klartext, Deutsch, nummerierte Abschnitte):
1. KERN DER METHODE (Phasen, worauf es ankommt)
2. ART DES FOLIENSATZES: Einstufung KEINE FOLIEN NÖTIG / STATISCH (zeigt nur Inhalte und Aufträge) / DYNAMISCH (führt durch Phasen, Timer, Gruppeneinteilung, einfache Notizen) / INTERAKTIV (Schüler geben ein, wählen, sortieren, bewerten gemeinsam; App speichert oder synchronisiert). Begründen: Funktioniert die Methode ohne App? Was ist der digitale Mehrwert? Entwicklungsaufwand je Variante (gering/mittel/hoch).
3. LEHRERANSICHT (Presenter), Folie für Folie: Folientyp (Methodenfolie, Auftragsfolie, Phasenfolie, Übergangsfolie, Sicherungsfolie), Inhalt, was davon variabel ist.
4. SCHÜLERANSICHT (Gerät), nur falls dynamisch/interaktiv: was je Phase zu sehen und zu tun ist, was gespeichert und was synchronisiert wird; je interaktivem Element Einzelmodus oder Gruppenmodus (mit Gruppenkennung) und wer sieht/bearbeitet.
5. WIEDERVERWENDBAR vs. STUNDENBEZOGEN (Methodenbausteine vs. Inhalte, die aus der Stunde kommen)
6. WAS DIE LEHRKRAFT VORHER ENTSCHEIDEN MUSS: jede Entscheidung als eigener Punkt mit Optionen und Standardwert. Wenn nichts zu entscheiden ist, ausdrücklich sagen.
7. WAS ANALOG BLEIBEN SOLLTE
8. RISIKEN / PRÜFPUNKTE FÜR DEN FOLIENSATZ (aus den Stolpersteinen)
9. EINORDNUNG: Klar / Annahme / Offen
Konkret und knapp, keine Allgemeinplätze. Bei komplexen Methoden besonders genau.`);
}

/** Erster Grafikassistent: macht aus der Methodenbeschreibung eine Anweisung für die grafische Funktionalität. */
// Kleinschrittig (2026-10-21): erst die Folienliste planen, dann jeder Abschnitt und jede Folie als eigene kurze Anfrage.
// Drei Knöpfe (2026-10-21): analog, digital, Gesamtbeschreibung; jeder ersetzt nur seinen Teil im Text.
const KOEPFE = ['TEIL I · ANALOGER FOLIENSATZ', 'TEIL II · DIGITALER FOLIENSATZ', 'GEMEINSAM'];

export function setzeTeil(bisher, kopf, neu, koepfe = KOEPFE) {
  const teile = {};
  koepfe.forEach((k, i) => {
    const start = (bisher || '').indexOf(k);
    if (start < 0) return;
    const ende = koepfe.slice(i + 1).map((n) => bisher.indexOf(n)).filter((p) => p > start)[0] ?? bisher.length;
    teile[k] = bisher.slice(start, ende).trim();
  });
  teile[kopf] = `${kopf}\n\n${neu}`;
  return koepfe.filter((k) => teile[k]).map((k) => teile[k]).join('\n\n');
}

async function baueSatz(args, art) {
  args.fortschritt?.('Folienliste wird geplant …');
  const plan = await planeFolien(args.methode);
  const namen = plan[art] || [];
  const gross = art === 'analog' ? 'ANALOGEN' : 'DIGITALEN';
  const liste = `Folienliste ${art}: ${namen.map((n, i) => `${i + 1}. ${n}`).join(' · ')}`;
  const schritte = [
    `Schreibe NUR Abschnitt A (Organisation) für den ${gross} Foliensatz.`,
    ...namen.map((n, i) => `Schreibe NUR Abschnitt B für die ${gross} Folie ${i + 1} "${n}"${art === 'analog' ? ' (keine Schüleransicht)' : ''}.`),
    ...(art === 'digital' ? ['Schreibe NUR Abschnitt C (Datenfluss) des digitalen Foliensatzes.'] : []),
  ];
  let fertig = 0;
  args.fortschritt?.(`0 von ${schritte.length} Teilen fertig`);
  const teile = await Promise.all(schritte.map((s) => grafikTeil(args, `${s}\n${liste}`).then((r) => {
    fertig += 1; args.fortschritt?.(`${fertig} von ${schritte.length} Teilen fertig`); return r.text || '';
  })));
  return teile.join('\n\n');
}

export async function kiGrafikAnalog(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[0], await baueSatz(args, 'analog')) };
}
export async function kiGrafikDigital(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[1], await baueSatz(args, 'digital')) };
}
export async function kiGrafikGemeinsam(args) {
  const r = await grafikTeil(args, 'Schreibe NUR die Abschnitte D, E und F.');
  return { text: setzeTeil(args.bisher, KOEPFE[2], r.text || '') };
}

async function planeFolien(methode) {
  return mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Übernimm aus der bestätigten GROBÜBERSICHT die Folienliste für den analogen und den digitalen Foliensatz, je Folie ein kurzer Name, in genau dieser Reihenfolge. Nichts hinzufügen oder weglassen.
GROBÜBERSICHT:
${methode.info_grobuebersicht || ''}`,
    model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: {
      analog: { type: 'array', items: { type: 'string' } }, digital: { type: 'array', items: { type: 'string' } },
    } },
  }));
}

export async function kiGrafikAnweisung(args) {
  const plan = await planeFolien(args.methode);
  const liste = `Folienliste analog: ${(plan.analog || []).map((n, i) => `${i + 1}. ${n}`).join(' · ')}\nFolienliste digital: ${(plan.digital || []).map((n, i) => `${i + 1}. ${n}`).join(' · ')}`;
  const schritte = [
    ['TEIL I · ANALOGER FOLIENSATZ', 'Schreibe NUR Abschnitt A (Organisation) für den ANALOGEN Foliensatz.'],
    ...(plan.analog || []).map((n, i) => [null, `Schreibe NUR Abschnitt B für die ANALOGE Folie ${i + 1} "${n}" (keine Schüleransicht).`]),
    ['TEIL II · DIGITALER FOLIENSATZ', 'Schreibe NUR Abschnitt A (Organisation) für den DIGITALEN Foliensatz.'],
    ...(plan.digital || []).map((n, i) => [null, `Schreibe NUR Abschnitt B für die DIGITALE Folie ${i + 1} "${n}".`]),
    [null, 'Schreibe NUR Abschnitt C (Datenfluss) des digitalen Foliensatzes.'],
    ['GEMEINSAM', 'Schreibe NUR die Abschnitte D, E und F.'],
  ];
  const teile = await Promise.all(schritte.map(([, t]) => grafikTeil(args, `${t}\n${liste}`)));
  const text = schritte.map(([kopf], i) => `${kopf ? `${kopf}\n\n` : ''}${teile[i].text || ''}`).join('\n\n');
  return { text, kurz: '' };
}

// Klartext statt JSON (2026-10-21): das JSON-Antwortformat schnitt lange Texte ab.
async function grafikTeil(args, teil) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({ prompt: `${grafikPrompt(args, teil)}\nAntworte nur mit dem Text, ohne Vorrede.`, model: 'claude_sonnet_4_6' }));
  return { text: String(text || '').trim() };
}

function grafikPrompt({ methode, wunsch, verlauf }, teil) {
  const bisher = '';
  return (`${teil}
Die anderen Abschnitte und Folien schreiben parallel andere Assistenten; wiederhole sie nicht, schreibe keine Teil-Überschrift. Knapp und vollständig.

Du schreibst die BAUANLEITUNG für den Grafikassistenten. Er baut daraus die grafische Vorlage (Foliensatz) dieser Methode. Er darf NUR die Elemente und Einstellungen des Baukastens unten verwenden; beschreibe so genau, dass er nichts raten muss.
${methodenKontext(methode)}

METHODENBESCHREIBUNG (Ablauf und Funktionalität, vom Methodenbeschreiber):
${methode.info_methodenbeschreiber || '(keine, nutze die Angaben oben)'}

WAS DER LEHRKRAFT BESONDERS WICHTIG IST:
${methode.info_wuensche || methode.info_wuensche_roh || '(nichts angegeben)'}

BESTÄTIGTE GROBÜBERSICHT (Folienfolge verbindlich):
${methode.info_grobuebersicht || '(keine)'}

BAUKASTEN DES FOLIEN-DESIGNERS:
${folienBaukastenText()}

${auftrag(bisher, wunsch, verlauf)}

PFLICHT: Beschreibe IMMER zwei Foliensätze, einen für die ANALOGE und einen für die DIGITALE Durchführung. Analog: Die Folien zeigen nur, was die Klasse sehen muss (Auftrag, Symbole, Timer, Phasenwechsel); gearbeitet wird im Heft, auf Papier oder im Gespräch, es gibt keine Schüleransicht. Digital: zusätzlich die Schüleransicht mit den interaktiven und kollaborativen Elementen. Starre Folien, die in beiden gleich sind, beim digitalen Foliensatz nur mit "wie analog" kennzeichnen.

Form der Bauanleitung (Klartext, Deutsch, nummeriert, keine Programmiersprache). Teil I = ANALOGER FOLIENSATZ (Abschnitte A–B), Teil II = DIGITALER FOLIENSATZ (Abschnitte A–C), danach gemeinsam D–F:
A. ORGANISATION DES FOLIENSATZES: Zuteilung (Art, Verfahren, Gruppengröße/Rollen, Wechsel), Freigabe, Ablauf der Folien, Steuerung der Lehrkraft (Timer, Fertig melden, Partner nach Fertig-Meldung) – jeweils mit kurzer Begründung aus der Methode.
B. FOLIE FÜR FOLIE: Für jede Folie
   - Nummer, Name, Folienart (Starre Folie / Aufgabenfolie), bei Aufgabenfolien Durchführung analog oder digital (bzw. beide Varianten)
   - LEHRERANSICHT (Tafel): jedes Element mit Name aus dem Baukasten, Lage (oben/mitte/unten, links/rechts), Inhalt und Kennzeichnung [Fest] / [Abfrage] (die Lehrkraft gibt es vorher ein) / [Frei] (die KI füllt es passend zur Stunde); Symbole (Piktogramme) für Sozialform und Tätigkeit
   - SCHÜLERANSICHT (Gerät), nur wenn digital: jedes Element mit Name, Inhalt, Kennzeichnung, Art (Interaktiv/Kollaborativ), Funktion (Übung, Präsentation, Weiterführung allein/in die Gruppe mit Ziel, Weitergabe, Rückmeldung, Kollaboration), Einzel- oder Gruppenmodus (mit Gruppenkennung), Sichtbarkeit und Ergebnisanzeige
   - UMSCHALTEN: Freigabebedingung dieser Folie (mit Zeit, Anteil oder Code), wer auslöst und was dann bei Lehrkraft und Schülern passiert
   - BEDIENELEMENTE DER LEHRKRAFT auf dieser Folie (z. B. Timer starten, Ergebnisse zeigen, Partner bilden)
C. DATENFLUSS: welche Eingabe wohin weiterwandert (z. B. Think-Eingabe erscheint in der Pair-Folie beim Partner).
D. ABFRAGEN VOR DER STUNDE: alle [Abfrage]-Felder als Liste mit Standardwert.
E. VERGLEICH ANALOG / DIGITAL: Was ist der digitale Mehrwert, was geht analog besser, wann empfiehlst du welche Variante?
F. OFFENE PUNKTE: was der Baukasten noch nicht abdeckt.
Jeder Schritt der Methodenbeschreibung muss sich in den Folien wiederfinden. Keine Farben oder Dekoration.`);
}