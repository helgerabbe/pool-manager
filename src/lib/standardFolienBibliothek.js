// Standardfolien-Galerie (2026-10-24): alle wiederkehrenden Folien („Meso-Elemente“) in EINER einheitlichen Struktur.
// Jede Standardfolie: key, name, folientyp, schueler/lehrer (Beschreibung), gestaltung, inhalt, titel, klaeren.
// Darstellung: entweder als feste CI-Grafik (Teil 15) oder über eine Folienvorlage (folie).
// Geklärt wird von der Lehrkraft oder vom Unterrichtsassistenten. Der Grafikassistent greift zuerst auf diese Folien zurück.
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';
import { CI_REGELN } from '@/lib/standardFolienRegeln';
import { EINSATZ, FOLIEN_EINSATZ } from '@/lib/standardFolienEinsatz';

const VORLAGEN_FOLIEN = [
  { key: 'notizen', name: 'Eigene Notizen machen', folientyp: 'aufgabe',
    schueler: 'Aufgabe oben, darunter ein großes Notizfeld.', lehrer: 'Keine eigene Tafelfolie: An der Tafel steht entweder die Aufgabe (Aufgabenerklärung) oder die interaktive Tafel der Arbeitsphase.', tablet_format: true,
    gestaltung: ['Reines Tablet-Format: Aufgabe oben, darunter großes Notizfeld', 'Tafel: Aufgabenerklärung oder interaktive Tafel der Arbeitsphase'],
    inhalt: ['Aufgabe als 1-2 konkrete Leitfragen zum Thema', 'Arbeitsweise kurz: „Arbeite allein und leise.“'],
    titel: ['Mach dir mal Notizen', 'Was fällt dir dazu ein?'],
    klaeren: ['Was genau notiert werden soll'],
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Mach dir mal Notizen', sozialform: 'EA', leise: true, minuten: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Was spricht für deine Meinung? Was spricht dagegen?' } },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', folientyp: 'aufgabe',
    schueler: 'Satzanfang antippen, er erscheint im Textfeld, der Schüler schreibt den Satz zu Ende.', lehrer: 'Keine eigene Tafelfolie: An der Tafel steht entweder die Aufgabe (Aufgabenerklärung) oder die interaktive Tafel der Arbeitsphase.', tablet_format: true,
    gestaltung: ['Reines Tablet-Format: Satzanfänge (höchstens vier) antippen, Satz im Textfeld zu Ende schreiben', 'Tafel: Aufgabenerklärung oder interaktive Tafel der Arbeitsphase'],
    inhalt: ['Aufgabe sagt, wie viele Satzanfänge gewählt werden', 'Satzanfänge passen genau zur Aufgabe und enden mit „…“'],
    titel: ['Schreib deine Gedanken auf', 'Vervollständige …'],
    klaeren: ['Welche Satzanfänge (2-4)', 'Wie viele die Schüler ergänzen'],
    folie: { vorlage: 'satzanfaenge', folientyp: 'aufgabe', titel: 'Schreib deine Gedanken auf', sozialform: 'EA', minuten: 4, inhalt: 'Wähle zwei Satzanfänge und ergänze sie.', satzimpulse: ['Ich finde, dass …', 'Ein Grund dafür ist …', 'Dagegen spricht …'] } },
];

// Aufgabenfolien in fester Reihenfolge: Einzel-, Partner-, Gruppenarbeit.
const VORNE = ['einzelphase', 'partnerphase', 'gruppenphase', 'arbeitsphase_analog'];
const rang = (k) => (VORNE.includes(k) ? VORNE.indexOf(k) : VORNE.length);
const CI_FOLIEN = Object.entries(CI_STANDARDFOLIEN).sort(([a], [b]) => rang(a) - rang(b)).map(([key, v]) => ({ key, ...v, ...CI_REGELN[key], ci: true }));

export const STANDARD_FOLIEN = [...CI_FOLIEN, ...VORLAGEN_FOLIEN];

const liste = (a = []) => a.join('; ');
export const standardFolienText = () => STANDARD_FOLIEN.map((s) =>
  `- ${s.key} (${s.name}): ${s.ci ? `vorlage "standard", standard "${s.key}"` : `vorlage "${s.folie.vorlage}"`}, Einsatz: ${EINSATZ[FOLIEN_EINSATZ[s.key]].name}\n  Gestaltung: ${liste(s.gestaltung)}\n  Inhalt: ${liste(s.inhalt)}\n  Titel im Stil von: ${(s.titel || []).map((x) => `„${x}“`).join(', ')}\n  Muss geklärt werden (in "entscheidungen" übernehmen): ${liste(s.klaeren)}`).join('\n');