// Stundenmodell-Einordnung Einstieg & Aktivierung (Ergänzung 3, 2026-10-14). Gleiche Struktur wie EINORDNUNG_PROBE.
const e = (passung, phasen, hinweis) => ({ passung, phasen, hinweis });
const VW = 'Vorwissen aktivieren / Ausgangsfrage';
const PB = 'Problem/Phänomen begegnen';

// Kurze Aktivierung: stark im Einstieg, Wiederholung und Schnelldiagnose, schwach in Übung.
const aktivierung = (h) => ({
  induktiv: e(3, { [PB]: 'teil', 'Vermutungen bilden': 'teil' }, h.induktiv || 'Kann einen Ausgangspunkt setzen, die Erkundung muss folgen.'),
  deduktiv: e(2, { [VW]: 'kern' }, h.deduktiv || 'Aktiviert Vorwissen, an das die Regel anknüpft.'),
  uebung_kurz: e(4, { 'Übungsfokus klären': 'bedingt' }, 'Höchstens als sehr kurzer Auftakt.'),
  uebung_mittel: e(4, { 'Übungsfokus klären': 'bedingt' }, 'Setzt einen Rahmen, ist aber kein Teil des Übens.'),
  uebung_lang: e(4, { 'Arbeitsplan & Orientierung': 'bedingt' }, 'Trägt kaum zur Orientierung bei.'),
  wiederholung: e(h.wdh || 2, { 'Vorwissen reaktivieren': 'kern', 'Lücken bestimmen': 'teil' }, h.wiederholung || 'Zeigt, was erinnert wird und wo Lücken sind.'),
  vertieft: e(3, { 'Aufgabe & Ziel klären': 'teil' }, h.vertieft || 'Kann die Teamarbeit eröffnen, trägt sie aber nicht.'),
  diagnose_kurz: e(h.diag || 3, { 'Lernstand erheben': 'teil' }, h.diagnose || 'Gibt einen schnellen, groben Einblick.'),
  diagnose_mittel: e(3, { 'Lernstand erheben': 'teil' }, 'Nur mit klaren Kriterien auswertbar.'),
  diagnose_lang: e(4, { 'Nachweise sammeln': 'bedingt' }, 'Für belastbare Nachweise zu knapp.'),
});

// Problemorientierter Einstieg: stark induktiv und in vertiefter Übung.
const problem = (h) => ({
  induktiv: e(1, { [PB]: 'kern', 'Vermutungen bilden': 'kern', 'Vermutungen prüfen': 'teil' }, h.induktiv),
  deduktiv: e(3, { [VW]: 'teil', 'Selbstständiger Transfer': 'teil' }, 'Eröffnet eine Ausgangsfrage oder dient am Ende als Transferaufgabe.'),
  uebung_kurz: e(5, {}, 'Kostet zu viel Übungszeit.'),
  uebung_mittel: e(4, { 'Individuelle Arbeitsphase': 'bedingt' }, 'Nur als kurze Zusatzaufgabe.'),
  uebung_lang: e(3, { 'Längere Übungszeit': 'teil' }, 'Als anspruchsvolle Wahl- oder Zusatzaufgabe möglich.'),
  wiederholung: e(3, { 'Weiterführende Aufgabe': 'teil' }, 'Wendet Wiederholtes auf eine neue Frage an.'),
  vertieft: e(1, { 'Aufgabe & Ziel klären': 'kern', 'Problem erschließen': 'kern' }, h.vertieft),
  diagnose_kurz: e(4, { 'Lernstand erheben': 'bedingt' }, 'Antworten sind schwer schnell vergleichbar.'),
  diagnose_mittel: e(3, { 'Lernstand erheben': 'teil' }, 'Begründungen zeigen Vorstellungen und Denkwege.'),
  diagnose_lang: e(3, { 'Nachweise sammeln': 'teil' }, 'Als Transferteil einer größeren Aufgabe geeignet.'),
});

