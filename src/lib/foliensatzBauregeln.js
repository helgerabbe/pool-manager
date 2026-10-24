// Bauregeln für den Grafikassistenten (2026-10-23), abgeleitet aus dem gemeinsam entwickelten Think-Pair-Share-Satz.
// Ziel: Neue Foliensätze sollen genauso aufgebaut sein wie das Muster.
import { STANDARD_FOLIENSAETZE } from '@/lib/standardFoliensaetze';
import { FOLIENTYPEN_DEFINITION } from '@/lib/folientypenDefinition';
import { standardFolienText } from '@/lib/standardFolienBibliothek';

export const BAUREGELN = `${FOLIENTYPEN_DEFINITION}

BAUREGELN (verbindlich):
1. Grundfolge: Fokusfolie (Einstieg, "fokus") -> Methodenübersicht ("uebersicht", 2-4 Phasenkarten) -> je Phase eine Methodenfolie ("uebergang") und eine Aufgabenfolie ("phase") -> Organisationsfolien nur dort, wo ein Wechsel nötig ist (z. B. Partner finden) -> Ergebnisfolie am Ende.
2. Fokusfolie: animierender Titel und der eigentliche Impuls (siehe Regel 14/15); nur ohne Impuls ein Satz mit Signalwort ("jetzt" / "als Nächstes"), keine Aufgabenbox, kein Timer, kein Sozialform-Symbol. Optional ein fotorealistisches Impulsbild (nie Comic).
3. Phasenfolie trennt IMMER zwei Ebenen: "methodisch" = feststehende Arbeitsweise der Methode (gleich in jedem Fach, z. B. "Denke allein und leise nach."), "inhalt" = konkrete fachliche Aufgabe zum Beispielthema. Nie beides in einem Feld.
4. Stille Einzelarbeit: leise=true. Partnerarbeit im Raum: fluestern=true und Flüsterstimme in "methodisch". Arbeitsphasen mit Timer: freigabe="zeit" + minuten. Plenum: freigabe="lehrkraft".
5. Analog: Partner finden über Vorlage "partnersuche" (frei | nachbar | los | duett), keine digitale Zuordnung. Digital: Standardfolie "partner".
6. Ergebnis hängt vom Ziel ab: DIVERGIEREND (Ideen sammeln) -> Vorlage "sammlung" (Lehrkraft schreibt live mit, kein Merksatz). KONVERGIEREND (sich einigen, gewichten, Rangfolge) -> Vorlage "sicherung" (Merksatz-Box mit dem Einigungsergebnis).
7. Plenumsphase bekommt eine eigene Phasenfolie (Arbeitsweise im Plenum + was besprochen wird) VOR der Ergebnisfolie.
8. Je Folie zusätzlich: "liegt" = 2-4 Stichpunkte, was auf der Folie zu sehen ist; "entscheidungen" = Fragen, die die Lehrkraft vor der Stunde beantworten muss (Aufgabe, Dauer, Art der Freigabe, Anzahl der Aspekte, Art der Partnerfindung ...). Leer, wenn nichts zu entscheiden ist.
9. Keine Aufgabe ohne Thema: Nutze EIN durchgehendes Beispielthema für alle Folien.
10. Tafel wie PowerPoint: nichts ragt über den Folienrand, kein Scrollen (außer innerhalb von Textfeldern). Zwischen allen Elementen bleibt sichtbarer Abstand, nichts überlappt; Inhalte halten Abstand zu den Symbolen oben rechts.
11. Tablet darf nach unten länger als eine Bildschirmhöhe sein (Scrollen erlaubt). Der Weiter-Knopf schwebt nicht, sondern steht immer am Ende der Seite.
12. Methoden, die sich über die ganze Stunde spannen (Anfang und späterer Rückgriff, z. B. provokante These): Dort, wo der Unterricht mit eigenen Inhaltsfolien weitergeht, steht GENAU EINE Folie der Vorlage "einschub" (Platzhalter für mehrere Unterrichtsfolien: Lehrerimpuls, Erarbeitung o. Ä.). Danach geht die Methode weiter.
13. Timer: Methoden-, Inhalts- und Sicherungsfolien haben NIE einen Timer. Timer gibt es bei Aufgaben- und Reflexionsfolien, optional bei Organisationsfolien. Die Lehrkraft stellt die Dauer LIVE im Unterricht am Timer ein und kann ihn anhalten; "minuten" ist nur ein Startvorschlag. Die Timerdauer ist deshalb NIE eine Frage an die Lehrkraft und NIE eine Entscheidung „vorher“.
14. Schülersprache statt Planungssprache: Alles, was auf Tafel oder Tablet steht (titel, satz, thema, Aufgaben), enthält NIE den Namen der Methode (z. B. „Provokante These“, „Think-Pair-Share“) und NIE Begriffe der Stundenplanung (Einstieg, Erarbeitung, Sicherung, Konfrontation, Phase ...). Diese Begriffe gehören nur in "phase", "erklaerung" und die Hinweise für die Lehrkraft. Titel sprechen die Schüler animierend an, z. B. „Was meinst du dazu?“, „Letztens habe ich gelesen …“, „Kurz auf den Punkt gebracht:“. Das gilt für JEDEN Folientitel: kein Lehrersprech wie „Individuelle Bedenkzeit“, „Erste Abstimmung“, „Sammlung im Plenum“, „Ergebnissicherung“, sondern direkte Ansprache, die ins Tun holt, z. B. „Mach dir mal Gedanken …“, „Was denkst du?“, „Und, wie stimmst du ab?“, „Was habt ihr herausgefunden?“. Die Schüler sollen nie die Stundenplanung sehen, sondern in die Aktivität hineingeholt werden. Auch nichts verraten, was später kommt (z. B. „Erste Abstimmung“ kündigt eine zweite an), stattdessen etwa „Wie stehst du gerade dazu?“.
16. Abstimmungen und andere interaktive Elemente (Umfrage, Wortwolke ...) laufen über die App: Schlüsselcode, Zugang oder Abstimmungstool sind NIE eine Frage an die Lehrkraft. Die Lehrkraft entscheidet vorher nur die GRANULARITÄT der Abstimmung, z. B. 2 Stufen (Zustimmung / Ablehnung), 3 Stufen (+ unentschieden) oder 5 Stufen (Zustimmung / eher Zustimmung / unentschieden / eher Ablehnung / Ablehnung); als Frage an die Lehrkraft heißt sie „Abstufung der Abstimmung“. Der Satz auf der Folie passt zur Art: bei Positionen „Wie stehst du dazu? Wähle deine Antwort.“, nicht „Wähle den Punkt, der dir am wichtigsten ist“.
15. Inhalt statt Stundenziel: Verlangt die Methode einen konkreten Impuls (z. B. eine These), steht auf der Folie genau dieser Impuls als Beispiel zum Thema oder der Platzhalter „Hier steht deine These.“ Keine Stundenziel-Sätze wie „Wir wollen jetzt herausfinden, …“ an seiner Stelle.
17. STANDARDFOLIEN ZUERST: Passt eine dieser Standardfolien, wird sie genommen und nur ihr Inhalt gefüllt:
${standardFolienText()}
18. Tafel und Tablet passen immer zusammen: Was die Tafel verlangt, muss auf dem Tablet möglich sein. Arbeitet die Aufgabe mit Satzanfängen, ist es IMMER die Vorlage "satzanfaenge" (Satzanfänge in "satzimpulse"); der Hinweis „Wähle einen Satzimpuls“ steht nie auf einer Folie ohne Satzanfänge, und die Aufgabe passt zu den Satzanfängen.`;

const kurz = (f) => {
  const { id, kanal, status, bild, erklaerung, liegt, ...rest } = f;
  return rest;
};

/** Das fertige Think-Pair-Share als Muster (analog), je nach Ziel divergierend oder konvergierend. */
export const musterText = (ziel = 'divergierend') =>
  `MUSTER (Think-Pair-Share, analog, ${ziel}) – übertrage Aufbau und Stil auf die neue Methode, nicht den Inhalt:\n${JSON.stringify(STANDARD_FOLIENSAETZE['Think-Pair-Share'][ziel].analog.map(kurz))}`;