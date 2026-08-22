/**
 * lernpaketZugang.js
 *
 * Der „Zugang" zu einem einzelnen Lernpaket im Lernpfad (2026-08-22).
 *
 * Drei Arten:
 *   - 'standard'        → Das Lernpaket wird der Reihe nach durchgearbeitet:
 *                         erst die Input-Elemente, dann die Übungen, dann der
 *                         Abschluss – jeweils in der angelegten Reihenfolge.
 *                         Das nächste Element ist bis dahin gesperrt.
 *   - 'fast_track'      → Der Schüler bewegt sich im Lernpaket frei (Input und
 *                         Übungen kann er ansehen oder überspringen), MUSS aber
 *                         den Abschluss machen. Er kann also sofort zum
 *                         Abschluss springen und ihn versuchen.
 *   - 'wissensspeicher' → Völlig freie Nutzung: hineinschauen, etwas nachlesen
 *                         und jederzeit wieder verlassen. Nichts ist Pflicht.
 *
 * Voreinstellung kommt vom Lerntyp (Intensitätsstufe) des Dashboards. Die
 * Lehrkraft kann sie pro Lernpaket im Dashboard überschreiben — der Wert wird
 * am Pfad-Item als `lernpaket_zugang` gespeichert (nur wenn er vom Default
 * abweicht bzw. bewusst gesetzt wurde).
 */

export const LERNPAKET_ZUGANG = Object.freeze({
  STANDARD: 'standard',
  FAST_TRACK: 'fast_track',
  WISSENSSPEICHER: 'wissensspeicher',
});

export const LERNPAKET_ZUGANG_REIHENFOLGE = [
  LERNPAKET_ZUGANG.STANDARD,
  LERNPAKET_ZUGANG.FAST_TRACK,
  LERNPAKET_ZUGANG.WISSENSSPEICHER,
];

/** Voreinstellung pro Lerntyp (überschreibbar pro Lernpaket). */
export const ZUGANG_DEFAULT_BY_LERNTYP = Object.freeze({
  minimalist: LERNPAKET_ZUGANG.STANDARD,
  pragmatiker: LERNPAKET_ZUGANG.FAST_TRACK,
  ehrgeizig: LERNPAKET_ZUGANG.FAST_TRACK,
  passioniert: LERNPAKET_ZUGANG.WISSENSSPEICHER,
});

export const ZUGANG_META = Object.freeze({
  [LERNPAKET_ZUGANG.STANDARD]: {
    label: 'Standard',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    kurz: 'Der Reihe nach: Input → Übung → Abschluss, jeweils in der angelegten Reihenfolge. Das nächste Element ist bis dahin gesperrt.',
  },
  [LERNPAKET_ZUGANG.FAST_TRACK]: {
    label: 'Fast-Track',
    cls: 'bg-blue-200 text-blue-900 border-blue-400',
    kurz: 'Freie Bewegung im Lernpaket: Input und Übungen darf der Schüler ansehen oder überspringen – der Abschluss ist aber Pflicht. Er kann also sofort den Abschluss versuchen.',
  },
  [LERNPAKET_ZUGANG.WISSENSSPEICHER]: {
    label: 'Wissensspeicher',
    cls: 'bg-blue-700 text-white border-blue-800',
    kurz: 'Völlig freie Nutzung: hineinschauen, nachlesen und jederzeit wieder verlassen. Nichts ist Pflicht.',
  },
});

export function isValidZugang(value) {
  return LERNPAKET_ZUGANG_REIHENFOLGE.includes(value);
}

/** Default-Zugang eines Lerntyps. */
export function getZugangDefault(lernTyp) {
  return ZUGANG_DEFAULT_BY_LERNTYP[lernTyp] || LERNPAKET_ZUGANG.STANDARD;
}

/**
 * Effektiver Zugang eines Pfad-Items: Item-Override vor Lerntyp-Default.
 */
export function resolveLernpaketZugang(item, lernTyp) {
  const override = item?.lernpaket_zugang;
  return isValidZugang(override) ? override : getZugangDefault(lernTyp);
}

/** Nächster Zugang im Rundlauf (für den Klick auf das Badge). */
export function nextZugang(current) {
  const idx = LERNPAKET_ZUGANG_REIHENFOLGE.indexOf(current);
  return LERNPAKET_ZUGANG_REIHENFOLGE[(idx + 1) % LERNPAKET_ZUGANG_REIHENFOLGE.length];
}