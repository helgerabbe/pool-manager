/**
 * brianSchluessel.js
 * ------------------
 * Der Nachweis, dass ein Brian-Gespraech wirklich stattgefunden hat.
 *
 * WARUM: Schueler sehen bei einer Brian-Aufgabe nur "geh zu Brian" und einen
 * Knopf "Erledigt". Beobachtet wurde, dass ein Teil gar nicht zu Brian geht,
 * sondern direkt auf Erledigt druckt - der Erfolg ist dann geschenkt.
 *
 * DESHALB zwei dreistellige Schluessel pro Gespraech:
 *   vollstaendig - nennt Brian erst, wenn die Aufgabe sauber zum Ende
 *                  gebracht wurde.
 *   abbruch      - nennt Brian auf Wunsch jederzeit. Damit kommt niemand in
 *                  eine Sackgasse; die Aufgabe gilt dann aber ausdruecklich
 *                  als NICHT vollstaendig bearbeitet.
 *
 * GRENZE, die wir kennen: Der Schluessel steht in der Brian-Anweisung und ist
 * damit fuer alle Schueler derselbe - er wandert also irgendwann durch die
 * Klasse. Er ist keine Verschluesselung, sondern eine Huerde mit Verfallsdatum:
 * Die Lehrkraft kann ihn jederzeit neu wuerfeln. Zusaetzlich merken wir uns,
 * wie lange jemand bei Brian war (MINDESTDAUER_MS) - ein Vollstaendig-Code
 * nach zwanzig Sekunden ist unplausibel und wird markiert.
 *
 * Den Textbaustein fuer Brians interne Anweisung setzt die Backend-Funktion
 * generateBrianSegments zusammen - dort, wo die Anweisung entsteht.
 */

/** Unter dieser Zeit bei Brian ist eine vollstaendige Bearbeitung unrealistisch. */
export const MINDESTDAUER_MS = 2 * 60 * 1000;
export const MINDESTDAUER_MINUTEN = 2;

/** Eine dreistellige Zahl als Zeichenkette (100-999). */
function dreistellig() {
  return String(100 + Math.floor(Math.random() * 900));
}

/** Erzeugt ein neues Schluesselpaar. Die beiden Codes sind immer verschieden. */
export function neueSchluessel() {
  const vollstaendig = dreistellig();
  let abbruch = dreistellig();
  while (abbruch === vollstaendig) abbruch = dreistellig();
  return { vollstaendig, abbruch };
}

/** Sind fuer dieses Gespraech beide Schluessel gesetzt? */
export function hatSchluessel(schluessel) {
  return !!(schluessel?.vollstaendig && schluessel?.abbruch);
}

/**
 * Prueft eine Eingabe.
 * @returns 'vollstaendig' | 'abbruch' | null (passt zu keinem der beiden)
 */
export function pruefeSchluessel(eingabe, schluessel) {
  const wert = String(eingabe || '').trim();
  if (!wert || !schluessel) return null;
  if (wert === String(schluessel.vollstaendig)) return 'vollstaendig';
  if (wert === String(schluessel.abbruch)) return 'abbruch';
  return null;
}