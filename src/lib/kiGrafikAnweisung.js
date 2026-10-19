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
  return frage(`Du bist der Methodenbeschreiber. Beschreibe ausführlich und für Lehrkräfte verständlich, wie diese Unterrichtsmethode abläuft und funktioniert. Noch KEINE grafische Oberfläche, keine Bildschirme, kein Design.
${methodenKontext(methode)}

${auftrag(bisher, wunsch, verlauf)}

Gliederung (Klartext, Deutsch):
ZIEL DER METHODE
ABLAUF Schritt für Schritt (mit Zeitanteilen, Sozialform, wer was tut)
ROLLE DER LEHRKRAFT (was sie anleitet, beobachtet, auslöst)
ROLLE DER SCHÜLER (was sie in jedem Schritt tun und als Ergebnis haben)
REGELN UND WECHSEL (Gruppenbildung, Rotation, Zeitsignale, Übergänge)
ERGEBNISSE UND SICHERUNG
SONDERFÄLLE (schnelle/langsame Gruppen, fehlende Schüler, Varianten)
Bei komplexen Methoden besonders genau.`);
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