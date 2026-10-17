// Passung für die neuen Stundentypen (2026-10-17), Teil 1: Einstieg & Aktivierung, die ersten zehn Methoden.
// Je Methode und Modell: [passung 1–5, 'Phase:beitrag|Phase:beitrag', Hinweis, [Varianten-Passungen als [wert, Hinweis] in Listenreihenfolge]].
import { NEUE_DATEN_2 } from '@/lib/methodenNeueModelle2';
import { NEUE_DATEN_3 } from '@/lib/methodenNeueModelle3';

const VARIANTEN = {
  praesentation: ['vortragend', 'ausstellend', 'austauschend', 'bewertend'],
  einstieg: ['problemorientiert', 'vorwissen', 'ueberblick', 'mitplanend'],
  gestaltung: ['schreibend', 'bildnerisch', 'darstellend', 'medial'],
  erschliessung: ['textdeutend', 'quellenkritisch', 'werkerschliessend', 'vergleichend', 'produktiv'],
  urteil: ['positionierend', 'abwaegend', 'streitend', 'entscheidend'],
};

const D = {
  'Informierender Unterrichtseinstieg': {
    praesentation: [1, 'Ablauf & Kriterien:kern', 'Reihenfolge, Zeit und Feedback-Kriterien vorab klären ist hier fast notwendig.', [[1, 'Reihenfolge und Beobachtungsauftrag klären.'], [2, 'Rundgang und Feedbackform erklären.'], [2, 'Wechselrhythmus klären.'], [1, 'Bewertungsraster transparent machen.']]],
    einstieg: [1, 'Überblick über die Einheit:kern|Ziele klären:kern', 'Der Kern des Überblicks: Wohin geht die Einheit, was wird gelernt?', [[3, 'Erst nach dem Problem, sonst verpufft die Neugier.'], [3, 'Nach dem Sammeln des Vorwissens.'], [1, 'Das ist genau diese Form.'], [2, 'Rahmen vorgeben, in dem mitgeplant wird.']]],
    gestaltung: [1, 'Auftrag & Kriterien:kern', 'Auftrag und Kriterien klar zu benennen ist Pflicht.', [[1, 'Textsorte und Kriterien klären.'], [1, 'Gestaltungsauftrag erklären.'], [2, 'Auftrag und Ablauf der Proben.'], [1, 'Technik und Ablauf erklären.']]],
    erschliessung: [3, 'Erstbegegnung:bedingt', 'Nur den Ablauf erklären, die Deutung nicht vorwegnehmen.', [[3, 'Kurz, der Text soll wirken.'], [2, 'Kontext der Quelle vorab geben.'], [3, 'Kurz, das Werk soll wirken.'], [2, 'Vergleichsauftrag klären.'], [2, 'Produktive Aufgabe erklären.']]],
    urteil: [3, 'Streitfrage aufwerfen:bedingt', 'Ablauf klären, aber die Streitfrage nicht entschärfen.', [[3, 'Kurz, die Frage soll wirken.'], [2, 'Ablauf des Abwägens erklären.'], [2, 'Rollen und Regeln klären.'], [2, 'Fall und Entscheidungsrahmen.']]],
  },
  'Stummer Impuls': {
    praesentation: [4, 'Ablauf & Kriterien:bedingt', 'Kaum Bezug, die Ergebnisse stehen schon fest.', [[4, 'Kaum Bezug.'], [3, 'Als Eröffnung des Rundgangs.'], [4, 'Kaum Bezug.'], [5, 'Passt nicht.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Idealer Auftakt einer Einheit: weckt Neugier und Fragen.', [[1, 'Bild oder Objekt als Problem.'], [2, 'Löst Äußerungen zum Vorwissen aus.'], [4, 'Kaum Überblick.'], [3, 'Fragen als Planungsgrundlage.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Kann als Schreib- oder Gestaltungsanlass dienen.', [[2, 'Bild als Schreibanlass.'], [2, 'Impuls als Bildidee.'], [3, 'Anlass für eine Szene.'], [3, 'Möglicher Aufhänger.']]],
    erschliessung: [1, 'Erstbegegnung:kern|Erste Eindrücke & Fragen:kern', 'Werk oder Textauszug wortlos zeigen, erste Eindrücke sammeln.', [[2, 'Textauszug oder Titel zeigen.'], [2, 'Quelle als Bild präsentieren.'], [1, 'Werk wirken lassen, ideal.'], [3, 'Zwei Werke nebeneinander zeigen.'], [2, 'Leerstelle als Anlass.']]],
    urteil: [2, 'Streitfrage aufwerfen:kern', 'Ein Bild kann die Streitfrage eröffnen.', [[2, 'Erste Reaktion zeigt Haltung.'], [3, 'Nur als Auftakt.'], [3, 'Nur als Auftakt.'], [2, 'Fallbild als Einstieg.']]],
  },
  'Provokante These': {
    praesentation: [4, 'Reflexion:bedingt', 'Höchstens am Ende als Prüfstein für die Ergebnisse.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [5, 'Passt nicht.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Weckt Widerspruch und Fragen an die Einheit.', [[1, 'These als Problemaufriss.'], [2, 'Zustimmung zeigt Vorwissen.'], [4, 'Kaum Überblick.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [4, 'Ideen & Planung:bedingt', 'Höchstens als Anlass für Meinungstexte.', [[3, 'Anlass für einen Kommentar.'], [4, 'Kaum Bezug.'], [3, 'Anlass für eine Streitszene.'], [4, 'Kaum Bezug.']]],
    erschliessung: [3, 'Deutungshypothesen:teil', 'Eine zugespitzte Deutung, die am Gegenstand geprüft wird.', [[2, 'Zugespitzte Deutung prüfen.'], [2, 'These zur Absicht der Quelle.'], [3, 'Deutung zum Werk zuspitzen.'], [3, 'These zum Vergleich.'], [4, 'Kaum Bezug.']]],
    urteil: [1, 'Streitfrage aufwerfen:kern|Erste Positionen:teil', 'Die These macht die Streitfrage sofort spürbar.', [[1, 'Zwingt zur ersten Haltung.'], [2, 'Ausgangspunkt fürs Abwägen.'], [1, 'Idealer Streitanlass.'], [3, 'Fall ist meist besser.']]],
  },
  'Brainstorming / Mindmap': {
    praesentation: [3, 'Ergebnisse bündeln:teil', 'Ergebnisse am Ende in einer Mindmap bündeln.', [[3, 'Kernaussagen sammeln.'], [3, 'Eindrücke vom Rundgang ordnen.'], [2, 'Teilergebnisse zusammenführen.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Vorwissen & Fragen:kern|Überblick über die Einheit:teil', 'Macht Vorwissen sichtbar und kann zur Landkarte der Einheit werden.', [[3, 'Nach dem Problem.'], [1, 'Das ist genau diese Form.'], [2, 'Mindmap als Überblick.'], [2, 'Ideen als Planungsgrundlage.']]],
    gestaltung: [1, 'Ideen & Planung:kern', 'Klassisches Werkzeug der Ideenfindung.', [[1, 'Schreibideen sammeln.'], [2, 'Bildideen sammeln.'], [2, 'Szenenideen sammeln.'], [2, 'Inhalte planen.']]],
    erschliessung: [3, 'Erste Eindrücke & Fragen:teil', 'Erste Eindrücke sammeln, aber nicht am Gegenstand belegt.', [[3, 'Leseeindrücke sammeln.'], [3, 'Vorwissen zum Kontext.'], [3, 'Assoziationen zum Werk.'], [3, 'Eindrücke zu beiden sammeln.'], [2, 'Ideen für das Produkt.']]],
    urteil: [3, 'Auseinandersetzung mit Argumenten:teil', 'Argumente sammeln, das Gewichten folgt später.', [[3, 'Gründe für die eigene Haltung.'], [2, 'Argumente sammeln.'], [3, 'Argumente für Rollen.'], [3, 'Optionen sammeln.']]],
  },
  'Kartenabfrage': {
    praesentation: [2, 'Rückmeldung:teil|Ergebnisse bündeln:kern', 'Rückmeldungen auf Karten sammeln und clustern.', [[2, 'Feedback auf Karten.'], [2, 'Rückmeldungen am Plakat.'], [3, 'Erkenntnisse sammeln.'], [3, 'Ergänzt das Raster.']]],
    einstieg: [1, 'Vorwissen & Fragen:kern|Ziele klären:teil', 'Fragen an die Einheit sammeln und ordnen.', [[3, 'Fragen zum Problem.'], [1, 'Vorwissen geordnet sichtbar.'], [3, 'Kaum Überblick.'], [1, 'Geclusterte Fragen steuern die Planung.']]],
    gestaltung: [2, 'Ideen & Planung:teil|Auftrag & Kriterien:teil', 'Kriterien oder Ideen gemeinsam sammeln.', [[2, 'Kriterien gemeinsam finden.'], [3, 'Ideen sammeln.'], [3, 'Ideen sammeln.'], [3, 'Inhalte sammeln.']]],
    erschliessung: [2, 'Erste Eindrücke & Fragen:kern', 'Fragen an den Text sammeln, die die Deutung leiten.', [[2, 'Fragen an den Text.'], [2, 'Fragen an die Quelle.'], [2, 'Fragen ans Werk.'], [3, 'Vergleichskriterien sammeln.'], [3, 'Ideen für Produkte.']]],
    urteil: [2, 'Auseinandersetzung mit Argumenten:kern', 'Argumente sammeln und nach Pro und Contra ordnen.', [[3, 'Gründe sammeln.'], [1, 'Argumente sichtbar gewichten.'], [3, 'Argumente für Rollen.'], [2, 'Kriterien für die Entscheidung.']]],
  },
  'Positionslinie / Meinungsbarometer': {
    praesentation: [3, 'Rückmeldung:teil', 'Schnelle Rückmeldung zur Überzeugungskraft.', [[3, 'Kurzes Feedback.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Selbsteinschätzung.']]],
    einstieg: [2, 'Impuls & Neugier:teil|Vorwissen & Fragen:teil', 'Macht Haltungen zum Thema der Einheit sichtbar.', [[2, 'Position zum Problem.'], [2, 'Zeigt Vorerfahrung.'], [4, 'Kaum Überblick.'], [3, 'Interessen abfragen.']]],
    gestaltung: [5, '', 'Kaum Bezug zum Gestalten.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [4, 'Höchstens als Bewegung.'], [5, 'Passt nicht.']]],
    erschliessung: [3, 'Deutungshypothesen:teil', 'Positionen zu einer Deutungsfrage aufstellen.', [[2, 'Zu einer Deutungsfrage.'], [3, 'Zur Glaubwürdigkeit.'], [3, 'Zur Wirkung.'], [3, 'Welches überzeugt mehr?'], [4, 'Kaum Bezug.']]],
    urteil: [1, 'Erste Positionen:kern|Begründet urteilen:teil', 'Vorher und nachher stellen macht Urteilsänderung sichtbar.', [[1, 'Ideal für die erste Haltung.'], [2, 'Vorher-Nachher-Vergleich.'], [2, 'Verteilt auf Seiten.'], [2, 'Entscheidung sichtbar.']]],
  },
  'Vier-Ecken-Methode': {
    praesentation: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [3, 'Ecken als Ausstellungsorte.'], [3, 'Gruppenbildung für Austausch.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Vorwissen & Fragen:teil', 'Zeigt Zugänge und Interessen zur neuen Einheit.', [[3, 'Vier Lösungsideen.'], [2, 'Vorerfahrung zuordnen.'], [4, 'Kaum Überblick.'], [1, 'Schwerpunkte wählen.']]],
    gestaltung: [4, 'Ideen & Planung:bedingt', 'Höchstens zur Wahl der Gestaltungsform.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Rollen wählen.'], [3, 'Formate wählen.']]],
    erschliessung: [3, 'Deutungshypothesen:teil', 'Vier Deutungen zur Wahl stellen.', [[2, 'Vier Deutungen zur Wahl.'], [3, 'Vier Lesarten der Quelle.'], [3, 'Vier Wirkungen.'], [3, 'Vergleichsurteile.'], [4, 'Kaum Bezug.']]],
    urteil: [2, 'Erste Positionen:kern', 'Mehr als zwei Positionen sichtbar machen.', [[1, 'Differenzierte erste Haltung.'], [2, 'Gruppen pro Position.'], [2, 'Gruppen als Lager.'], [2, 'Vier Optionen.']]],
  },
  'Problemaufriss / Schätzfrage': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Ein Problem, das die ganze Einheit trägt.', [[1, 'Das ist genau diese Form.'], [2, 'Schätzung zeigt Vorwissen.'], [3, 'Problem als roter Faden.'], [2, 'Lösungswege planen.']]],
    gestaltung: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Problem für Erklärvideo.']]],
    erschliessung: [3, 'Erstbegegnung:teil', 'Eine Frage, die der Gegenstand beantworten soll.', [[3, 'Leitfrage an den Text.'], [2, 'Frage, die die Quelle klärt.'], [3, 'Frage ans Werk.'], [3, 'Frage für den Vergleich.'], [4, 'Kaum Bezug.']]],
    urteil: [2, 'Streitfrage aufwerfen:kern', 'Ein Problem mit offener Lösung eröffnet das Urteil.', [[2, 'Erste Einschätzung.'], [2, 'Problem zum Abwägen.'], [3, 'Kann Streit auslösen.'], [1, 'Problem als Fall.']]],
  },
  'Wortwolke': {
    praesentation: [2, 'Rückmeldung:teil|Ergebnisse bündeln:teil', 'Schnelles Stimmungsbild zu den Präsentationen.', [[2, 'Ein Wort pro Präsentation.'], [3, 'Eindrücke vom Rundgang.'], [3, 'Kernbegriffe bündeln.'], [4, 'Ersetzt kein Raster.']]],
    einstieg: [2, 'Vorwissen & Fragen:kern', 'Zeigt schnell, was die Klasse mit dem Thema verbindet.', [[3, 'Assoziationen zum Problem.'], [1, 'Schnelles Vorwissen.'], [3, 'Begriffe als Vorschau.'], [3, 'Interessen sichtbar.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Wortmaterial als Anregung.', [[2, 'Wortmaterial fürs Schreiben.'], [3, 'Stimmung für das Bild.'], [4, 'Kaum Bezug.'], [3, 'Begriffe sammeln.']]],
    erschliessung: [2, 'Erste Eindrücke & Fragen:kern', 'Erste Eindrücke bündeln, häufige Wörter zeigen Deutungsrichtungen.', [[2, 'Leseeindrücke.'], [3, 'Wirkung der Quelle.'], [1, 'Wirkung des Werks.'], [3, 'Eindrücke beider.'], [3, 'Wörter für das Produkt.']]],
    urteil: [3, 'Erste Positionen:teil|Sichern & reflektieren:teil', 'Stimmungsbild zur Frage, vorher und nachher.', [[2, 'Ein Wort zur Haltung.'], [3, 'Vorher-Nachher.'], [4, 'Kaum Bezug.'], [3, 'Stimmungsbild zur Entscheidung.']]],
  },
  'Gedankenexperiment': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Impuls & Neugier:kern', 'Ein „Was wäre, wenn …?“ weckt Neugier auf die Einheit.', [[1, 'Problem im Kopf erzeugen.'], [3, 'Vorwissen beim Durchdenken.'], [4, 'Kaum Überblick.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [2, 'Ideen & Planung:kern', 'Gute Ideenquelle für Geschichten und Szenen.', [[1, 'Anlass für eine Geschichte.'], [3, 'Anlass für ein Bild.'], [2, 'Anlass für eine Szene.'], [3, 'Anlass für ein Video.']]],
    erschliessung: [3, 'Deutungshypothesen:teil', '„Was wäre, wenn die Figur anders handelte?“ schärft die Deutung.', [[2, 'Alternative Handlung durchdenken.'], [3, 'Was, wenn der Autor anders stünde?'], [3, 'Was, wenn anders gestaltet?'], [4, 'Kaum Bezug.'], [1, 'Gedankenspiel wird zum Produkt.']]],
    urteil: [1, 'Streitfrage aufwerfen:kern|Auseinandersetzung mit Argumenten:teil', 'Klassischer Weg zu einer echten Streitfrage, z. B. ein Dilemma.', [[1, 'Dilemma zwingt zur Haltung.'], [2, 'Folgen abwägen.'], [3, 'Rollen im Gedankenspiel.'], [2, 'Fiktiver Fall.']]],
  },
};

const phasen = (s) => Object.fromEntries((s ? s.split('|') : []).map((x) => x.split(':')));

export const NEUE_EINORDNUNG_1 = {};
export const NEUE_VARIANTEN_1 = {};
Object.entries({ ...D, ...NEUE_DATEN_2, ...NEUE_DATEN_3 }).forEach(([name, modelle]) => {
  NEUE_EINORDNUNG_1[name] = {};
  NEUE_VARIANTEN_1[name] = {};
  Object.entries(modelle).forEach(([m, [passung, ph, hinweis, varianten]]) => {
    NEUE_EINORDNUNG_1[name][m] = { passung, phasen: phasen(ph), hinweis };
    VARIANTEN[m].forEach((v, i) => { NEUE_VARIANTEN_1[name][`${m}_${v}`] = varianten[i]; });
  });
});