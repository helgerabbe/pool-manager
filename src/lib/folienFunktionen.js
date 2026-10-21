// Funktion einer Interaktion (2026-10-21): Was passiert mit der Eingabe des Schülers danach?
export const FUNKTIONEN = {
  uebung: { label: 'Übung', text: 'Auf das Signal der Lehrkraft wird angezeigt, was richtig oder falsch ist.' },
  praesentation: { label: 'Präsentation', text: 'Die Lehrkraft sieht alle Eingaben und kann einzelne vorne zeigen.' },
  weiter_allein: { label: 'Weiter (allein)', text: 'Die Eingabe wird in einer eigenen Folgeaufgabe wieder aufgegriffen.' },
  weiter_gruppe: { label: 'Weiter (Gruppe)', text: 'Die Eingabe fließt im nächsten Schritt in die Gruppenarbeit ein.' },
  kollaboration: { label: 'Kollaboration', text: 'Mehrere arbeiten gleichzeitig an einem gemeinsamen Ergebnis.' },
};

// Welche Funktionen ein Element übernehmen kann. Fehlt ein Element, hat es keine Funktion (z. B. Knopf).
export const ELEMENT_FUNKTIONEN = {
  lueckentext_dnd: ['uebung', 'praesentation'],
  bildbeschriftung: ['uebung', 'praesentation'],
  regler: ['uebung', 'praesentation'],
  eingabe: ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe'],
  texteingabe: ['praesentation', 'weiter_allein', 'weiter_gruppe'],
  auswahl: ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe', 'kollaboration'],
  reihenfolge: ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe', 'kollaboration'],
  kanban: ['uebung', 'praesentation', 'weiter_allein', 'weiter_gruppe', 'kollaboration'],
  pinnwand: ['kollaboration'],
  abstimmung: ['kollaboration'],
};