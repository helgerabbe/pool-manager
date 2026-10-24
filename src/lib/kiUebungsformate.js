// Übungsformate (2026-10-24): überspringbarer Schritt vor dem Planungsgespräch.
// Der Assistent schlägt PROAKTIV ein Aufgabenportfolio vor: zuerst 1-3 Kernaufgaben (die zentrale kognitive Leistung,
// an der die Schüler zeigen, was sie in der Stunde erworben haben), danach hinführende Teilaufgaben (Vorstufen).
import { kontextText, gespraechText, kiMitMaterial } from '@/lib/kiGrobplanung';

const STUFE = {
  kern: `Schritt 1: KERNAUFGABEN. Schlage 1-3 Kernaufgaben vor: die inhaltsbezogene Hauptaufgabe, die die Schüler am Ende der Stunde lösen können sollen und an der sie zeigen, was sie gelernt haben. Es geht um die eigentliche kognitive Leistung (z. B. beim Satz des Pythagoras: die Hypotenuse aus den Katheten berechnen), NICHT um allgemeine, immer einsetzbare Formate wie Lückentext, Bildbeschriftung oder Begriffe zuordnen.
Die Schule differenziert: Unterscheide klar zwischen der Ein-Stern-Aufgabe (niveau 1: das, was im besten Fall ALLE Schüler am Ende können sollen) und höchstens einer Zwei-Stern-Aufgabe (niveau 2: darüber hinaus, für Leistungsstarke). Sag das in deiner Antwort ausdrücklich, z. B. "Das sollten, glaube ich, alle können … und darüber hinaus würde ich für Leistungsstarke …".`,
  vorstufen: `Schritt 2: MÖGLICHE TEILAUFGABEN. Die Kernaufgaben stehen fest. Wir sammeln einen Pool möglicher Teilaufgaben, die als Teilziele zur Kernaufgabe hinführen (z. B. Hypotenuse und Katheten sicher benennen); ob sie in der Stunde, als Hausaufgabe oder später geübt werden, ist noch offen. Hier dürfen auch allgemeine Formate wie Lückentext oder Bildbeschriftung vorkommen, wenn sie sinnvoll hinführen.
Schlage 3-5 NEUE Teilaufgaben vor, die sich von den bisherigen deutlich unterscheiden (keine Wiederholungen). Orientiere dich an den Sternebewertungen der Lehrkraft (5 = richtig gut, 1 = eher nicht): mehr von dem, was gut bewertet ist. Mindestens eine davon ist ein Förderangebot ("foerder": true) für sehr schwache Schüler bzw. Förderschüler: stark vereinfacht, mit Hilfen (z. B. Wortspeicher, Bildunterstützung, Vorstrukturierung), damit auch sie sich der Kernaufgabe nähern.`,
};

const liste = (a = []) => a.map((x) => `- ${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.foerder ? ' [Förderangebot]' : ''}${x.bewertung ? ` (Bewertung der Lehrkraft: ${x.bewertung}/5)` : ''}`).join('\n') || '- keine';

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
- "aufgaben": ${stufe === 'kern' ? 'die vollständige, aktuelle Liste für diesen Schritt' : 'NUR die neuen Teilaufgaben (die bisherigen bleiben ohnehin erhalten)'}. Je Aufgabe "titel" (kurz), "beschreibung" (ein Satz: was die Schüler konkret tun), "beispiel" (eine konkrete Beispielaufgabe, wie sie auf dem Blatt stünde)${stufe === 'kern' ? ', "niveau" (1 = für alle, 2 = für Leistungsstarke)' : ', "foerder" (true bei Förderangebot)'}.`, {
    type: 'object',
    properties: {
      antwort: { type: 'string' },
      aufgaben: { type: 'array', items: { type: 'object', properties: { titel: { type: 'string' }, beschreibung: { type: 'string' }, beispiel: { type: 'string' }, niveau: { type: 'number' }, foerder: { type: 'boolean' } } } },
    },
    required: ['antwort', 'aufgaben'],
  }, [...(k.anker?.materialien || []), ...(u.beispiele || [])]);
}

const zeile = (x) => `- ${x.niveau === 2 ? '★★ (für Leistungsstarke) ' : x.niveau === 1 ? '★ (für alle) ' : ''}${x.titel}${x.beschreibung ? `: ${x.beschreibung}` : ''}${x.beispiel ? ` (Beispiel: ${x.beispiel})` : ''}${x.foerder ? ' [Förderangebot für schwache Schüler]' : ''}${x.bewertung ? ` (Lehrkraft: ${x.bewertung}/5)` : ''}`;

export const uebungenText = (u) => {
  if (!u || u.status === 'uebersprungen') return '';
  const kern = u.kern || u.liste || [];
  if (u.status === 'offen' || !kern.length) return 'Inhaltsbezogene Übungsformate: noch offen. Plane eine sinnvolle Übungs- bzw. Anwendungsphase passend zum Ziel ein.';
  return `Aufgabenportfolio der Stunde (mit der Lehrkraft abgestimmt; die Stunde muss das nötige Verständnis erarbeiten und die Aufgaben sinnvoll einbetten, außer sie sind als Hausaufgabe gedacht):
Kernaufgaben (zentrale Leistung am Ende der Stunde):\n${kern.map(zeile).join('\n')}${u.vorstufen?.length ? `\nMögliche Teilaufgaben (Teilziele auf dem Weg dorthin; Einsatz in Stunde, Hausaufgabe oder Übungsstunde noch offen, gut bewertete bevorzugen):\n${u.vorstufen.map(zeile).join('\n')}` : ''}`;
};