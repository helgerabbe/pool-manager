import { base44 } from '@/api/base44Client';
import { STUNDEN_KLASSEN } from '@/lib/stundenDesign';

/** Grafische Vorlage (Lehrer- und Schüler-Display) einer Methode für ein Fach erzeugen. */
export async function erstelleGrafikVorlage(methode, fach) {
  const prompt = `Du bist Grafikassistent für Unterrichtsstunden. Erstelle eine beispielhafte grafische Vorlage der Methode "${methode.name}".
Fach: ${fach}. Wähle selbst ein typisches, anschauliches Beispielthema aus diesem Fach (bei "Fächerübergreifend" ein Thema, das alle Jahrgänge kennen, z. B. Lernen lernen oder Klassenregeln). Schreibe realistische, kurze Inhalte auf Deutsch, Jahrgang 7.

Was die Methode ist: ${methode.kurzbeschreibung || ''}
Ablauf: ${methode.ablauf || ''}
Vorgaben für den Grafikassistenten:
${methode.info_grafikassistent || '(keine)'}

Liefere zwei HTML-Fragmente (nur der Inhalt von <body>, ohne <style>, ohne style-Attribute, ohne Skripte):
- lehrer: das Lehrer-Display (digitale Tafel, Querformat)
- schueler: das Schüler-Display (Tablet)
Beide beginnen mit <div class="stunde">. Verwende AUSSCHLIESSLICH diese Klassen: ${STUNDEN_KLASSEN}.
Bilder nur als .bildplatz mit kurzem Bildtitel. Wenig Text, klare Struktur, viel Ruhe.`;
  return base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: { type: 'object', properties: { thema: { type: 'string' }, lehrer: { type: 'string' }, schueler: { type: 'string' } } },
  });
}