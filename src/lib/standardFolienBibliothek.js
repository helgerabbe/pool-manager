// Standardfolien (2026-10-24): wiederkehrende Bausteine („Meso-Elemente“) einer Methode.
// Jede Standardfolie trägt ihre eigenen Regeln: Gestaltung (grafisch), Inhalt (sprachlich), Titelbeispiele und feste Entscheidungen der Lehrkraft.
// Der Grafikassistent greift zuerst auf sie zurück und hält sich an diese Regeln.
export const STANDARD_FOLIEN = [
  { key: 'notizen', name: 'Eigene Notizen machen', wann: 'Schüler halten allein Gedanken fest.',
    gestaltung: ['Tafel: Titel, grüne Methodenbox (Arbeitsweise), blaue Aufgabenbox', 'Tablet: Aufgabe oben, darunter großes Notizfeld', 'Stille-Zeichen oben rechts, Timer'],
    inhalt: ['Aufgabe als 1-2 konkrete Leitfragen zum Thema', 'Arbeitsweise kurz: „Arbeite allein und leise.“'],
    titel: ['Mach dir mal Notizen', 'Was fällt dir dazu ein?'],
    entscheidungen: ['Was genau notiert werden soll'],
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Mach dir mal Notizen', sozialform: 'EA', leise: true, minuten: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Was spricht für deine Meinung? Was spricht dagegen?' } },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', wann: 'Schüler schreiben zu vorgegebenen Satzanfängen.',
    gestaltung: ['Tafel: Satzanfänge als pastellfarbene Sprechblasen, höchstens vier', 'Tablet: Satzanfänge antippen, Satz im Textfeld zu Ende schreiben', 'Timer'],
    inhalt: ['Aufgabe sagt, wie viele Satzanfänge gewählt werden', 'Satzanfänge passen genau zur Aufgabe und enden mit „…“'],
    titel: ['Schreib deine Gedanken auf', 'Vervollständige …'],
    entscheidungen: ['Welche Satzanfänge (2-4)', 'Wie viele die Schüler ergänzen'],
    folie: { vorlage: 'satzanfaenge', folientyp: 'aufgabe', titel: 'Schreib deine Gedanken auf', sozialform: 'EA', minuten: 4, inhalt: 'Wähle zwei Satzanfänge und ergänze sie.', satzimpulse: ['Ich finde, dass …', 'Ein Grund dafür ist …', 'Dagegen spricht …'] } },
  { key: 'abstimmung', name: 'Abstimmung in der Klasse', wann: 'Die Klasse bezieht Position, die App zählt die Stimmen.',
    gestaltung: ['Tafel: Titel und Antwortstufen, Ergebnis erscheint live', 'Tablet: große Antwortknöpfe', 'Timer'],
    inhalt: ['Satz passt zur Art: bei Positionen „Wie stehst du dazu? Wähle deine Antwort.“', 'Nichts verraten, was später kommt (nicht „Erste Abstimmung“)', 'Zugang, Code oder Tool sind nie Thema, das läuft über die App'],
    titel: ['Wie stehst du dazu?', 'Und, wie stimmst du ab?'],
    entscheidungen: ['Abstufung der Abstimmung: 2, 3 oder 5 Stufen'],
    folie: { vorlage: 'abstimmung', folientyp: 'reflexion', titel: 'Wie stehst du dazu?', abstimmung: 'auswaehlen', minuten: 1, punkte: ['Stimme zu', 'Stimme eher zu', 'Unentschieden', 'Eher dagegen', 'Dagegen'] } },
  { key: 'sammlung', name: 'Ergebnisse sammeln', wann: 'Die Lehrkraft schreibt an der Tafel mit.',
    gestaltung: ['Tafel: Leitfrage und leere Liste, live gefüllt', 'Tablet: eigene Notizen des Schülers, Meldeknopf', 'Kein Merksatz'],
    inhalt: ['Leitfrage als direkte Frage an die Klasse'],
    titel: ['Was habt ihr herausgefunden?', 'Was denkt ihr?'],
    entscheidungen: ['Leitfrage der Sammlung'],
    folie: { vorlage: 'sammlung', folientyp: 'reflexion', titel: 'Was habt ihr herausgefunden?', frage: 'Welche Gründe habt ihr gefunden?' } },
  { key: 'partner', name: 'Partner finden', wann: 'Wechsel in die Partnerarbeit.',
    gestaltung: ['Festes Bild und fester Satz je Art der Partnersuche', 'Timer optional'],
    inhalt: ['Kein eigener Text, die Folie ist vollständig festgelegt'],
    titel: ['Such dir jemanden'],
    entscheidungen: ['Art der Partnersuche: frei, Nachbar, Los oder Lerntempo-Duett'],
    folie: { vorlage: 'partnersuche', folientyp: 'organisation', partnersuche: 'frei', minuten: 2 } },
];

const liste = (a) => a.join('; ');
export const standardFolienText = () => STANDARD_FOLIEN.map((s) =>
  `- ${s.key} (${s.name}): vorlage "${s.folie.vorlage}"; wann: ${s.wann}\n  Gestaltung: ${liste(s.gestaltung)}\n  Inhalt: ${liste(s.inhalt)}\n  Titel im Stil von: ${s.titel.map((x) => `„${x}“`).join(', ')}\n  Entscheidungen der Lehrkraft (in "entscheidungen" übernehmen): ${liste(s.entscheidungen)}`).join('\n');