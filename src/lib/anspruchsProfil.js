// Anspruchsprofil einer Aktivität (Entwurf 2026-10-06): Warum Methoden im Unterricht scheitern können.
// Skalen 1 = gering … 5 = sehr hoch.
// MASSSTAB (2026-10-06): Gesamtschule mit heterogenen Lerngruppen, nicht Gymnasium.
// Die Jahrgangseignung beschreibt, ab wann eine durchschnittliche Gesamtschulklasse die Methode trägt.
export const PROFIL_SKALEN = [
  { key: 'komplexitaet', label: 'Methodische Komplexität', frage: 'Wie viel methodisches Können brauchen die Schüler?' },
  { key: 'einuebung', label: 'Einübungsbedarf', frage: 'Wie oft muss die Klasse sie gemacht haben, bis sie gut läuft?' },
  { key: 'lerngruppe', label: 'Anspruch an die Lerngruppe', frage: 'Braucht es eine gefestigte Gruppe und eine gute Beziehung?' },
  { key: 'lehrkraft', label: 'Erfahrung der Lehrkraft', frage: 'Wie sicher muss die Lehrkraft mit der Methode sein?' },
  { key: 'vorbereitung', label: 'Vorbereitungsaufwand', frage: 'Wie viel Zeit kostet die Vorbereitung?' },
  { key: 'material', label: 'Materialabhängigkeit', frage: 'Steht und fällt sie mit gut gemachtem Material?' },
  { key: 'steuerung', label: 'Steuerungsrisiko', frage: 'Wie leicht kann die Lehrkraft die Kontrolle verlieren?' },
];

export const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

// Eignung je Jahrgang: ja = geeignet · vereinfachen = geht, braucht mehr Zeit/Anleitung · warnung = grenzwertig · nein = nicht geeignet
export const EIGNUNG = {
  ja: { label: 'Geeignet', cls: 'bg-green-500' },
  vereinfachen: { label: 'Mit Vereinfachung / mehr Zeit', cls: 'bg-yellow-400' },
  warnung: { label: 'Grenzwertig, deutliche Warnung', cls: 'bg-orange-500' },
  nein: { label: 'Nicht geeignet', cls: 'bg-red-500' },
};

const jg = (...w) => Object.fromEntries(JAHRGAENGE.map((j, i) => [j, w[i]]));

