// Bauregeln für den Grafikassistenten (2026-10-23), abgeleitet aus dem gemeinsam entwickelten Think-Pair-Share-Satz.
// Ziel: Neue Foliensätze sollen genauso aufgebaut sein wie das Muster.
import { STANDARD_FOLIENSAETZE } from '@/lib/standardFoliensaetze';

export const BAUREGELN = `BAUREGELN (verbindlich):
1. Grundfolge: Fokusfolie (Einstieg, "fokus") -> Methodenübersicht ("uebersicht", 2-4 Phasenkarten) -> je Phase eine Phasenfolie ("phase") -> Organisationsfolien nur dort, wo ein Wechsel nötig ist (z. B. Partner finden) -> Ergebnisfolie am Ende.
2. Fokusfolie: freier Satz mit Signalwort ("jetzt" / "als Nächstes"), keine Aufgabenbox, kein Timer, kein Sozialform-Symbol. Optional ein fotorealistisches Impulsbild (nie Comic).
3. Phasenfolie trennt IMMER zwei Ebenen: "methodisch" = feststehende Arbeitsweise der Methode (gleich in jedem Fach, z. B. "Denke allein und leise nach."), "inhalt" = konkrete fachliche Aufgabe zum Beispielthema. Nie beides in einem Feld.
4. Stille Einzelarbeit: leise=true. Partnerarbeit im Raum: fluestern=true und Flüsterstimme in "methodisch". Arbeitsphasen mit Timer: freigabe="zeit" + minuten. Plenum: freigabe="lehrkraft".
5. Analog: Partner finden über Vorlage "partnersuche" (frei | nachbar | los | duett), keine digitale Zuordnung. Digital: Standardfolie "partner".
6. Ergebnis hängt vom Ziel ab: DIVERGIEREND (Ideen sammeln) -> Vorlage "sammlung" (Lehrkraft schreibt live mit, kein Merksatz). KONVERGIEREND (sich einigen, gewichten, Rangfolge) -> Vorlage "sicherung" (Merksatz-Box mit dem Einigungsergebnis).
7. Plenumsphase bekommt eine eigene Phasenfolie (Arbeitsweise im Plenum + was besprochen wird) VOR der Ergebnisfolie.
8. Je Folie zusätzlich: "liegt" = 2-4 Stichpunkte, was auf der Folie zu sehen ist; "entscheidungen" = Fragen, die die Lehrkraft vor der Stunde beantworten muss (Aufgabe, Dauer, Art der Freigabe, Anzahl der Aspekte, Art der Partnerfindung ...). Leer, wenn nichts zu entscheiden ist.
9. Keine Aufgabe ohne Thema: Nutze EIN durchgehendes Beispielthema für alle Folien.
10. Tafel wie PowerPoint: nichts ragt über den Folienrand, kein Scrollen (außer innerhalb von Textfeldern). Zwischen allen Elementen bleibt sichtbarer Abstand, nichts überlappt; Inhalte halten Abstand zu den Symbolen oben rechts.
11. Tablet darf nach unten länger als eine Bildschirmhöhe sein (Scrollen erlaubt). Der Weiter-Knopf schwebt nicht, sondern steht immer am Ende der Seite.
12. Methoden, die sich über die ganze Stunde spannen (Anfang und späterer Rückgriff, z. B. provokante These): Dort, wo der Unterricht mit eigenen Inhaltsfolien weitergeht, steht GENAU EINE Folie der Vorlage "einschub" (Platzhalter für mehrere Unterrichtsfolien: Lehrerimpuls, Erarbeitung o. Ä.). Danach geht die Methode weiter.`;

const kurz = (f) => {
  const { id, kanal, status, bild, erklaerung, liegt, ...rest } = f;
  return rest;
};

/** Das fertige Think-Pair-Share als Muster (analog), je nach Ziel divergierend oder konvergierend. */
export const musterText = (ziel = 'divergierend') =>
  `MUSTER (Think-Pair-Share, analog, ${ziel}) – übertrage Aufbau und Stil auf die neue Methode, nicht den Inhalt:\n${JSON.stringify(STANDARD_FOLIENSAETZE['Think-Pair-Share'][ziel].analog.map(kurz))}`;