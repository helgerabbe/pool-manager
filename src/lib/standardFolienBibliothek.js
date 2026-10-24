// Standardfolien (2026-10-24): wiederkehrende Bausteine („Meso-Elemente“) einer Methode.
// Sie bestehen aus Layoutvorlagen (Mikro-Elemente) und sehen immer gleich aus; der Grafikassistent greift zuerst auf sie zurück.
export const STANDARD_FOLIEN = [
  { key: 'notizen', name: 'Eigene Notizen machen', wann: 'Schüler halten allein Gedanken fest.', lehrkraft: 'Was notiert werden soll.',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Mach dir mal Notizen', sozialform: 'EA', leise: true, minuten: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Was spricht für deine Meinung? Was spricht dagegen?' } },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', wann: 'Schüler schreiben zu vorgegebenen Satzanfängen.', lehrkraft: 'Welche Satzanfänge und wie viele (2-4).',
    folie: { vorlage: 'satzanfaenge', folientyp: 'aufgabe', titel: 'Schreib deine Gedanken auf', sozialform: 'EA', minuten: 4, inhalt: 'Wähle zwei Satzanfänge und ergänze sie.', satzimpulse: ['Ich finde, dass …', 'Ein Grund dafür ist …', 'Dagegen spricht …'] } },
  { key: 'abstimmung', name: 'Abstimmung in der Klasse', wann: 'Die Klasse bezieht Position, die App zählt die Stimmen.', lehrkraft: 'Abstufung der Abstimmung (2, 3 oder 5 Stufen).',
    folie: { vorlage: 'abstimmung', folientyp: 'reflexion', titel: 'Wie stehst du dazu?', abstimmung: 'auswaehlen', minuten: 1, punkte: ['Stimme zu', 'Stimme eher zu', 'Unentschieden', 'Eher dagegen', 'Dagegen'] } },
  { key: 'sammlung', name: 'Ergebnisse sammeln', wann: 'Die Lehrkraft schreibt an der Tafel mit.', lehrkraft: 'Leitfrage der Sammlung.',
    folie: { vorlage: 'sammlung', folientyp: 'reflexion', titel: 'Was habt ihr herausgefunden?', frage: 'Welche Gründe habt ihr gefunden?' } },
  { key: 'partner', name: 'Partner finden', wann: 'Wechsel in die Partnerarbeit.', lehrkraft: 'Art der Partnersuche.',
    folie: { vorlage: 'partnersuche', folientyp: 'organisation', partnersuche: 'frei', minuten: 2 } },
];

export const standardFolienText = () => STANDARD_FOLIEN.map((s) => `- ${s.key} (${s.name}): vorlage "${s.folie.vorlage}"; wann: ${s.wann} Lehrkraft entscheidet: ${s.lehrkraft}`).join('\n');