export const EINORDNUNG_ERGAENZUNG_3 = {
  'Kopfstand-Frage': { ...problem({ induktiv: 'Die umgedrehte Frage erzeugt überraschende Ideen, die zurückübersetzt zur Lösung führen.', vertieft: 'Starker Ideengenerator vor der Teamarbeit.' }),
    vertieft: e(2, { 'Lösungsideen entwickeln': 'kern', 'Problem erschließen': 'teil' }, 'Starker Ideengenerator vor der Teamarbeit.') },
  'Brain Dump': aktivierung({ wdh: 1, diag: 2, wiederholung: 'Alles aufschreiben, was man weiß: ideale Aktivierung und Lückensuche.', diagnose: 'Zeigt schnell, wie viel jeder Einzelne abrufen kann.' }),
  'Satz / Zahl des Tages': aktivierung({ deduktiv: 'Als festes Ritual zum Stundenbeginn, das an die Regel anknüpft.', wiederholung: 'Wiederholt täglich ein Stück Wissen in kleinen Portionen.' }),
  'Odd One Out': aktivierung({ wdh: 1, diag: 2, wiederholung: 'Die Begründungen zeigen, ob Begriffe und Merkmale sicher sitzen.', diagnose: 'Begründungen machen Fehlvorstellungen sichtbar.' }),
  'Zwei Wahrheiten, eine Lüge': aktivierung({ wdh: 1, diag: 2, wiederholung: 'Spielerisches Abrufen; die Lüge deckt Fehlwissen auf.', diagnose: 'Zeigt schnell, welche Aussagen sicher beurteilt werden.' }),
  'Der Alien-Brief': problem({ induktiv: 'Die naive Frage des Aliens zwingt zum Erklären und führt an das Phänomen heran.', vertieft: 'Die Antwort an den Alien ist ein gutes gemeinsames Produkt.' }),
  'Concept Cartoons': problem({ induktiv: 'Konkurrierende Aussagen erzeugen echte Vermutungen, die anschließend geprüft werden.', vertieft: 'Teams begründen, welche Figur recht hat, und prüfen es.' }),
  'Fermi-Aufgaben': problem({ induktiv: 'Offenes Schätzen erzeugt Strategien und Vermutungen, die verglichen werden.', vertieft: 'Teams entwickeln und vergleichen Lösungswege.' }),
  'Punktabfrage': { ...aktivierung({ diag: 2, diagnose: 'Schnelles Gruppenbild der Selbsteinschätzung.' }),
    uebung_mittel: e(3, { 'Nächste Schritte': 'teil' }, 'Selbsteinschätzung am Ende der Übung.'),
    uebung_lang: e(3, { 'Abschlussbilanz': 'teil' }, 'Schnelle sichtbare Bilanz.') },
  'Anonymer Hut': aktivierung({ wiederholung: 'Anonyme Fragen zeigen, was wirklich unklar ist.', diagnose: 'Sammelt offene Fragen, ohne Einzelne bloßzustellen.' }),
  'Soziogramm / Aufstellung im Raum': aktivierung({ induktiv: 'Positionen werden im Raum sichtbar und können begründet werden.', vertieft: 'Macht Positionen vor und nach der Teamarbeit sichtbar.' }),
  'Brainwriting': { ...aktivierung({ wdh: 2 }), vertieft: e(2, { 'Lösungsideen entwickeln': 'kern' }, 'Strukturierte, stille Ideensammlung im Team.') },
  'ABC-Methode': aktivierung({ wdh: 1, diag: 2, wiederholung: 'Zeigt Wortschatz und Vorwissen, leere Buchstaben deuten auf Lücken.', diagnose: 'Schnelle Begriffsabfrage für jeden Einzelnen.' }),
  'Cluster': aktivierung({ wdh: 1, wiederholung: 'Ordnet Vorwissen und macht Zusammenhänge sichtbar.' }),
  'KAWA': aktivierung({}),
  'Bildervergleich': problem({ induktiv: 'Unterschiede und Gemeinsamkeiten führen zu Beobachtungen und Vermutungen.', vertieft: 'Gemeinsamer Ausgangsfall für die Teamarbeit.' }),
  'Freewriting': aktivierung({ wiederholung: 'Freies Schreiben ruft Vorwissen ungefiltert ab.' }),
};