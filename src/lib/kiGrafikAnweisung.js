import { base44 } from '@/api/base44Client';
import { BAUSTEIN_KATALOG } from '@/lib/stundenBausteine';

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

async function frage(prompt) {
  return base44.integrations.Core.InvokeLLM({
    prompt, model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: { text: { type: 'string' }, kurz: { type: 'string', description: 'Ein Satz, was du geschrieben bzw. geändert hast.' } } },
  });
}

/** Methodenbeschreiber: beschreibt Ablauf und Funktionalität der Methode ausführlich (noch ohne Grafik). */
export function kiMethodenBeschreibung({ methode, bisher, wunsch, verlauf }) {
  return frage(`Du bist der Methodenbeschreiber. Erstelle eine FOLIENSATZ-EXPERTISE für diese Unterrichtsmethode: Wie läuft sie ab, und wie müsste ein Foliensatz (Presenter an der Tafel + ggf. Schüleransicht auf dem Gerät) aussehen, damit sie im Unterricht funktioniert? Noch kein Design, keine Farben.
${methodenKontext(methode)}
Bauplan-Rohtext: ${methode.bauplan_rohtext || ''}
Assistent-Fragen: ${methode.assistent_fragen || ''}
Prüfregeln: ${methode.pruefregeln || ''}

${auftrag(bisher, wunsch, verlauf)}

Gliederung (Klartext, Deutsch, nummerierte Abschnitte):
1. KERN DER METHODE (Phasen, worauf es ankommt)
2. ART DES FOLIENSATZES: Einstufung KEINE FOLIEN NÖTIG / STATISCH (zeigt nur Inhalte und Aufträge) / DYNAMISCH (führt durch Phasen, Timer, Gruppeneinteilung, einfache Notizen) / INTERAKTIV (Schüler geben ein, wählen, sortieren, bewerten gemeinsam; App speichert oder synchronisiert). Begründen: Funktioniert die Methode ohne App? Was ist der digitale Mehrwert? Entwicklungsaufwand je Variante (gering/mittel/hoch).
3. LEHRERANSICHT (Presenter), Folie für Folie: Folientyp (Methodenfolie, Auftragsfolie, Phasenfolie, Übergangsfolie, Sicherungsfolie), Inhalt, was davon variabel ist.
4. SCHÜLERANSICHT (Gerät), nur falls dynamisch/interaktiv: was je Phase zu sehen und zu tun ist, was gespeichert und was synchronisiert wird.
5. WIEDERVERWENDBAR vs. STUNDENBEZOGEN (Methodenbausteine vs. Inhalte, die aus der Stunde kommen)
6. WAS DIE LEHRKRAFT VORHER ENTSCHEIDEN MUSS: jede Entscheidung als eigener Punkt mit Optionen und Standardwert. Wenn nichts zu entscheiden ist, ausdrücklich sagen.
7. WAS ANALOG BLEIBEN SOLLTE
8. RISIKEN / PRÜFPUNKTE FÜR DEN FOLIENSATZ (aus den Stolpersteinen)
9. EINORDNUNG: Klar / Annahme / Offen
Konkret und knapp, keine Allgemeinplätze. Bei komplexen Methoden besonders genau.`);
}

/** Erster Grafikassistent: macht aus der Methodenbeschreibung eine Anweisung für die grafische Funktionalität. */
export function kiGrafikAnweisung({ methode, bisher, wunsch, verlauf }) {
  return frage(`Du bist der erste Grafikassistent (FUNKTION) für digitale Unterrichtsvorlagen. Mache aus der Methodenbeschreibung die Anweisung, nach der du später einen funktionierenden Prototyp baust.
${methodenKontext(methode)}

METHODENBESCHREIBUNG (Ablauf und Funktionalität, vom Methodenbeschreiber):
${methode.info_methodenbeschreiber || '(keine, nutze die Angaben oben)'}

Verfügbare Bausteine (Verhalten eingebaut):
${BAUSTEIN_KATALOG}

${auftrag(bisher, wunsch, verlauf)}

Form der Anweisung (Klartext, Deutsch, für Lehrkräfte verständlich, keine Programmiersprache):
LEHRERANSICHT (digitale Tafel)
- Zweck, Elemente (was ist wo zu sehen), Ablauf (was sich ändert, was die Lehrkraft auslöst)
SCHÜLERANSICHT (Tablet)
- Zweck, Elemente (alle Bereiche und Bedienelemente), Bedienung Schritt für Schritt (was die Schüler tun, was dann passiert), Sonderfälle
ZUSAMMENSPIEL: wie Lehrer- und Schüleransicht zusammenhängen.
Jeder Schritt der Methodenbeschreibung muss sich in den Ansichten wiederfinden. Nenne passende Bausteine beim Namen. Keine Farben oder Dekoration, darum kümmert sich der zweite Assistent.`);
}