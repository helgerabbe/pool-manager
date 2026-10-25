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
// Drei kurze Klartext-Anfragen parallel (2026-10-22): eine lange JSON-Antwort lief ins Zeitlimit.
const BESCHREIBER_TEILE = ['Schreibe NUR die Abschnitte 1 bis 3.', 'Schreibe NUR die Abschnitte 4 bis 6.', 'Schreibe NUR die Abschnitte 7 bis 9.'];

export async function kiMethodenBeschreibung(args) {
  let fertig = 0;
  const n = BESCHREIBER_TEILE.length;
  args.fortschritt?.(`0 von ${n} Teilen fertig – der Methodenbeschreiber arbeitet …`);
  const teile = await Promise.all(BESCHREIBER_TEILE.map((t) => mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `${beschreiberPrompt(args)}\n\n${t} Die anderen Abschnitte schreiben andere Assistenten parallel, wiederhole sie nicht. Antworte nur mit dem Text, ohne Vorrede.`,
    model: 'claude_sonnet_4_6',
  })).then((r) => { fertig += 1; args.fortschritt?.(`${fertig} von ${n} Teilen fertig`); return r; })));
  return { text: teile.map((x) => String(x || '').trim()).join('\n\n'), kurz: '' };
}

function beschreiberPrompt({ methode, bisher, wunsch, verlauf }) {
  return (`Du bist der Methodenbeschreiber. Erstelle eine FOLIENSATZ-EXPERTISE für diese Unterrichtsmethode: Wie läuft sie ab, und wie müsste ein Foliensatz (Presenter an der Tafel + ggf. Schüleransicht auf dem Gerät) aussehen, damit sie im Unterricht funktioniert? Noch kein Design, keine Farben.
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
// Zwei Knöpfe (2026-10-24): Tafelfolien und Tablet-Ansicht; jeder ersetzt nur seinen Teil im Text.
const KOEPFE = ['TEIL I · TAFELFOLIEN', 'TEIL II · TABLET-ANSICHT'];

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
  // Gespeicherte Folienliste hat Vorrang: keine erneute Auslese aus dem Text (verhinderte doppelte Folien).
  const fest = args.methode.info_folienliste || [];
  const namen = fest.length
    ? fest.map((f) => `${f.name}${f.nur_digital ? ' (nur digital)' : ''}${f[art === 'tafel' ? 'tafel_standard' : 'tablet_standard'] ? ` [Standardfolie: ${f[art === 'tafel' ? 'tafel_standard' : 'tablet_standard']}]` : ''}`)
    : (await planeFolien(args.methode)).folien || [];
  const liste = `Folienliste (ein gemeinsamer Satz): ${namen.map((n, i) => `${i + 1}. ${n}`).join(' · ')}`;
  const schritte = art === 'tafel' ? [
    'Schreibe NUR Abschnitt A (Organisation) und am Ende Abschnitt D (Abfragen vor der Stunde).',
    ...namen.map((n, i) => `Schreibe NUR Abschnitt B (TAFEL) für Folie ${i + 1} "${n}". Keine Schüleransicht.`),
  ] : [
    ...namen.map((n, i) => `Schreibe NUR Abschnitt B (TABLET) für Folie ${i + 1} "${n}": was die Schüler in diesem Moment auf dem Tablet sehen und tun. Nur die Schüleransicht.`),
    'Schreibe NUR Abschnitt C (Datenfluss).',
  ];
  let fertig = 0;
  args.fortschritt?.(`0 von ${schritte.length} Teilen fertig`);
  const teile = await Promise.all(schritte.map((s) => grafikTeil(args, `${s}\n${liste}`).then((r) => {
    fertig += 1; args.fortschritt?.(`${fertig} von ${schritte.length} Teilen fertig`); return r.text || '';
  })));
  return teile.join('\n\n');
}

export async function kiGrafikTafel(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[0], await baueSatz(args, 'tafel')) };
}
export async function kiGrafikTablet(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[1], await baueSatz(args, 'tablet')) };
}

async function planeFolien(methode) {
  return mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Übernimm aus der bestätigten GROBÜBERSICHT die Folienliste des Foliensatzes, je Folie ein kurzer Name (Zusätze wie "nur digital" behalten), in genau dieser Reihenfolge. Nichts hinzufügen oder weglassen.
GROBÜBERSICHT:
${methode.info_grobuebersicht || ''}`,
    model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: { folien: { type: 'array', items: { type: 'string' } } } },
  }));
}

