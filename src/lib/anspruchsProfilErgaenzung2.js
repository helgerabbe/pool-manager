// Anspruchsprofile Einstieg & Aktivierung (Ergänzung 2, 2026-10-14). Maßstab: Gesamtschule, heterogene Lerngruppen.
const J = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];
const jg = (...w) => Object.fromEntries(J.map((j, i) => [j, w[i]]));
const alle = jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja');
const p = (k, e, l, lk, v, m, s, jahrgaenge, fazit) => ({
  werte: { komplexitaet: k, einuebung: e, lerngruppe: l, lehrkraft: lk, vorbereitung: v, material: m, steuerung: s },
  jahrgaenge, fazit,
});

export const PROFIL_ERGAENZUNG_2 = {
  'Kopfstand-Frage': p(3, 2, 2, 3, 2, 1, 3, jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Das Umdrehen der Frage macht Spaß, die Rückübersetzung ins Positive ist aber der schwierige Schritt. Jüngere Klassen brauchen dafür ein Beispiel und eine gemeinsame erste Runde.'),
  'Brain Dump': p(1, 1, 1, 1, 1, 1, 1, alle,
    'Kaum Aufwand, kaum Risiko. Schwächere Schüler schreiben anfangs wenig; eine feste Zeit und ein kurzer Partnervergleich danach helfen, ohne bloßzustellen.'),
  'Satz / Zahl des Tages': p(1, 2, 1, 1, 2, 2, 1, alle,
    'Lebt von der Regelmäßigkeit. Die Auswahl eines ergiebigen Satzes oder einer Zahl ist die eigentliche Arbeit der Lehrkraft, danach läuft es fast von selbst.'),
  'Odd One Out': p(2, 1, 2, 2, 2, 3, 2, alle,
    'Leicht verständlich und offen: Es gibt oft mehrere richtige Begründungen. Gerade das muss die Lehrkraft aushalten und würdigen, sonst wird es ein Ratespiel nach der einen Lösung.'),
  'Zwei Wahrheiten, eine Lüge': p(2, 1, 3, 2, 2, 2, 3, alle,
    'Sehr aktivierend. Wenn Schüler selbst Aussagen formulieren, braucht es klare Regeln, damit es fachlich bleibt und niemand vorgeführt wird.'),
  'Der Alien-Brief': p(3, 2, 2, 2, 3, 3, 2, jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Die fremde Perspektive zwingt zu genauem Erklären. Der Brief muss gut geschrieben sein; jüngere Klassen brauchen Satzanfänge für die Antwort.'),
  'Concept Cartoons': p(3, 2, 2, 3, 3, 4, 3, jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Steht und fällt mit gut gewählten Fehlvorstellungen im Cartoon. Die Lehrkraft muss die Diskussion offen halten und darf die richtige Figur nicht zu früh verraten.'),
  'Fermi-Aufgaben': p(4, 3, 2, 3, 2, 1, 3, jg('warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Offenes Schätzen überfordert schwächere Schüler leicht. Hilfekarten mit Teilfragen und Vergleichsgrößen machen die Methode auch in heterogenen Klassen tragfähig.'),
  'Punktabfrage': p(1, 1, 2, 1, 1, 1, 1, alle,
    'Schnell, anonym möglich und für alle verständlich. Aussagekräftig wird sie erst, wenn das Ergebnis kurz besprochen wird.'),
  'Anonymer Hut': p(2, 2, 3, 3, 1, 1, 3, jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Senkt die Hemmschwelle für Fragen und Meinungen. Die Lehrkraft muss vorlesen können, ohne zu werten, und unpassende Zettel souverän übergehen.'),
  'Soziogramm / Aufstellung im Raum': p(3, 2, 4, 3, 2, 1, 4, jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Macht Positionen körperlich sichtbar, ist aber sozial heikel. Nur mit gefestigter Gruppe und klaren Regeln einsetzen; persönliche Fragen vermeiden.'),
  'Brainwriting': p(2, 2, 2, 2, 2, 2, 2, jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Ruhiger als Brainstorming, alle kommen zu Wort. Das Weiterschreiben auf fremden Ideen muss einmal vorgemacht werden.'),
  'ABC-Methode': p(1, 1, 1, 1, 1, 1, 1, alle,
    'Fast ohne Aufwand. Schwierige Buchstaben dürfen frei bleiben; ein Partnervergleich danach füllt Lücken und zeigt Vorwissen.'),
  'Cluster': p(2, 1, 1, 1, 1, 1, 1, alle,
    'Einfach und frei. Ohne Auftrag zum Ordnen bleibt es eine Wortsammlung; ein zweiter Schritt mit Oberbegriffen bringt Struktur.'),
  'KAWA': p(2, 2, 1, 1, 1, 1, 1, jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Kurz und spielerisch. Die Assoziationen zu jedem Buchstaben sind für jüngere Schüler anfangs schwer; ein gemeinsames Beispiel hilft.'),
  'Bildervergleich': p(2, 1, 2, 2, 3, 4, 2, alle,
    'Hängt ganz an der Bildauswahl. Gezielte Beobachtungsaufträge verhindern, dass es bei oberflächlichen Unterschieden bleibt.'),
  'Freewriting': p(2, 3, 2, 1, 1, 1, 2, jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    'Ununterbrochenes Schreiben fällt vielen anfangs schwer. Kurze Zeiten, ein Satzanfang und die Zusicherung, dass nichts bewertet wird, machen den Einstieg leicht.'),
  'Literarisches Unterrichtsgespräch': {
    werte: { komplexitaet: 4, einuebung: 4, lerngruppe: 4, lehrkraft: 5, vorbereitung: 2, material: 1, steuerung: 4 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Steht und fällt mit der Textauswahl und der Zurückhaltung der Lehrkraft. Das Ritual mit festen Runden muss mehrfach geübt werden. In den Jahrgängen 5 und 6 kurze Texte und eine kürzere Gesprächsphase wählen.',
  },
  'Lautes Denken': {
    werte: { komplexitaet: 3, einuebung: 4, lerngruppe: 3, lehrkraft: 3, vorbereitung: 2, material: 1, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Wirkt erst, wenn die Lehrkraft es mehrfach vormacht. Viele Schüler erklären sonst nachträglich statt laut zu denken. Kontrollfragen auf Karten und klare Rollen im Tandem helfen, gerade in den unteren Jahrgängen.',
  },
};