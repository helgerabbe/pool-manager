/**
 * mbkSequenzContract.js
 *
 * Was die MBK über Aufgaben im Modus 'sequenz' wissen muss (airgap-1.20.0).
 *
 * Die Schritte selbst gehen seit airgap-1.18.0 im Aufgaben-Payload hinaus
 * (`sequenz_schritte`). Was fehlte, war die Bauanleitung: WIE sieht so eine
 * Seite aus, was bedeutet jeder Schritttyp schülerseitig, und wie verbindlich
 * ist das mitgelieferte HTML-Fragment einer offenen Aufgabe. Ohne das baut die
 * MBK aus derselben Datenlage etwas anderes, als die Lehrkraft in der
 * Aufgabenwerkstatt in der Vorschau bestätigt hat.
 */
export const SEQUENZ_CONTRACT = {
  gilt_fuer: "Aufgaben mit aufgaben_modus='sequenz' (Feld `sequenz_schritte`).",
  seitenaufbau:
    'Eine Sequenz-Aufgabe ist EINE Seite, die die Schritte nacheinander zeigt: '
    + 'immer genau ein Schritt sichtbar, darunter „Weiter" / „Zurück" und eine '
    + 'Fortschrittsanzeige (Schritt n von m). Kein Scroll-Dokument mit allen '
    + 'Schritten untereinander. Die Reihenfolge ist verbindlich (Feld '
    + '`reihenfolge`). Der Titel eines Schritts steht als Überschrift darüber.',
  zielflaeche:
    'Zielgerät ist ein Tablet im Querformat, nutzbare Fläche etwa 960×560 px. '
    + 'Inhalte müssen ohne Scrollen lesbar sein — bei viel Material zweispaltig '
    + '(Material links, Aufgabe rechts) statt lange Spalte.',
  schritt_typen: {
    material:
      'Reiner Inhalt ohne Arbeitsauftrag (Text, Bild, Video, Audio, PDF, Link). '
      + 'Medien werden eingebettet abgespielt, PDFs eingebettet angezeigt. Ein '
      + 'vorhandenes `transkript` gehört als aufklappbarer Bereich darunter.',
    aufgabe:
      'Freitextfrage mit Eingabefeld. Bei feedback_modus="musterloesung" wird die '
      + 'Musterlösung erst NACH dem Absenden aufgeklappt; bei "ki" übernimmt die '
      + 'Rückmeldung der KI-Tutor.',
    katalog:
      'Eine interaktive Aufgabe aus dem Aktivitäten-Katalog. `aktivitaet_name` '
      + 'nennt die Aufgabenart, `field_values` enthält die Inhalte im selben '
      + 'Format wie bei den Lernpaket-Aktivitäten — dieselbe Mechanik bauen.',
    offen:
      'Eine in der Aufgabenwerkstatt gebaute Aufgabe. Das Feld `fragment` ist '
      + 'ein vollständiges, lauffähiges HTML-Fragment (<div class="aufgabe"> mit '
      + 'eigenem <style> und <script>) — GENAU dieses Fragment hat die Lehrkraft '
      + 'in der Vorschau geprüft und freigegeben. Aufbau, Bedienung und '
      + 'Rückmeldelogik sind damit verbindlich: übernimm sie unverändert. '
      + 'Angepasst werden darf ausschließlich das Aussehen (Kurs-CSS, Typografie, '
      + 'Abstände) — keine Felder weglassen, keine Interaktion vereinfachen, '
      + 'keine eigene Aufgabe daraus machen.',
    brian:
      'Ein Gespräch mit dem KI-Tutor Brian. Der Schritt verlinkt auf `url` bzw. '
      + '`dialog_id` in Brian.study. Erledigt wird er NICHT per Knopf, sondern '
      + 'durch Eingabe des Schlüsselcodes, den Brian am Ende des Gesprächs '
      + 'nennt — das Eingabefeld gehört auf die Seite.',
    handlung:
      'Arbeit mit realem Material (Heft, Buch, Werkzeug). Schülerseitig nur '
      + 'Arbeitsauftrag, Materialhinweis und ein Bestätigen-Knopf.',
    extern:
      'Eine eingebettete externe Seite (z. B. GeoGebra) über `url`, in der '
      + 'angegebenen Höhe.',
    abgabe:
      'Beschreibt, WAS abgegeben werden soll (`formate`, `dateiformat`, '
      + '`hinweis`). Das Einsammeln baut die MBK im Kurs — der Pool-Manager '
      + 'nimmt selbst nichts entgegen.',
  },
  hinweis_fuer_mbk:
    'Bei einer Sequenz-Aufgabe ist `aufgabenstellung` optional — die Schritte '
    + 'sind der Inhalt. Fehlt sie, keine Überschrift erfinden.',
};