// Klartext statt JSON (2026-10-21): das JSON-Antwortformat schnitt lange Texte ab.
async function grafikTeil(args, teil) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({ prompt: `${grafikPrompt(args, teil)}\nAntworte nur mit dem Text, ohne Vorrede.`, model: 'claude_sonnet_4_6' }));
  return { text: String(text || '').trim() };
}

import { standardFolienKatalogText } from '@/lib/standardFolienKatalogText';

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

STANDARDFOLIEN: Ist eine Folie in der Grobübersicht mit "[Standardfolie: …]" markiert, beschreibe sie NICHT neu. Nenne nur die Standardfolie und die variablen Inhalte (Texte, Leitfrage, Bild, Zeit, zuschaltbare Optionen). Nur Folien mit "[Noch keine Standardfolie …]" beschreibst du vollständig.
${standardFolienKatalogText()}

BAUKASTEN DES FOLIEN-DESIGNERS:
${folienBaukastenText()}

${auftrag(bisher, wunsch, verlauf)}

PFLICHT: Es gibt EINEN gemeinsamen Foliensatz für die Tafel. Folien, die es nur bei digitaler Durchführung gibt, sind zusätzliche Folien und tragen den Zusatz "nur digital". Zu jeder Tafelfolie gehört eine Tablet-Ansicht: was die Schüler in diesem Moment auf ihrem Gerät sehen und tun.

Form der Bauanleitung (Klartext, Deutsch, nummeriert, keine Programmiersprache). Teil I = TAFELFOLIEN (Abschnitte A, B Tafel, D), Teil II = TABLET-ANSICHT (Abschnitte B Tablet, C):
A. ORGANISATION DES FOLIENSATZES: Zuteilung (Art, Verfahren, Gruppengröße/Rollen, Wechsel), Freigabe, Ablauf der Folien, Steuerung der Lehrkraft (Timer, Fertig melden, Partner nach Fertig-Meldung) – jeweils mit kurzer Begründung aus der Methode.
B. FOLIE FÜR FOLIE: Für jede Folie
   - Nummer, Name, Folienart (Starre Folie / Aufgabenfolie), ggf. Zusatz "nur digital"
   - LEHRERANSICHT (Tafel): jedes Element mit Name aus dem Baukasten, Lage (oben/mitte/unten, links/rechts), Inhalt und Kennzeichnung [Fest] / [Abfrage] (die Lehrkraft gibt es vorher ein) / [Frei] (die KI füllt es passend zur Stunde); Symbole (Piktogramme) für Sozialform und Tätigkeit
   - SCHÜLERANSICHT (Tablet): jedes Element mit Name, Inhalt, Kennzeichnung, Art (Interaktiv/Kollaborativ), Funktion (Übung, Präsentation, Weiterführung allein/in die Gruppe mit Ziel, Weitergabe, Rückmeldung, Kollaboration), Einzel- oder Gruppenmodus (mit Gruppenkennung), Sichtbarkeit und Ergebnisanzeige
   - UMSCHALTEN: Freigabebedingung dieser Folie (mit Zeit, Anteil oder Code), wer auslöst und was dann bei Lehrkraft und Schülern passiert
   - BEDIENELEMENTE DER LEHRKRAFT auf dieser Folie (z. B. Timer starten, Ergebnisse zeigen, Partner bilden)
C. DATENFLUSS: welche Eingabe wohin weiterwandert (z. B. Think-Eingabe erscheint in der Pair-Folie beim Partner).
D. ABFRAGEN VOR DER STUNDE: alle [Abfrage]-Felder als Liste mit Standardwert.
Jeder Schritt der Methodenbeschreibung muss sich in den Folien wiederfinden. Keine Farben oder Dekoration.`);
}