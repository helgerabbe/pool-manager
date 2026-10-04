/**
 * Baumeister-Kontext: Welche Aufgabe ist gerade im Pool-Manager geöffnet?
 * Die Ansichten melden ihre Auswahl hier an, der Baumeister liest sie beim
 * Öffnen. Bewusst ein schlichter Modul-Speicher — es gibt immer nur EINE
 * geöffnete Stelle.
 */
let kontext = null;

export function setBaumeisterKontext(k) { kontext = k; }
export function clearBaumeisterKontext(ref) { if (!ref || kontext?.ref === ref) kontext = null; }
export function getBaumeisterKontext() { return kontext; }