// Übungsformate (2026-10-24): früher, überspringbarer Planungsschritt vor der methodischen Gestaltung.
// Nur INHALTSBEZOGENE Übungen (was die Schüler am Ende können/tun sollen), keine methodischen Formate.
import { kiAufruf } from '@/lib/kiStundenVorbereitung';
import { kontextText, gespraechText } from '@/lib/kiGrobplanung';

export async function kiUebungsVorschlaege({ vorgaben, ...k }) {
  const r = await kiAufruf(k.assistent, `Du bist erfahrener Fachdidaktiker. Bevor die Stunde methodisch geplant wird, klärst du mit der Lehrkraft, welche INHALTSBEZOGENEN Übungsformate die Schüler am Ende bearbeiten können sollen (z. B. Dezimalzahlen der Größe nach sortieren, runden, Argumente sammeln, eine Einleitung schreiben).
Keine methodischen Formate wie Think-Pair-Share, Blitzlicht oder Meinungsbild.
${kontextText(k)}
Grobes Stundenziel: ${vorgaben.ziel?.haupt || 'noch offen'}
${gespraechText(vorgaben)}
Schlage 3-5 passende Übungsformate vor. Je Vorschlag: "titel" (kurz), "beschreibung" (ein Satz: was die Schüler konkret tun), "voraussetzung" (ein Satz: welches Verständnis vorher erarbeitet sein muss), "einsatz" (stunde|hausaufgabe|uebungszeit).`, {
    type: 'object',
    properties: { vorschlaege: { type: 'array', items: { type: 'object', properties: { titel: { type: 'string' }, beschreibung: { type: 'string' }, voraussetzung: { type: 'string' }, einsatz: { type: 'string' } } } } },
    required: ['vorschlaege'],
  });
  return r.vorschlaege || [];
}

export const uebungenText = (u) => {
  if (!u || u.status === 'uebersprungen') return '';
  if (u.status === 'offen' || !u.liste?.length) return 'Inhaltsbezogene Übungsformate: noch offen. Plane eine sinnvolle Übungs- bzw. Anwendungsphase passend zum Ziel ein.';
  return `Inhaltsbezogene Übungsformate (von der Lehrkraft gewählt; die Stunde muss das dafür nötige Verständnis erarbeiten und die Übungen sinnvoll einbetten, außer sie sind als Hausaufgabe gedacht):\n${u.liste.map((x) => `- ${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.einsatz ? ` [${x.einsatz}]` : ''}`).join('\n')}`;
};