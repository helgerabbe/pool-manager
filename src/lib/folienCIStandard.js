// Teil 15: Standardfolien für häufige Situationen (Stand 2026-10-23).
// Immer gleich aufgebaut, damit Schüler sie sofort wiedererkennen. Text austauschbar, Aufbau fest.

export const CI_STANDARDFOLIEN = {
  begruessung: {
    name: 'Begrüßung', folientyp: 'organisation',
    schueler: 'Großes „Guten Morgen!“, darunter Thema der Stunde und ein Foto zum Thema im Bildrahmen.',
    lehrer: 'Gleiche Folie an der Tafel, zusätzlich Zähler „18 von 24 angemeldet“. Optional per Knopf „Wer fehlt noch?“: Liste der Schüler, die noch nicht in der App sind (nur auf dem Lehrergerät, nicht an der Tafel).',
  },
  zuhoeren: {
    name: 'Lehrkraft erklärt – zuhören', folientyp: 'organisation',
    schueler: 'Ohr- und Stille-Symbol im Pastellkreis, Satz „Deine Lehrkraft erklärt dir jetzt etwas. Sei leise, hör zu und stör die anderen nicht.“ Kein Weiter. Optional (von der Lehrkraft zuschaltbar): Knopf „Notiz machen“ öffnet einen gelben Notizzettel für Stichworte oder Fragen.',
    lehrer: 'Tafel zeigt den eigentlichen Inhalt; die Schülergeräte zeigen nur die Zuhör-Folie.',
  },
  partner: {
    name: 'Partner finden', folientyp: 'organisation',
    schueler: 'Satz „Such dir einen Partner.“ Eingabefeld „Mit wem arbeitest du?“ mit Namensvorschlägen aus der Klasse. Erst wenn beide sich gegenseitig eingetragen haben, erscheint grün „Ihr seid Partner 7“.',
    lehrer: 'Übersicht als Kärtchen: bestätigte Paare (Partner-Symbol + Zahl + zwei Namen), offene Anfragen gestrichelt, Schüler ohne Partner hellgrau unten. Lehrkraft kann Übrige per Ziehen zuordnen.',
  },
  partnerphase: {
    name: 'Partnerarbeit läuft (Lehreransicht)', folientyp: 'aufgabe',
    schueler: 'Normale Aufgabenfolie, oben rechts Partner-Symbol + Zahl.',
    lehrer: 'Raster aller Paare: je Kachel Zahl, Namen, Fortschrittsbalken, Status (arbeitet / fertig / meldet sich). Meldung = Hand-Symbol in Apricot.',
  },
  gruppenphase: {
    name: 'Gruppenarbeit läuft (Lehreransicht)', folientyp: 'aufgabe',
    schueler: 'Normale Aufgabenfolie, oben rechts Gruppen-Symbol + Buchstabe in Gruppenfarbe.',
    lehrer: 'Je Gruppe eine große Kachel in ihrer Gruppenfarbe: Buchstabe, Mitglieder, Fortschritt, aktuelles Zwischenergebnis. Klick öffnet die Ergebnisse der Gruppe.',
  },
};

export const CI_STANDARD_REGEL = 'Standardfolien werden nicht neu gestaltet, sondern nur mit Text gefüllt. Organisationsfolien (lila Ecke) zeigen immer ein großes Symbol mittig und genau einen Satz.';