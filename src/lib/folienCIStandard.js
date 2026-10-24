// Teil 15: Standardfolien für häufige Situationen (Stand 2026-10-23).
// Immer gleich aufgebaut, damit Schüler sie sofort wiedererkennen. Text austauschbar, Aufbau fest.

export const CI_STANDARDFOLIEN = {
  begruessung: {
    name: 'Begrüßung', folientyp: 'organisation',
    schueler: 'Großes „Guten Morgen!“, darunter Thema der Stunde und ein Foto zum Thema im Bildrahmen.',
    lehrer: 'Gleiche Folie an der Tafel, zusätzlich Zähler „18 von 24 angemeldet“. Optional per Knopf „Wer fehlt noch?“: Liste der Schüler, die noch nicht in der App sind (nur auf dem Lehrergerät, nicht an der Tafel).',
  },
  start: {
    name: 'Stundenstart', folientyp: 'inhalt',
    schueler: 'Folgt direkt auf die Begrüßung. Oben klein Fach und Einheit, groß das Thema der Stunde. Von der Lehrkraft zuschaltbar: Stundenziel „Am Ende der Stunde kannst du …“ (gelbe Merksatz-Box) und ein kurzer Ablauf „Heute: 1 … 2 … 3 …“ als nummerierte Stichpunkte (höchstens vier). Kein ausführlicher Einstieg, nur Orientierung.',
    lehrer: 'Gleiche Folie an der Tafel. Auf dem Lehrergerät zwei Schalter: „Stundenziel zeigen“ und „Ablauf zeigen“.',
  },
  ankuendigung: {
    name: 'Inhaltliche Ankündigung', folientyp: 'inhalt',
    schueler: 'Kündigt an, was in der nächsten Unterrichtsphase inhaltlich passiert. Große Überschrift, darunter ein freier Satz, der IMMER ein Signalwort für den nächsten Schritt enthält („jetzt“ oder „als Nächstes“), z. B. „Wir wollen jetzt herausfinden, …“ oder „Als Nächstes wollen wir untersuchen, …“ – keine Aufgabenbox, kein Sozialform-Symbol, kein Timer. Optional ein Bildimpuls: immer fotorealistisch (nie Comic), im unteren rechten Bereich im Hintergrund, leicht blass, weich auslaufend und über dem Folienart-Kreis liegend.',
    lehrer: 'Gleiche Folie an der Tafel. Die Lehrkraft legt vorher fest: Überschrift, Fokus-Satz und ob es einen Bildimpuls gibt (mit Motiv).',
  },
  zuhoeren: {
    name: 'Lehrkraft erklärt – zuhören', folientyp: 'organisation',
    schueler: 'Ohr- und Stille-Symbol im Pastellkreis, Satz „Deine Lehrkraft erklärt dir jetzt etwas. Sei leise, hör zu und stör die anderen nicht.“ Kein Weiter. Optional (von der Lehrkraft zuschaltbar): Knopf „Notiz machen“ öffnet einen gelben Notizzettel für Stichworte oder Fragen.',
    lehrer: 'Tafel zeigt den eigentlichen Inhalt; die Schülergeräte zeigen nur die Zuhör-Folie.',
  },
  partner: {
    name: 'Partner finden', folientyp: 'organisation',
    schueler: 'Satz „Such dir einen Partner.“ Eingabefeld „Mit wem arbeitest du?“ mit Namensvorschlägen aus der Klasse. Erst wenn beide sich gegenseitig eingetragen haben, erscheint grün „Ihr seid Partner 7“. Zusatzoptionen (von der Lehrkraft zuschaltbar): „Wir sind zu dritt“ und „Ich arbeite allein“. Allein ist nur eine Anfrage, die Lehrkraft entscheidet.',
    lehrer: 'TAFEL-STANDARD (fest): Überschrift „Wer arbeitet mit wem?“, darunter ein Raster aus 6 Spalten × 3 Reihen für bis zu 18 Kacheln (16 Paare plus Reserve). Jede Kachel: Partner-Symbol + große Paarnummer, darunter die Namen gut lesbar von hinten; Dreier in derselben Kachel. Allein-Wünsche gelb mit „allein?“. Schüler ohne Partner in einer grauen Zeile unten („Noch ohne Partner: …“). Lehrergerät zusätzlich: Die Lehrkraft kann einen Allein-Wunsch erlauben (✓) oder ablehnen (×, Schüler muss sich einen Partner suchen), Dreier und Paare auflösen und Übrige per Ziehen zuordnen. Auflösen ist auch während der laufenden Partnerarbeit möglich (z. B. zu laut).',
  },
  partner_analog: {
    name: 'Partner finden (analog)', folientyp: 'organisation',
    schueler: 'Kein Gerät nötig. Links ein Aquarellbild (ruhig, nicht comicartig) zur gewählten Art, rechts Partner-Symbol, Name der Art und genau ein Satz. Vier Arten: freie Partnersuche, Sitznachbar, Losen, Lerntempo-Duett.',
    lehrer: 'Gleiche Folie an der Tafel, keine Zuordnung und keine Partnernummer. Die Lehrkraft wählt die Art vor der Stunde oder spontan in der Stunde.',
  },
  partnerphase: {
    name: 'Partnerarbeit läuft', folientyp: 'aufgabe',
    schueler: 'Normale Aufgabenfolie, oben rechts Partner-Symbol + Zahl, optional Timer daneben.',
    lehrer: 'Raster aller Paare: je Kachel Zahl, Namen, Fortschrittsbalken, Status (arbeitet / fertig / meldet sich). Meldung = Hand-Symbol in Apricot.',
  },
  gruppenphase: {
    name: 'Gruppenarbeit läuft', folientyp: 'aufgabe',
    schueler: 'Normale Aufgabenfolie, oben rechts Gruppen-Symbol + Buchstabe in Gruppenfarbe, optional Timer daneben.',
    lehrer: 'Je Gruppe eine große Kachel in ihrer Gruppenfarbe: Buchstabe, Mitglieder, Fortschritt, aktuelles Zwischenergebnis. Klick öffnet die Ergebnisse der Gruppe.',
  },
  einzelphase: {
    name: 'Einzelarbeit läuft', folientyp: 'aufgabe',
    schueler: 'Normale Aufgabenfolie, oben rechts Einzelarbeit-Symbol, optional Timer daneben.',
    lehrer: 'Tafel zeigt NICHT die ganze Aufgabe, sondern eine ruhige Arbeitsfolie: großes Einzelarbeit- und Stille-Symbol, Satz „Jeder arbeitet für sich. Bitte leise.“, die Aufgabe nur als kurzes Stichwort, großer Timer und Klassenfortschritt („12 von 24 fertig“, anonym). Optional: Hinweis „Fertig? → Zusatzaufgabe“.',
  },
  einzelphase_analog: {
    name: 'Einzelarbeit läuft (analog)', folientyp: 'aufgabe',
    schueler: 'Kein Gerät: Die Aufgabe steht auf dem Arbeitsblatt, im Heft oder im Buch.',
    lehrer: 'Funktionstafel ohne Geräte-Funktionen: groß Sozialform, Lautstärke und fester Satz; zuschaltbar nur Timer und Lärmampel. Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp.',
  },
  partnerphase_analog: {
    name: 'Partnerarbeit läuft (analog)', folientyp: 'aufgabe',
    schueler: 'Kein Gerät: Die Aufgabe steht auf dem Arbeitsblatt, im Heft oder im Buch.',
    lehrer: 'Funktionstafel ohne Geräte-Funktionen: groß Sozialform, Lautstärke und fester Satz; zuschaltbar nur Timer, Lärmampel und Klassenziel. Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp.',
  },
  gruppenphase_analog: {
    name: 'Gruppenarbeit läuft (analog)', folientyp: 'aufgabe',
    schueler: 'Kein Gerät: Die Aufgabe steht auf dem Arbeitsblatt, im Heft oder im Buch.',
    lehrer: 'Funktionstafel ohne Geräte-Funktionen: groß Sozialform, Lautstärke und fester Satz; zuschaltbar nur Timer, Lärmampel und Klassenziel. Aktionen: Alle herschauen, Zwischenstopp, +2 Min., Endspurt, Tipp.',
  },
  sammlung: {
    name: 'Sammlung (Lehrkraft schreibt mit)', folientyp: 'sicherung',
    schueler: 'Überschrift und Leitfrage der Sammlung, darunter eine offene Liste. Kein Merksatz-Kasten, weil noch nichts festgelegt ist: Es wird erst gesammelt, was aus der Arbeitsphase kommt.',
    lehrer: 'Klassische Lehrersicherung: Während die Schüler vortragen bzw. sich melden, tippt die Lehrkraft live in das Textfeld; jeder Eintrag erscheint sofort als Punkt in der Liste (zweispaltig bei vielen Punkten). Optional liegt ein Erwartungshorizont als Spickzettel nur auf dem Lehrergerät.',
  },
  abstimmung: {
    name: 'Abstimmung (nach der Sammlung)', folientyp: 'sicherung',
    schueler: 'Optional im Anschluss an eine Sammlung: Die gesammelten Punkte erscheinen als Karten. Drei Arten: Gewichten (drei Stimmen verteilen), Bewerten (je Punkt stimmt / teils / stimmt nicht), Auswählen (eine Stimme). Ordnen und Merksatz formulieren gehen nicht per Abstimmung.',
    lehrer: 'Tafel zeigt anonyme Balken je Punkt, die Lehrkraft deckt auf. Je mehr Stimmen, desto höher steht der Punkt.',
  },
  lernort: {
    name: 'Lernort frei wählen', folientyp: 'organisation',
    schueler: 'Erscheint nur, wenn die Lehrkraft „Lernort frei“ eingeschaltet hat (bei Einzel-, Partner- und Gruppenarbeit). Satz „Du darfst dir einen Lernort suchen. Wo arbeitest du?“ und große Antippkarten: Klassenraum, Gruppenraum, Flur vorne, Flur hinten, Mensa, Kabine, Hof, Sonstiges (kurze Eingabe). Bei Partner/Gruppe genügt eine Angabe für alle. Ändern jederzeit über das Orts-Symbol oben rechts.',
    lehrer: 'Lehrergerät (nicht Tafel): Liste nach Orten gruppiert mit Namen bzw. Partner-/Gruppenkennung, darunter grau „Noch keine Angabe“. Schalter „Lernort frei“ an/aus; aus = alle bitte zurück in den Klassenraum.',
  },
  reflexion: {
    name: 'Reflexion (Stunde / Phase)', folientyp: 'reflexion',
    schueler: 'Teil 1 Pflicht: kurze Aussagen, je mit drei Antippfeldern „stimmt“ / „teils“ / „stimmt nicht“: Ich habe das Thema verstanden · Ich habe alles geschafft · Ich habe mich wohlgefühlt und konnte gut arbeiten · Das Thema war schwierig · Wir sollten das noch vertiefen. Für eine einzelne Phase reichen 2–3 Aussagen. Optional ein Satz „Das nehme ich heute mit: …“. Teil 2 freiwillig und anonym, nur wenn die Lehrkraft es freischaltet: Rückmeldung an die Lehrkraft (Sie haben verständlich erklärt · Der Unterricht war spannend · Der Einstieg hat mir geholfen) plus eine eigene Frage der Lehrkraft, z. B. „Ich habe heute etwas Neues ausprobiert. Wie fandet ihr das?“. Knopf „Überspringen“ immer sichtbar.',
    lehrer: 'Tafel: nur anonyme Balken je Aussage in der Ergebnisreihe (Teil 9), Aufdecken durch die Lehrkraft. Lehrergerät: zusätzlich Namensliste „Braucht Unterstützung“ (Verstanden = stimmt nicht oder Wohlgefühlt = stimmt nicht). Die Rückmeldung an die Lehrkraft ist immer anonym und erscheint nur auf dem Lehrergerät, nie an der Tafel. Aussagen und eigene Frage werden vor der Stunde in der Folie vorbereitet.',
  },
};

// Ideenspeicher (noch nicht umgesetzt, 2026-10-23):
export const CI_IDEEN = [
  'Dauer-Zusatzpaket „Pluspunkte“: Wer fertig ist, arbeitet an einem festen, fachlich sinnvollen Aufgabenpaket weiter (z. B. Wochenknobelei, Wortschatz-Sammlung, Kopfrechen-Leiter, Lesepass). Jede erledigte Einheit füllt ein Sammelbild bzw. einen Fortschrittsbalken; ist es voll, gibt es eine Belohnung (Abzeichen, Urkunde, Extrapunkte). Kein Zeitdruck, freiwillig, nur sichtbar für Schüler und Lehrkraft.',
];

export const CI_STANDARD_REGEL = 'Standardfolien werden nicht neu gestaltet, sondern nur mit Text gefüllt. Organisationsfolien (lila Ecke) zeigen immer ein großes Symbol mittig und genau einen Satz.';