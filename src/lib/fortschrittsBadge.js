/**
 * Grobe, menschliche Fortschritts-Einordnung pro Fach – bewusst KEINE
 * Prozent-Balken (würden falsche Präzision vortäuschen). Stattdessen fünf
 * verständliche Stufen mit eigener Farbe.
 */
export const FORTSCHRITT_STUFEN = {
  nicht_gestartet: { label: 'Noch nicht gestartet', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  angefangen:      { label: 'Gerade angefangen',     className: 'bg-amber-100 text-amber-700 border-amber-200' },
  mittendrin:      { label: 'Mittendrin',            className: 'bg-blue-100 text-blue-700 border-blue-200' },
  fast_geschafft:  { label: 'Fast geschafft',        className: 'bg-green-100 text-green-700 border-green-200' },
  fertig:          { label: 'Fertig!',               className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
};

export function getFortschrittStufe(key) {
  return FORTSCHRITT_STUFEN[key] || FORTSCHRITT_STUFEN.nicht_gestartet;
}

/**
 * Leitet die Fortschritts-Stufe eines Fachs aus echten Daten ab:
 * @param {number}  gesamt        Anzahl sichtbarer Einheiten im Fach
 * @param {number}  abgeschlossen Anzahl vom Schüler abgeschlossener Einheiten
 * @param {boolean} begonnen      Hat der Schüler mind. eine Einheit begonnen (Lerntyp gewählt)?
 */
export function deriveFachStufe({ gesamt, abgeschlossen, begonnen }) {
  if (!gesamt) return 'nicht_gestartet';
  if (abgeschlossen >= gesamt) return 'fertig';
  if (abgeschlossen === 0) return begonnen ? 'angefangen' : 'nicht_gestartet';
  return abgeschlossen / gesamt < 0.5 ? 'mittendrin' : 'fast_geschafft';
}

/**
 * Menschliches „zuletzt gearbeitet"-Label aus einem YYYY-MM-DD-Datum
 * (z. B. dem jüngsten Zeitlog-Tag). Null/undefined → null („Noch nie").
 */
export function zuletztVorLabel(yyyymmdd) {
  if (!yyyymmdd) return null;
  const [j, m, t] = String(yyyymmdd).split('-').map(Number);
  const dann = new Date(j, m - 1, t);
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const tage = Math.round((heute - dann) / 86_400_000);
  if (tage <= 0) return 'Heute';
  if (tage === 1) return 'Gestern';
  if (tage < 7) return `vor ${tage} Tagen`;
  const wochen = Math.floor(tage / 7);
  if (tage < 30) return wochen === 1 ? 'vor 1 Woche' : `vor ${wochen} Wochen`;
  const monate = Math.floor(tage / 30);
  return monate === 1 ? 'vor 1 Monat' : `vor ${monate} Monaten`;
}