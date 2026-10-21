// Funktion einer Interaktion (2026-10-21): Was passiert mit der Eingabe des Schülers danach?
export const FUNKTIONEN = {
  uebung: { label: 'Übung', text: 'Es wird angezeigt, was richtig oder falsch ist (sofort oder auf Signal der Lehrkraft).' },
  praesentation: { label: 'Präsentation', text: 'Die Lehrkraft sieht alle Eingaben und kann einzelne vorne zeigen.' },
  weiter_allein: { label: 'Weiter (allein)', text: 'Die Eingabe wird in einer eigenen Folgeaufgabe wieder aufgegriffen.' },
  weiter_gruppe: { label: 'Weiter (Gruppe)', text: 'Die Eingabe fließt im nächsten Schritt in die Gruppenarbeit ein.' },
  weitergabe: { label: 'Weitergabe', text: 'Die Eingabe wandert zu einem anderen Schüler, der darauf aufbaut (Rotation).' },
  rueckmeldung: { label: 'Rückmeldung', text: 'Andere kommentieren oder bewerten das Ergebnis.' },
  kollaboration: { label: 'Kollaboration', text: 'Mehrere arbeiten gleichzeitig an einem gemeinsamen Ergebnis.' },
};

const ALLE = ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe', 'weitergabe', 'rueckmeldung', 'kollaboration'];

// Welche Funktionen ein Element übernehmen kann. Fehlt ein Element, hat es keine Funktion (z. B. Knopf).
export const ELEMENT_FUNKTIONEN = {
  lueckentext_dnd: ['uebung', 'praesentation'],
  bildbeschriftung: ['uebung', 'praesentation'],
  regler: ['uebung', 'praesentation'],
  markieren: ['uebung', 'praesentation', 'weiter_allein', 'rueckmeldung'],
  eingabe: ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe', 'weitergabe'],
  texteingabe: ['praesentation', 'weiter_allein', 'weiter_gruppe', 'weitergabe', 'rueckmeldung'],
  auswahl: ALLE,
  reihenfolge: ALLE,
  kanban: ALLE,
  legeboard: ALLE,
  skala: ['praesentation', 'weiter_gruppe', 'kollaboration'],
  pinnwand: ['kollaboration', 'rueckmeldung'],
  abstimmung: ['kollaboration'],
  punktestand: ['kollaboration'],
  zeichenflaeche: ['praesentation', 'weiter_allein', 'weiter_gruppe', 'weitergabe', 'rueckmeldung', 'kollaboration'],
  raster: ALLE,
  wortwolke: ['kollaboration', 'praesentation'],
  karteikarte: ['uebung'],
};