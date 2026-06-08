/**
 * Grobe, menschliche Fortschritts-Einordnung pro Fach – bewusst KEINE
 * Prozent-Balken (würden falsche Präzision vortäuschen). Stattdessen vier
 * verständliche Stufen mit eigener Farbe.
 *
 * Diese Stufen sind im Cockpit-Prototyp noch Beispieldaten; später speist
 * sich die Stufe aus dem echten Schülerfortschritt.
 */
export const FORTSCHRITT_STUFEN = {
  nicht_gestartet: { label: 'Noch nicht gestartet', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  angefangen:      { label: 'Gerade angefangen',     className: 'bg-amber-100 text-amber-700 border-amber-200' },
  mittendrin:      { label: 'Mittendrin',            className: 'bg-blue-100 text-blue-700 border-blue-200' },
  fast_geschafft:  { label: 'Fast geschafft',        className: 'bg-green-100 text-green-700 border-green-200' },
};

export function getFortschrittStufe(key) {
  return FORTSCHRITT_STUFEN[key] || FORTSCHRITT_STUFEN.nicht_gestartet;
}

/**
 * "ungefähr Viertel vor fünf" – menschliche, unscharfe Uhrzeit.
 * Rundet auf das nächste Viertel und formuliert umgangssprachlich.
 */
export function ungefaehreUhrzeit(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const viertel = Math.round(m / 15) % 4;
  // Stunde, auf die sich "vor/nach" bezieht
  const naechsteStunde = (m >= 23 ? h + 1 : h) % 24;
  const std = (n) => {
    const x = n % 12 === 0 ? 12 : n % 12;
    return x;
  };
  if (viertel === 0) return `ungefähr ${std(h)} Uhr`;
  if (viertel === 1) return `ungefähr Viertel nach ${std(h)}`;
  if (viertel === 2) return `ungefähr halb ${std(naechsteStunde)}`;
  return `ungefähr Viertel vor ${std(naechsteStunde)}`;
}