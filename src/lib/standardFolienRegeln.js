// Regeln je Standardfolie aus Teil 15 (2026-10-24): Gestaltung, Inhalt, Titel, was geklärt werden muss.
// Geklärt wird von der Lehrkraft oder vom Unterrichtsassistenten.
export const CI_REGELN = {
  begruessung: {
    gestaltung: ['Großer Gruß, darunter Thema und Foto im Bildrahmen', 'Lehrergerät: Anmeldezähler, optional „Wer fehlt noch?“'],
    inhalt: ['Nur Gruß und Thema der Stunde, keine Aufgabe', 'Foto passt zum Thema, fotorealistisch'],
    titel: ['Guten Morgen!', 'Schön, dass ihr da seid!'],
    klaeren: ['Thema der Stunde', 'Motiv des Fotos'],
  },
  start: {
    gestaltung: ['Oben klein Fach und Einheit, groß das Thema', 'Zuschaltbar: Stundenziel (gelbe Box) und Ablauf (max. 4 Punkte)'],
    inhalt: ['Stundenziel als „Am Ende der Stunde kannst du …“', 'Ablauf in Schülersprache, ohne Phasenbegriffe'],
    titel: ['Darum geht es heute', 'Heute schaffen wir …'],
    klaeren: ['Wird das Stundenziel gezeigt?', 'Wird der Ablauf gezeigt, mit welchen Punkten?'],
  },
  ankuendigung: {
    gestaltung: ['Große Überschrift und ein Satz', 'Keine Aufgabenbox, kein Sozialform-Symbol, kein Timer', 'Optional ein fotorealistischer Bildimpuls'],
    inhalt: ['Satz mit Signalwort „jetzt“ oder „als Nächstes“', 'Verlangt die Methode einen Impuls, steht der Impuls selbst da'],
    titel: ['Was meinst du dazu?', 'Schau mal genau hin'],
    klaeren: ['Überschrift und Fokus-Satz', 'Gibt es einen Bildimpuls, mit welchem Motiv?'],
  },
  zuhoeren: {
    gestaltung: ['Tablet: Ohr- und Stille-Symbol im Pastellkreis, ein fester Satz, kein Weiter', 'Tafel zeigt den eigentlichen Inhalt'],
    inhalt: ['Satz ist fest, wird nicht verändert'],
    titel: ['Hör gut zu'],
    klaeren: ['Darf eine Notiz gemacht werden?'],
  },
  partner: {
    gestaltung: ['Tablet: Satz, Eingabefeld mit Namensvorschlägen, grüne Bestätigung', 'Tafel: festes Raster „Wer arbeitet mit wem?“ (6 × 3 Kacheln)'],
    inhalt: ['Kein eigener Text, die Folie ist vollständig festgelegt'],
    titel: ['Such dir einen Partner.'],
    klaeren: ['Sind Dreier erlaubt?', 'Ist „Ich arbeite allein“ zuschaltbar?'],
  },
  partner_analog: {
    gestaltung: ['Links Aquarellbild zur Art, rechts Symbol, Name der Art und ein Satz', 'Kein Gerät, keine Partnernummer'],
    inhalt: ['Genau ein fester Satz je Art'],
    titel: ['Such dir jemanden'],
    klaeren: ['Art der Partnersuche: frei, Sitznachbar, Losen oder Lerntempo-Duett'],
  },
  partnerphase: {
    gestaltung: ['Funktionstafel (digital): groß nur Sozialform, Lautstärke und der feste Satz, keine Aufgabe', 'Menü oben links: Anzeigen an/aus (Timer, Fortschritt je Paar, Hilfe-Warteschlange, Lärmampel, Sterne, Experten, Klassenziel, Stimmung)', 'Oben rechts Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp, Zufallsauswahl', 'Tablet: die Aufgabe, Partner-Symbol und Zahl oben rechts'],
    inhalt: ['Aufgabe als konkrete Leitfragen (nur auf dem Tablet)', 'Fester Satz „Ihr arbeitet zu zweit.“ + Satz der Lautstärke'],
    titel: ['Tauscht euch aus', 'Was denkt ihr zu zweit?'],
    klaeren: ['Aufgabe der Partnerarbeit', 'Hat die Aufgabe mehrere Schritte (Fortschrittsbalken) oder nur einen (nur fertig)?', 'Gibt es eine Zusatzaufgabe für schnelle Paare?', 'Lautstärke zu Beginn: Flüsterstimme oder „Achtet auf eure Lautstärke“ (live umschaltbar, Lärmampel live zuschaltbar)'],
  },
  gruppenphase: {
    gestaltung: ['Funktionstafel (digital): groß nur Sozialform, Lautstärke und der feste Satz, keine Aufgabe', 'Menü oben links: Anzeigen an/aus (Timer, Fortschritt je Gruppe in Gruppenfarbe, Hilfe-Warteschlange, Lärmampel, Sterne, Experten, Klassenziel, Stimmung)', 'Oben rechts Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp, Zufallsauswahl', 'Tablet: die Aufgabe, Gruppen-Symbol und Buchstabe in Gruppenfarbe'],
    inhalt: ['Aufgabe als konkrete Leitfragen (nur auf dem Tablet)', 'Rollen nur, wenn die Methode sie vorsieht'],
    titel: ['Legt los als Team', 'Was findet ihr heraus?'],
    klaeren: ['Aufgabe der Gruppe', 'Gruppengröße und Einteilung', 'Hat die Aufgabe mehrere Schritte (Fortschrittsbalken) oder nur einen (nur fertig)?', 'Gibt es eine Zusatzaufgabe für schnelle Gruppen?', 'Lautstärke zu Beginn: Flüsterstimme oder „Achtet auf eure Lautstärke“ (live umschaltbar, Lärmampel live zuschaltbar)'],
  },
  einzelphase: {
    gestaltung: ['Funktionstafel (digital): groß nur Sozialform, Lautstärke und der feste Satz, keine Aufgabe', 'Menü oben links: Anzeigen an/aus (Timer, anonymer Fortschritt, Hilfe-Warteschlange, Lärmampel, Stimmung)', 'Oben rechts Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp', 'Tablet: die Aufgabe'],
    inhalt: ['Aufgabe nur auf dem Tablet', 'Fester Satz „Jeder arbeitet für sich.“ + Satz der Lautstärke'],
    titel: ['Jetzt bist du dran', 'Mach dir mal Gedanken …'],
    klaeren: ['Aufgabe der Einzelarbeit', 'Gibt es eine Zusatzaufgabe für Schnelle?', 'Lautstärke zu Beginn: totale Stille oder Flüsterstimme (live umschaltbar, Lärmampel live zuschaltbar)'],
  },
  einzelphase_analog: {
    gestaltung: ['Funktionstafel (analog): groß nur Sozialform, Lautstärke und der feste Satz', 'Menü oben links: nur Timer und Lärmampel', 'Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp', 'Kein Fortschritt, keine Hilfe-Warteschlange, keine Stimmung (brauchen Geräte)'],
    inhalt: ['Aufgabe auf Arbeitsblatt, Heft oder Buch', 'Fester Satz „Jeder arbeitet für sich.“ + Satz der Lautstärke'],
    titel: ['Jetzt bist du dran'],
    klaeren: ['Wo steht die Aufgabe (Arbeitsblatt, Buchseite)?', 'Lautstärke zu Beginn: totale Stille oder Flüsterstimme'],
  },
  partnerphase_analog: {
    gestaltung: ['Funktionstafel (analog): groß nur Sozialform, Lautstärke und der feste Satz', 'Menü oben links: nur Timer, Lärmampel und Klassenziel', 'Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp', 'Keine Paar-Kacheln, kein Fortschritt, keine Warteschlange (brauchen Geräte)'],
    inhalt: ['Aufgabe auf Arbeitsblatt, Heft oder Buch', 'Fester Satz „Ihr arbeitet zu zweit.“ + Satz der Lautstärke'],
    titel: ['Tauscht euch aus'],
    klaeren: ['Wo steht die Aufgabe?', 'Lautstärke zu Beginn: Flüsterstimme oder „Achtet auf eure Lautstärke“'],
  },
  gruppenphase_analog: {
    gestaltung: ['Funktionstafel (analog): groß nur Sozialform, Lautstärke und der feste Satz', 'Menü oben links: nur Timer, Lärmampel und Klassenziel', 'Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp', 'Keine Gruppen-Kacheln, kein Fortschritt, keine Warteschlange (brauchen Geräte)'],
    inhalt: ['Aufgabe auf Arbeitsblatt, Heft oder Buch', 'Fester Satz „Ihr arbeitet in eurer Gruppe.“ + Satz der Lautstärke'],
    titel: ['Legt los als Team'],
    klaeren: ['Wo steht die Aufgabe?', 'Gruppengröße und Einteilung', 'Lautstärke zu Beginn'],
  },
  sammlung: {
    gestaltung: ['Tafel: Leitfrage und offene Liste, die Lehrkraft schreibt live mit', 'Tablet: eigene Notizen des Schülers, Meldeknopf', 'Kein Merksatz'],
    inhalt: ['Leitfrage als direkte Frage an die Klasse'],
    titel: ['Was habt ihr herausgefunden?', 'Was denkt ihr?'],
    klaeren: ['Leitfrage der Sammlung', 'Gibt es einen Erwartungshorizont als Spickzettel?'],
  },
  abstimmung: {
    gestaltung: ['Tablet: Karten bzw. große Antwortknöpfe', 'Tafel: anonyme Balken, die Lehrkraft deckt auf'],
    inhalt: ['Satz passt zur Art: bei Positionen „Wie stehst du dazu? Wähle deine Antwort.“', 'Nichts verraten, was später kommt (nicht „Erste Abstimmung“)', 'Zugang, Code oder Tool sind nie Thema, das läuft über die App'],
    titel: ['Wie stehst du dazu?', 'Und, wie stimmst du ab?'],
    klaeren: ['Art: gewichten, bewerten oder auswählen', 'Abstufung der Abstimmung: 2, 3 oder 5 Stufen'],
  },
  lernort: {
    gestaltung: ['Tablet: ein Satz und große Antippkarten der Orte', 'Lehrergerät: Liste nach Orten, nicht an der Tafel'],
    inhalt: ['Fester Satz, nur die Orte der Schule sind austauschbar'],
    titel: ['Wo arbeitest du?'],
    klaeren: ['Ist der Lernort frei?', 'Welche Orte stehen zur Auswahl?'],
  },
  reflexion: {
    gestaltung: ['Tablet: Aussagen mit „stimmt / teils / stimmt nicht“', 'Tafel: nur anonyme Balken, Namen nur auf dem Lehrergerät'],
    inhalt: ['Kurze Aussagen in Ich-Form', 'Für eine Phase reichen 2-3 Aussagen'],
    titel: ['Wie lief es für dich?', 'Was nimmst du mit?'],
    klaeren: ['Reflexion der Stunde oder einer Phase?', 'Welche Aussagen, gibt es eine eigene Frage?'],
  },
};