export const PROFIL_PROBE = {
  'Informierender Unterrichtseinstieg': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 1, vorbereitung: 2, material: 2, steuerung: 1 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Funktioniert immer und sofort, auch ohne Vorerfahrung. In den unteren Jahrgängen kurz halten und den Ablauf zusätzlich an der Tafel sichtbar lassen.',
  },
  'Stummer Impuls': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 4, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht einzusetzen, steht und fällt mit einem wirklich treffenden Impuls. Viele Schüler brauchen danach eine klare Beobachtungsfrage, sonst bleibt es beim Raten.',
  },
  'Provokante These': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 2, material: 3, steuerung: 4 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht eine Gruppe, die fair streiten kann, und eine Lehrkraft, die die Diskussion sicher lenkt. Bis Klasse 9 nur mit sehr greifbarer These, festen Gesprächsregeln und Satzanfängen für die Begründung.',
  },
  'Blitzlicht': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 3, lehrkraft: 1, vorbereitung: 1, material: 1, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Fast ohne Vorbereitung einsetzbar. Ehrliche Antworten gibt es erst in einer Gruppe mit Vertrauen, sonst bleibt es bei „gut“. Satzanfänge helfen. Als Ritual wirkt es am besten.',
  },
  'Brainstorming / Mindmap': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Das Sammeln gelingt allen, das Ordnen zur Mindmap fällt vielen schwer. Bis Klasse 8 mit vorgegebenen Hauptästen arbeiten und die Mindmap gemeinsam an der Tafel ordnen.',
  },
  'Vertieftes Üben im Team': {
    werte: { komplexitaet: 4, einuebung: 4, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 4 },
    jahrgaenge: jg('warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Anspruchsvoll für alle Beteiligten: gutes Material, eingespielte Teams und eine Lehrkraft, die den Prozess im Blick behält. Über mehrere Jahre mit kleinen, klar begrenzten Teamaufgaben anbahnen.',
  },
  'Kartenabfrage': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 2, lehrkraft: 3, vorbereitung: 2, material: 2, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach für die Schüler, die Arbeit liegt beim Clustern durch die Lehrkraft. In den unteren Jahrgängen eine Karte pro Kind, ein Stichwort pro Karte und große Schrift.',
  },
  'Vertieftes Üben im Team mit Ämtern': {
    werte: { komplexitaet: 4, einuebung: 5, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Die Ämter geben gerade schwächeren Gruppen Halt, müssen aber über Monate eingeübt werden. Anfangs mit Rollenkarten und wenigen Ämtern arbeiten. Mit Routine läuft es ruhiger als ohne Ämter.',
  },
  'Positionslinie / Meinungsbarometer': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 3, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Schnell aufgebaut und bewegt die Klasse. Schüler müssen sich offen positionieren, das braucht ein sicheres Klima. Für die Begründung Satzanfänge vorgeben, denn sie ist der eigentliche Kern.',
  },
  'Vier-Ecken-Methode': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 3, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht verständlich, aber Bewegung im Raum kann unruhig werden. Klare Zeit- und Lautstärkeregeln setzen. Gruppendruck („ich gehe zu meinen Freunden“) im Blick behalten.',
  },
  'Think-Pair-Share': {
    werte: { komplexitaet: 2, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Universell einsetzbar und besonders wertvoll in heterogenen Klassen, weil alle erst allein denken. Die stille Phase muss konsequent eingehalten und mit einem Schreibauftrag gesichert werden.',
  },
  'Demonstration / Experiment vorführen': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 4, vorbereitung: 4, material: 5, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Für Schüler sehr zugänglich, für die Lehrkraft aufwendig: Aufbau, Probelauf und Sicherheit müssen sitzen. Einen klaren Beobachtungsauftrag geben, sonst wird nur zugeschaut.',
  },
  'Problemaufriss / Schätzfrage': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Weckt schnell Neugier, wenn die Frage alltagsnah ist. Greifbare Größen wählen, die die Schüler aus ihrem Leben kennen. Schätzungen sichtbar festhalten, damit später verglichen werden kann.',
  },
  'Wortwolke': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 3, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Technisch einfach, braucht aber funktionierende Geräte. Anonyme Eingaben führen schnell zu Albernheiten, deshalb Moderation einschalten und Regeln vorher klären.',
  },
  'Mystery / Rätsel': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 5, material: 5, steuerung: 3 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Sehr motivierend, aber das Vernetzen vieler Informationen überfordert schnell. Bis Klasse 9 mit wenigen Karten (etwa 10 bis 15), einfacher Sprache und einer Strukturhilfe zum Ordnen arbeiten.',
  },
  'Gedankenexperiment': {
    werte: { komplexitaet: 4, einuebung: 2, lerngruppe: 3, lehrkraft: 4, vorbereitung: 2, material: 1, steuerung: 3 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Verlangt abstraktes Denken, das vielen Schülern erst spät gelingt. Bis Klasse 10 nur mit sehr konkretem, alltagsnahem Szenario und gelenkten Fragen Schritt für Schritt.',
  },
  'Zwillingsfindung': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 1, vorbereitung: 3, material: 3, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht verständlich, die Arbeit liegt im Vorbereiten passender Kartenpaare. Bei ungerader Schülerzahl einen Joker einplanen. Die Unruhe beim Suchen klar begrenzen.',
  },
  'Objekt-Analyse': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 2, lehrkraft: 3, vorbereitung: 3, material: 4, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Beschreiben gelingt fast allen, Deuten fällt vielen lange schwer. Beobachten und Deuten klar trennen und für das Deuten gezielte Leitfragen vorgeben.',
  },
  'Lehrervortrag / Input': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 3, vorbereitung: 3, material: 2, steuerung: 1 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht planbar, aber nur wirksam, wenn er kurz, anschaulich und gut gegliedert ist. In der Mittelstufe höchstens wenige Minuten am Stück, mit Bildern, Beispielen und einer Mitschreibhilfe.',
  },
  'Fragend-entwickelndes Unterrichtsgespräch': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 4, vorbereitung: 3, material: 1, steuerung: 4 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Wirkt einfach, ist für die Lehrkraft aber anspruchsvoll. In heterogenen Klassen sprechen schnell nur wenige, deshalb Denkzeit, Partnerabsprache und breite Beteiligung sichern.',
  },
  'Insert-Methode': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 3, material: 3, steuerung: 2 },
    jahrgaenge: jg('warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht viele Durchgänge, bis die Zeichen sicher sitzen, und einen Text, der zur Lesefähigkeit passt. Bis Klasse 9 auf zwei Zeichen reduzieren (✓ und ?) und kurze Texte wählen.',
  },
  'Textknacken / Markieren': {
    werte: { komplexitaet: 2, einuebung: 3, lerngruppe: 1, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Ruhige Einzelarbeit, die mit Übung immer besser wird. Ohne klare Regeln markieren Schüler den halben Text. Lange eine Farbe, eine Leitfrage und eine Höchstzahl an Markierungen vorgeben.',
  },
  'Concept Mapping': {
    werte: { komplexitaet: 5, einuebung: 4, lerngruppe: 2, lehrkraft: 3, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: jg('nein', 'nein', 'warnung', 'warnung', 'warnung', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Sehr anspruchsvoll, weil die Beziehungen zwischen Begriffen selbst benannt werden müssen. Frühestens ab Klasse 10 einführen, zuerst an bekannten Inhalten und mit vorgegebenen Begriffen und Verbindungswörtern.',
  },
  'Begriffe zuordnen': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 1, vorbereitung: 2, material: 3, steuerung: 1 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Läuft sofort und in jeder Klasse, gut auch für schwächere Schüler. Die Qualität hängt an gut gewählten Paaren. Über die Zahl der Paare lässt sich leicht differenzieren.',
  },
  'Digitaler Kurztest': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 2, vorbereitung: 3, material: 4, steuerung: 1 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Für Schüler einfach, der Aufwand liegt in guten Fragen und funktionierenden Geräten. Aussagekräftig wird er erst, wenn die falschen Antworten typische Fehler abbilden. Einfache Sprache verwenden.',
  },
  'Fallstudie': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 4, material: 5, steuerung: 3 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Steht und fällt mit einem authentischen, gut aufbereiteten Fall. In der Mittelstufe einen kurzen, alltagsnahen Fall in einfacher Sprache wählen und für jeden Schritt Leitfragen vorgeben.',
  },
  'Fishbowl-Diskussion': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 2, material: 1, steuerung: 4 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht eine Gruppe, die im Innenkreis offen spricht und im Außenkreis still beobachtet. Bis Klasse 9 kurze Runden, Rollenkarten und einen klaren Beobachtungsbogen für den Außenkreis.',
  },
  'Flipped Classroom': {
    werte: { komplexitaet: 3, einuebung: 4, lerngruppe: 3, lehrkraft: 3, vorbereitung: 5, material: 5, steuerung: 4 },
    jahrgaenge: jg('warnung', 'warnung', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Funktioniert nur, wenn die Schüler zuverlässig vorbereitet kommen, das ist in der Mittelstufe selten. Besser die Vorbereitung in der Schule erledigen lassen (z. B. in der Poolzeit) und immer einen Plan für Unvorbereitete haben.',
  },
  'Galeriegang / Museumsrundgang': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 2, vorbereitung: 3, material: 3, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach im Ablauf, aber nur wirksam mit klarem Beobachtungsauftrag. Ohne Kriterien wird der Rundgang zum Spaziergang. Zeiten pro Station fest vorgeben und Rückmeldezettel mit Satzanfängen nutzen.',
  },
  'Marktplatz der Ideen': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 3, material: 3, steuerung: 4 },
    jahrgaenge: jg('warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Lebendig, aber laut und schwer zu überblicken. Feste Rollen (Standbetreuer, Besucher), Wechselzeiten und eine Besucherkarte mit Fragen sind lange nötig.',
  },
  'Merksatz formulieren': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 1, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 1 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Ohne Aufwand einsetzbar, aber das Verdichten fällt vielen schwer. Lange mit Satzanfängen, Schlüsselwörtern oder einem Lückensatz arbeiten. Merksätze gemeinsam vergleichen und verbessern.',
  },
  'Peer Instruction': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 3, lehrkraft: 4, vorbereitung: 4, material: 4, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Wirksam, wenn die Konzeptfragen typische Fehlvorstellungen treffen. Das Überzeugen des Partners braucht Begründungshilfen. Die Lehrkraft muss spontan entscheiden, ob diskutiert oder erklärt wird.',
  },
  'Planspiel': {
    werte: { komplexitaet: 5, einuebung: 3, lerngruppe: 4, lehrkraft: 5, vorbereitung: 5, material: 5, steuerung: 5 },
    jahrgaenge: jg('nein', 'nein', 'nein', 'warnung', 'warnung', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Die anspruchsvollste Methode für alle Beteiligten: viel Material, klare Spielregeln und eine Lehrkraft als Spielleitung. Vor Klasse 10 nur als stark vereinfachtes Kurzspiel mit wenigen Rollen.',
  },
  'Rotierende Schreibkonferenz': {
    werte: { komplexitaet: 3, einuebung: 4, lerngruppe: 3, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 2 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Gelingt nur mit klaren Kriterien und respektvollem Ton. Die ersten Runden bringen oft nur Lob oder Rechtschreibung. Lange mit Kriterienkarte und nur einem Kriterium pro Runde arbeiten.',
  },
  'Schneeball / Pyramidendiskussion': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach im Ablauf, aber jede Runde muss echtes Einigen verlangen, sonst wird nur addiert. In den unteren Jahrgängen höchstens zwei Stufen, mit klaren Zeiten und fester Ergebniszahl.',
  },
  'Schüler unterrichten': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 3, steuerung: 3 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Sehr lernwirksam für die Unterrichtenden, riskant für die Zuhörenden. In der Mittelstufe nur kurze, eng vorbereitete Erklärsequenzen mit Vorlage. Fehler danach ruhig korrigieren.',
  },
  'WebQuest': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 5, material: 5, steuerung: 4 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja'),
    fazit: 'Steht und fällt mit geprüften, leicht lesbaren Quellen und einem klaren Auftrag. Ohne Struktur surfen die Schüler ziellos. Bis Klasse 10 wenige Links, einfache Texte und ein Rechercheleitfaden.',
  },
  'World Café': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 3, material: 2, steuerung: 4 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Lebt von guten Leitfragen und verlässlichen Gastgebern an den Tischen. Ohne feste Wechselzeiten und Schreibauftrag wird geplaudert. In der Mittelstufe wenige Tische, kurze Runden und vorher bestimmte Gastgeber.',
  },
  'Zeitstrahl erstellen': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 1, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Gut planbar und für alle zugänglich. Schwierig sind Maßstab und Abstände, deshalb lange eine Vorlage mit Skala vorgeben. Begründungen machen ihn aussagekräftig.',
  },
  'Arbeitsteilige Gruppenarbeit': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht gleichwertige Teilaufgaben und eine klare Zusammenführung, sonst kennt jede Gruppe nur ihren Teil. Rollenkarten und ein Ergebnisblatt für alle sichern das Wissen der ganzen Klasse.',
  },
};