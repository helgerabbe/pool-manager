// Anspruchsprofil einer Aktivität (Entwurf 2026-10-06): Warum Methoden im Unterricht scheitern können.
// Skalen 1 = gering … 5 = sehr hoch.
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
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Funktioniert immer und sofort, auch ohne Vorerfahrung. In Klasse 5 und 6 kurz halten und den Ablauf zusätzlich sichtbar machen.',
  },
  'Stummer Impuls': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 4, steuerung: 2 },
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Leicht einzusetzen, wird mit Routine besser. Steht und fällt mit einem wirklich treffenden Impuls. Jüngere Klassen brauchen danach eine klare Beobachtungsfrage.',
  },
  'Provokante These': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 4, lehrkraft: 3, vorbereitung: 2, material: 3, steuerung: 4 },
    jahrgaenge: { 5: 'warnung', 6: 'warnung', 7: 'vereinfachen', 8: 'vereinfachen', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Braucht eine Gruppe, die fair streiten kann, und eine Lehrkraft, die die Diskussion sicher lenkt. In Klasse 5 und 6 nur mit sehr greifbarer These und festen Gesprächsregeln.',
  },
  'Blitzlicht': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 3, lehrkraft: 1, vorbereitung: 1, material: 1, steuerung: 2 },
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Fast ohne Vorbereitung und überall einsetzbar. Ehrliche Antworten gibt es erst in einer Gruppe mit Vertrauen, sonst bleibt es bei „gut“. Als Ritual wirkt es am besten.',
  },
  'Brainstorming / Mindmap': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: { 5: 'vereinfachen', 6: 'vereinfachen', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Muss ein paar Mal geübt werden, bis die Schüler sammeln und ordnen trennen und den Sinn verstehen. In Klasse 5 und 6 mit vorgegebenen Hauptästen beginnen.',
  },
  'Vertieftes Üben im Team': {
    werte: { komplexitaet: 4, einuebung: 4, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 4 },
    jahrgaenge: { 5: 'warnung', 6: 'vereinfachen', 7: 'vereinfachen', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Anspruchsvoll für alle Beteiligten: gutes Material, eingespielte Teams und eine Lehrkraft, die den Prozess im Blick behält. Erst mit kleinen Teamaufgaben anbahnen.',
  },
  'Kartenabfrage': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 2, lehrkraft: 3, vorbereitung: 2, material: 2, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach für die Schüler, die Arbeit liegt beim Clustern: Die Lehrkraft muss Karten zügig und nachvollziehbar ordnen. In Klasse 5 eine Karte pro Kind und klare Schreibregeln.',
  },
  'Vertieftes Üben im Team mit Ämtern': {
    werte: { komplexitaet: 4, einuebung: 5, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Die Ämter geben Halt, müssen aber mehrfach eingeübt werden, bis jedes Kind seine Rolle kennt. Dann läuft es ruhiger als ohne Ämter. Anfangs mit Rollenkarten arbeiten.',
  },
  'Positionslinie / Meinungsbarometer': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 3, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Schnell aufgebaut und bewegt die Klasse. Schüler müssen sich offen positionieren, das braucht ein sicheres Klima. Die Begründung, nicht der Standort, ist der Kern.',
  },
  'Vier-Ecken-Methode': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 3, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht verständlich, aber Bewegung im Raum kann unruhig werden. Gute, wirklich unterschiedliche Antworten in den Ecken sind entscheidend. Gruppendruck („ich gehe zu meinen Freunden“) im Blick behalten.',
  },
  'Think-Pair-Share': {
    werte: { komplexitaet: 2, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Universell einsetzbar und wird mit Routine sehr wirksam. Die stille Denkphase muss konsequent eingehalten werden, sonst fällt sie weg. Zeiten klar ansagen.',
  },
  'Demonstration / Experiment vorführen': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 4, vorbereitung: 4, material: 5, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Für Schüler sehr zugänglich, für die Lehrkraft aufwendig: Aufbau, Probelauf und Sicherheit müssen sitzen. Ein misslungener Versuch ist nur mit Plan B zu retten.',
  },
  'Problemaufriss / Schätzfrage': {
    werte: { komplexitaet: 2, einuebung: 1, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 2 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Weckt schnell Neugier, wenn die Frage gut gewählt ist. Für Jüngere braucht es greifbare Größen. Die Schätzungen sichtbar festhalten, damit später verglichen werden kann.',
  },
  'Wortwolke': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Technisch einfach, braucht aber funktionierende Geräte. Anonyme Eingaben können zu Albernheiten führen, deshalb Moderation einschalten oder Regeln vorher klären.',
  },
  'Mystery / Rätsel': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 5, material: 5, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Sehr motivierend, aber das Material entscheidet alles: Karten müssen exakt zusammenpassen. Jüngere Klassen brauchen weniger Karten und eine Strukturhilfe zum Ordnen.',
  },
  'Gedankenexperiment': {
    werte: { komplexitaet: 4, einuebung: 2, lerngruppe: 3, lehrkraft: 4, vorbereitung: 2, material: 1, steuerung: 3 },
    jahrgaenge: jg('warnung', 'warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Verlangt abstraktes Denken und eine Lehrkraft, die das Gespräch auf das Ziel lenkt. In unteren Jahrgängen nur mit sehr konkretem, alltagsnahem Szenario.',
  },
  'Zwillingsfindung': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 1, vorbereitung: 3, material: 3, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht verständlich, die Arbeit liegt im Vorbereiten passender Kartenpaare. Bei ungerader Schülerzahl einen Joker einplanen. Die kurze Unruhe beim Suchen klar begrenzen.',
  },
  'Objekt-Analyse': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 2, lehrkraft: 3, vorbereitung: 3, material: 4, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Gelingt mit einem aussagekräftigen Objekt und gezielten Leitfragen. Jüngere Schüler beschreiben gern, deuten aber kaum, deshalb Beobachten und Deuten klar trennen.',
  },
  'Lehrervortrag / Input': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 2, lehrkraft: 3, vorbereitung: 3, material: 2, steuerung: 1 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Leicht planbar, aber nur wirksam, wenn er kurz, anschaulich und gut gegliedert ist. In Klasse 5 und 6 höchstens wenige Minuten am Stück und mit Bildern oder Beispielen.',
  },
  'Fragend-entwickelndes Unterrichtsgespräch': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 4, vorbereitung: 3, material: 1, steuerung: 4 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Wirkt einfach, ist aber für die Lehrkraft anspruchsvoll: gute Impulsfragen, Geduld und Lenkung ohne Abfragen. Schnell sprechen nur wenige, deshalb Denkzeit und breite Beteiligung sichern.',
  },
  'Insert-Methode': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 3, material: 3, steuerung: 2 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht ein paar Durchgänge, bis die Zeichen sicher sitzen. Für Jüngere auf zwei Zeichen reduzieren (✓ und ?). Der Text muss zur Lesefähigkeit passen.',
  },
  'Textknacken / Markieren': {
    werte: { komplexitaet: 2, einuebung: 3, lerngruppe: 1, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Ruhige Einzelarbeit, die mit Übung immer besser wird. Ohne klare Regeln markieren Schüler zu viel. Anfangs eine Farbe und eine Leitfrage vorgeben.',
  },
  'Concept Mapping': {
    werte: { komplexitaet: 4, einuebung: 4, lerngruppe: 2, lehrkraft: 3, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Anspruchsvoll, weil die Beziehungen zwischen Begriffen benannt werden müssen. Erst an bekannten Inhalten üben. Jüngere arbeiten mit vorgegebenen Begriffen und Verbindungswörtern.',
  },
  'Begriffe zuordnen': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 1, vorbereitung: 2, material: 3, steuerung: 1 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Läuft sofort und in jeder Klasse. Die Qualität hängt an gut gewählten Paaren: Ähnliche Begriffe machen die Übung anspruchsvoll, zu offensichtliche Paare langweilen.',
  },
  'Digitaler Kurztest': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 2, vorbereitung: 3, material: 4, steuerung: 1 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Für Schüler einfach, der Aufwand liegt in guten Fragen und funktionierenden Geräten. Aussagekräftig wird er erst, wenn die falschen Antworten typische Fehler abbilden.',
  },
  'Fallstudie': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 4, material: 5, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Steht und fällt mit einem authentischen, gut aufbereiteten Fall. Jüngere Klassen brauchen einen kurzen, alltagsnahen Fall und Leitfragen für jeden Schritt.',
  },
  'Fishbowl-Diskussion': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 2, material: 1, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Braucht eine Gruppe, die im Innenkreis offen spricht und im Außenkreis still beobachtet. Ohne Beobachtungsauftrag schaltet der Außenkreis ab.',
  },
  'Flipped Classroom': {
    werte: { komplexitaet: 3, einuebung: 4, lerngruppe: 3, lehrkraft: 3, vorbereitung: 5, material: 5, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Funktioniert nur, wenn die Schüler zuverlässig vorbereitet kommen. Das muss eingeübt werden. Für Unvorbereitete einen Plan haben, sonst zerfällt die Stunde.',
  },
  'Galeriegang / Museumsrundgang': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 2, vorbereitung: 3, material: 3, steuerung: 3 },
    jahrgaenge: jg('ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach im Ablauf, aber nur wirksam mit klarem Beobachtungsauftrag. Ohne Kriterien wird der Rundgang zum Spaziergang. Zeiten pro Station fest vorgeben.',
  },
  'Marktplatz der Ideen': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 3, lehrkraft: 3, vorbereitung: 3, material: 3, steuerung: 4 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Lebendig, aber laut und schwer zu überblicken. Feste Rollen (Standbetreuer, Besucher) und Wechselzeiten geben Halt. Jüngere brauchen eine Besucherkarte mit Fragen.',
  },
  'Merksatz formulieren': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 1, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 1 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Ohne Aufwand einsetzbar, aber das Verdichten fällt schwer. Jüngere brauchen Satzanfänge oder Schlüsselwörter. Merksätze gemeinsam vergleichen und verbessern.',
  },
  'Peer Instruction': {
    werte: { komplexitaet: 2, einuebung: 3, lerngruppe: 2, lehrkraft: 4, vorbereitung: 4, material: 4, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Sehr wirksam, wenn die Konzeptfragen typische Fehlvorstellungen treffen. Die Lehrkraft muss spontan entscheiden, ob diskutiert oder erklärt wird.',
  },
  'Planspiel': {
    werte: { komplexitaet: 5, einuebung: 3, lerngruppe: 4, lehrkraft: 5, vorbereitung: 5, material: 5, steuerung: 5 },
    jahrgaenge: jg('nein', 'warnung', 'warnung', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Die anspruchsvollste Methode für alle Beteiligten: viel Material, klare Spielregeln und eine Lehrkraft als Spielleitung. Unter Klasse 8 nur als stark vereinfachtes Kurzspiel.',
  },
  'Rotierende Schreibkonferenz': {
    werte: { komplexitaet: 3, einuebung: 4, lerngruppe: 3, lehrkraft: 2, vorbereitung: 2, material: 3, steuerung: 2 },
    jahrgaenge: jg('vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Gelingt nur mit klaren Kriterien und respektvollem Ton. Die ersten Runden bringen oft nur Lob oder Rechtschreibung. Mit Kriterienkarte und einem Kriterium pro Runde beginnen.',
  },
  'Schneeball / Pyramidendiskussion': {
    werte: { komplexitaet: 2, einuebung: 2, lerngruppe: 3, lehrkraft: 2, vorbereitung: 1, material: 1, steuerung: 3 },
    jahrgaenge: jg('vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Einfach im Ablauf, aber jede Runde muss echtes Einigen verlangen, sonst wird nur addiert. Zeiten und Zahl der Ergebnisse pro Stufe klar vorgeben.',
  },
  'Schüler unterrichten': {
    werte: { komplexitaet: 4, einuebung: 3, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 3, steuerung: 3 },
    jahrgaenge: jg('warnung', 'vereinfachen', 'vereinfachen', 'ja', 'ja', 'ja', 'ja', 'ja', 'ja'),
    fazit: 'Sehr lernwirksam für die Unterrichtenden, riskant für die Zuhörenden. Die Lehrkraft muss Vorbereitung begleiten und Fehler danach ruhig korrigieren.',
  },
};