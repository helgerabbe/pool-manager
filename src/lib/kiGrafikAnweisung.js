import { base44 } from '@/api/base44Client';
import { BAUSTEIN_KATALOG } from '@/lib/stundenBausteine';

/** Erster Grafikassistent schreibt bzw. überarbeitet seine eigene Anweisung (Lehrer- und Schüleransicht). */
export async function kiGrafikAnweisung({ methode, bisher, wunsch, verlauf }) {
  const prompt = `Du bist der erste Grafikassistent (FUNKTION) für digitale Unterrichtsvorlagen. Schreibe die Anweisung, nach der du später einen funktionierenden Prototyp baust.
Methode: ${methode.name || ''}
Kurzbeschreibung: ${methode.kurzbeschreibung || ''}
Zweck: ${methode.zweck_lernziele || ''}
Ablauf: ${methode.ablauf || ''}
Sozialformen: ${(methode.sozialformen || []).join(', ')} · Dauer: ${methode.dauer_min || '?'}–${methode.dauer_max || '?'} Min.
Digitale Umsetzung: ${methode.digital_umsetzung || ''}
Lehreransicht laut Bauplan: ${methode.lehreransicht || ''}
Schüleransicht laut Bauplan: ${methode.schueleransicht || ''}
Varianten: ${methode.varianten || ''}

Verfügbare Bausteine (Verhalten eingebaut):
${BAUSTEIN_KATALOG}

${bisher ? `BISHERIGE ANWEISUNG:\n${bisher}\n` : ''}${(verlauf || []).length ? `BISHERIGE WÜNSCHE:\n${verlauf.map((w) => `- ${w}`).join('\n')}\n` : ''}${wunsch ? `NEUER WUNSCH DER LEHRKRAFT: ${wunsch}\nÜberarbeite die Anweisung entsprechend, alles andere bleibt erhalten.` : 'Schreibe einen ersten Vorschlag.'}

Form der Anweisung (Klartext, Deutsch, für Lehrkräfte verständlich, keine Programmiersprache):
LEHRERANSICHT (digitale Tafel)
- Zweck: …
- Elemente: Aufzählung, was zu sehen ist und wo (oben/Mitte/unten)
- Ablauf: was sich im Verlauf der Phase ändert, was die Lehrkraft auslöst
SCHÜLERANSICHT (Tablet)
- Zweck: …
- Elemente: Aufzählung aller Bereiche und Bedienelemente
- Bedienung Schritt für Schritt: was die Schüler tun und was dann passiert (Rückmeldung, Fortschritt, Freischalten)
- Sonderfälle: Gruppenarbeit, Wechsel, Zeitablauf, falsche Eingaben
ZUSAMMENSPIEL: wie Lehrer- und Schüleransicht zusammenhängen.
Bei komplexen Methoden ausführlich und genau. Nenne passende Bausteine beim Namen. Keine Aussagen zu Farben oder Dekoration, darum kümmert sich der zweite Assistent.`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt, model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: { anweisung: { type: 'string' }, kurz: { type: 'string', description: 'Ein Satz, was du geändert hast.' } } },
  });
  return res;
}