// Übungsformate (2026-10-24): überspringbarer Schritt vor dem Planungsgespräch.
// Der Assistent schlägt PROAKTIV ein Aufgabenportfolio vor: zuerst 1-3 Kernaufgaben (die zentrale kognitive Leistung,
// an der die Schüler zeigen, was sie in der Stunde erworben haben), danach hinführende Teilaufgaben (Vorstufen).
import { kontextText, gespraechText, kiMitMaterial } from '@/lib/kiGrobplanung';

const STUFE = {
  kern: `Schritt 1: KERNAUFGABEN. Schlage 1-3 Kernaufgaben vor: die inhaltsbezogene Hauptaufgabe, die die Schüler am Ende der Stunde lösen können sollen und an der sie zeigen, was sie gelernt haben. Es geht um die eigentliche kognitive Leistung (z. B. beim Satz des Pythagoras: die Hypotenuse aus den Katheten berechnen), NICHT um allgemeine, immer einsetzbare Formate wie Lückentext, Bildbeschriftung oder Begriffe zuordnen.`,
  vorstufen: `Schritt 2: HINFÜHRENDE TEILAUFGABEN. Die Kernaufgaben stehen fest. Schlage 2-3 kleinere Übungen vor, die als Teilziele zur Kernaufgabe hinführen (z. B. Hypotenuse und Katheten sicher benennen). Hier dürfen auch allgemeine Formate wie Lückentext oder Bildbeschriftung vorkommen, wenn sie sinnvoll zur Kernaufgabe hinführen.`,
};

const liste = (a = []) => a.map((x) => `- ${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}`).join('\n') || '- keine';

export function kiUebungsGespraech({ vorgaben, u, stufe, nachricht, ...k }) {
  const verlauf = (u.gespraech || []).map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Assistent'}: ${m.content}`).join('\n');
  return kiMitMaterial(k.assistent, `Du bist ein erfahrener Fachdidaktiker und planst mit einer Lehrkraft das Aufgabenportfolio einer Stunde. Du gehst aktiv voran: Du machst konkrete Vorschläge ("Ich würde dir Folgendes empfehlen …") und fragst dann, ob die Lehrkraft das genauso sieht. Einfache Lehrersprache, Du-Form. Keine Methoden oder Sozialformen.
${kontextText(k)}
Grobes Stundenziel: ${vorgaben.ziel?.haupt || 'noch offen'}
${gespraechText(vorgaben)}
${STUFE[stufe]}
${u.beschreibung ? `Beschreibung der Lehrkraft zu einer typischen Aufgabe: ${u.beschreibung}` : ''}
${u.beispiele?.length ? 'Die Lehrkraft hat Beispielaufgaben als Dateien angehängt; orientiere dich an Art und Niveau.' : ''}
Bisherige Kernaufgaben:\n${liste(u.kern)}
${stufe === 'vorstufen' ? `Bisherige Teilaufgaben:\n${liste(u.vorstufen)}` : ''}
${verlauf ? `Bisheriges Gespräch:\n${verlauf}` : ''}
${nachricht ? `Neue Nachricht der Lehrkraft: "${nachricht}" – geh darauf ein und passe die Aufgaben entsprechend an.` : ''}

Antworte mit:
- "antwort": höchstens 4 kurze Sätze (Empfehlung bzw. Reaktion, endet mit einer Rückfrage wie "Siehst du das genauso?")
- "aufgaben": die vollständige, aktuelle Liste für diesen Schritt. Je Aufgabe "titel" (kurz), "beschreibung" (ein Satz: was die Schüler konkret tun), "beispiel" (eine konkrete Beispielaufgabe, wie sie auf dem Blatt stünde), "einsatz" (stunde|hausaufgabe|uebungszeit).`, {
    type: 'object',
    properties: {
      antwort: { type: 'string' },
      aufgaben: { type: 'array', items: { type: 'object', properties: { titel: { type: 'string' }, beschreibung: { type: 'string' }, beispiel: { type: 'string' }, einsatz: { type: 'string' } } } },
    },
    required: ['antwort', 'aufgaben'],
  }, [...(k.anker?.materialien || []), ...(u.beispiele || [])]);
}

const zeile = (x) => `- ${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.beispiel ? ` (Beispiel: ${x.beispiel})` : ''}${x.einsatz ? ` [${x.einsatz}]` : ''}`;

export const uebungenText = (u) => {
  if (!u || u.status === 'uebersprungen') return '';
  const kern = u.kern || u.liste || [];
  if (u.status === 'offen' || !kern.length) return 'Inhaltsbezogene Übungsformate: noch offen. Plane eine sinnvolle Übungs- bzw. Anwendungsphase passend zum Ziel ein.';
  return `Aufgabenportfolio der Stunde (mit der Lehrkraft abgestimmt; die Stunde muss das nötige Verständnis erarbeiten und die Aufgaben sinnvoll einbetten, außer sie sind als Hausaufgabe gedacht):
Kernaufgaben (zentrale Leistung am Ende der Stunde):\n${kern.map(zeile).join('\n')}${u.vorstufen?.length ? `\nHinführende Teilaufgaben (Teilziele auf dem Weg dorthin):\n${u.vorstufen.map(zeile).join('\n')}` : ''}`;
};