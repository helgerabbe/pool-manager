// Feste Folienvorlagen (2026-10-23): Das Aussehen ist im Code gebaut, die KI wählt nur die Vorlage und füllt kurze Texte.
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';

export const FOLIEN_VORLAGEN = {
  uebersicht: { name: 'Methodenübersicht', folientyp: 'methode', felder: 'titel (max. 40 Zeichen), untertitel (max. 60), phasen: 2-4 Einträge je { name (max. 14), sozialform EA|PA|GA|PL, satz (max. 70) }' },
  phase: { name: 'Phasenfolie', folientyp: 'methode', felder: 'titel = Phasenname (max. 30), sozialform, auftrag (max. 120), hinweis (max. 40, z. B. „Bitte leise“), minuten' },
  aufgabe: { name: 'Aufgaben-Platzhalter', folientyp: 'aufgabe', felder: 'titel (max. 30), sozialform, minuten. Der Aufgabentext wird später von der Lehrkraft eingesetzt.' },
  fokus: { name: 'Fokusfolie (Einstieg)', folientyp: 'inhalt', felder: 'titel (max. 40), satz (max. 110, freier Text: „Wir wollen herausfinden, …“), optional bild = fotorealistisches Impulsbild unten rechts im Hintergrund, nie Comic' },
  uebergang: { name: 'Übergang', folientyp: 'organisation', felder: 'titel (max. 30, z. B. „Jetzt: Pair“), sozialform der NÄCHSTEN Phase, satz (max. 80, genau ein Satz)' },
  sicherung: { name: 'Sicherung', folientyp: 'sicherung', felder: 'titel (max. 30), punkte: 2-4 Stichpunkte (je max. 60)' },
  standard: { name: 'Standardfolie', folientyp: 'organisation', felder: `standard = einer von ${Object.keys(CI_STANDARDFOLIEN).join(', ')}` },
};

export const vorlagenText = () => Object.entries(FOLIEN_VORLAGEN).map(([k, v]) => `- ${k} (${v.name}): ${v.felder}`).join('\n');

const t = { type: 'string' };
export const folieSchema = { type: 'object', properties: {
  titel: t, phase: t, kanal: { type: 'string', enum: ['analog', 'digital'] }, freigabe: t, minuten: { type: 'number' },
  vorlage: { type: 'string', enum: Object.keys(FOLIEN_VORLAGEN) }, standard: t,
  untertitel: t, sozialform: { type: 'string', enum: ['EA', 'PA', 'GA', 'PL'] }, auftrag: t, hinweis: t, satz: t,
  phasen: { type: 'array', items: { type: 'object', properties: { name: t, sozialform: t, satz: t } } },
  punkte: { type: 'array', items: t },
  erklaerung: t, abfrage: t,
} };