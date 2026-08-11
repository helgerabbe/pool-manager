/**
 * lib/sprechaufgabe.js
 *
 * Gemeinsame Konfiguration der Aktivität „Sprechaufgabe": Die Schüler:innen
 * nehmen eine kurze Sprachaufnahme auf, die automatisch verschriftet und
 * gegen den Erwartungshorizont der Lehrkraft geprüft wird. Die Rückmeldung
 * erhalten ausschließlich die Schüler:innen.
 */

export const SPRACHEN = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'Englisch' },
  { value: 'fr', label: 'Französisch' },
  { value: 'la', label: 'Latein' },
  { value: 'es', label: 'Spanisch' },
];

export const DAUER_OPTIONEN = [
  { value: 30, label: '30 Sekunden' },
  { value: 60, label: '1 Minute' },
  { value: 120, label: '2 Minuten' },
  { value: 180, label: '3 Minuten' },
];

export const SCHWERPUNKTE = [
  { value: 'inhalt', label: 'Inhalt & Vollständigkeit' },
  { value: 'grammatik', label: 'Grammatik & Satzbau' },
  { value: 'wortschatz', label: 'Wortschatz' },
  { value: 'aussprache', label: 'Verständlichkeit & Aussprache' },
];

export const VERSUCHE_OPTIONEN = [
  { value: 1, label: '1 Versuch' },
  { value: 2, label: '2 Versuche' },
  { value: 3, label: '3 Versuche' },
  { value: 0, label: 'Unbegrenzt' },
];

export const URTEIL_META = {
  erfuellt: { label: 'Aufgabe erfüllt', klasse: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  teilweise: { label: 'Teilweise erfüllt', klasse: 'bg-amber-100 text-amber-800 border-amber-200' },
  nicht_erfuellt: { label: 'Noch nicht erfüllt', klasse: 'bg-rose-100 text-rose-800 border-rose-200' },
};

/** Standardwerte einer neuen Sprechaufgabe. */
export const SPRECHAUFGABE_DEFAULTS = {
  aufgabentext: '',
  sprache: 'de',
  max_dauer_sekunden: 60,
  erwartungshorizont: '',
  pflichtelemente: [],
  schwerpunkt: 'inhalt',
  versuche: 3,
  bild_url: '',
};

/** Sekunden als mm:ss. */
export function formatDauer(sekunden = 0) {
  const s = Math.max(0, Math.floor(sekunden));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}