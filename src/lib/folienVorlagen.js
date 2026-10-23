// Feste Folienvorlagen (2026-10-23): Das Aussehen ist im Code gebaut, die KI wählt nur die Vorlage und füllt kurze Texte.
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';

export const FOLIEN_VORLAGEN = {
  uebersicht: { name: 'Methodenübersicht', folientyp: 'methode', felder: 'titel (max. 40 Zeichen), untertitel (max. 60), phasen: 2-4 Einträge je { name (max. 14), sozialform EA|PA|GA|PL, satz (max. 70) }' },
  phase: { name: 'Phasenfolie', folientyp: 'methode', felder: 'titel = Phasenname (max. 30), sozialform, methodisch (max. 110: feststehende Arbeitsanweisung der Methode, z. B. „Denke allein und leise nach …“), inhalt (max. 140: konkrete inhaltliche Aufgabe zum Thema), leise (true = Stille-Zeichen oben rechts), minuten' },
  aufgabe: { name: 'Aufgaben-Platzhalter', folientyp: 'aufgabe', felder: 'titel (max. 30), sozialform, minuten. Der Aufgabentext wird später von der Lehrkraft eingesetzt.' },
  fokus: { name: 'Fokusfolie (Einstieg)', folientyp: 'inhalt', felder: 'titel (max. 40), satz (max. 110, freier Text, MUSS ein Signalwort enthalten: „jetzt“ oder „als Nächstes“, z. B. „Wir wollen jetzt herausfinden, …“), optional bild = fotorealistisches Impulsbild unten rechts im Hintergrund, nie Comic' },
  uebergang: { name: 'Übergang', folientyp: 'organisation', felder: 'titel (max. 30, z. B. „Jetzt: Pair“), sozialform der NÄCHSTEN Phase, satz (max. 80, genau ein Satz)' },
  partnersuche: { name: 'Partner finden (Standard)', folientyp: 'organisation', felder: 'partnersuche = frei | nachbar | los | duett (Lerntempo-Duett); Bild und Satz sind fest' },
  sammlung: { name: 'Sammlung (Lehrkraft schreibt mit)', folientyp: 'sicherung', felder: 'titel (max. 30), frage (max. 80, Leitfrage der Sammlung). Die Liste bleibt leer und wird im Unterricht live von der Lehrkraft gefüllt.' },
  sicherung: { name: 'Sicherung', folientyp: 'sicherung', felder: 'titel (max. 30), punkte: 2-4 Stichpunkte (je max. 60)' },
  standard: { name: 'Standardfolie', folientyp: 'organisation', felder: `standard = einer von ${Object.keys(CI_STANDARDFOLIEN).join(', ')}` },
};

export const vorlagenText = () => Object.entries(FOLIEN_VORLAGEN).map(([k, v]) => `- ${k} (${v.name}): ${v.felder}`).join('\n');

const t = { type: 'string' };
export const folieSchema = { type: 'object', properties: {
  titel: t, phase: t, kanal: { type: 'string', enum: ['analog', 'digital'] }, freigabe: t, minuten: { type: 'number' },
  vorlage: { type: 'string', enum: Object.keys(FOLIEN_VORLAGEN) }, standard: t,
  untertitel: t, sozialform: { type: 'string', enum: ['EA', 'PA', 'GA', 'PL'] }, auftrag: t, hinweis: t, satz: t, frage: t, methodisch: t, inhalt: t, leise: { type: 'boolean' }, partnersuche: { type: 'string', enum: ['frei', 'nachbar', 'los', 'duett'] },
  phasen: { type: 'array', items: { type: 'object', properties: { name: t, sozialform: t, satz: t } } },
  punkte: { type: 'array', items: t },
  erklaerung: t, abfrage: t,
} };