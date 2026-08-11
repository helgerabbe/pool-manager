/**
 * lib/kompaktwissenSektionen.js
 *
 * Zerlegt einen Kompaktwissen-Text (Markdown) in farbig gestaltete Abschnitte.
 * Jeder Abschnitt erhält anhand seiner Überschrift ein Farb-/Icon-Thema, damit
 * die Schüler:innen auf einen Blick erkennen, was Begriffe, Vorgehen, Beispiele
 * und – besonders hervorgehoben – Merksätze sind.
 */

/** Farb-/Icon-Themen. `merke = true` → prominenter Merkkasten. */
export const THEMEN = {
  ueberblick: { icon: 'compass', karte: 'bg-sky-50 border-sky-200', titel: 'text-sky-800', punkt: 'marker:text-sky-400', chip: 'bg-sky-100 text-sky-700' },
  begriffe: { icon: 'book', karte: 'bg-indigo-50 border-indigo-200', titel: 'text-indigo-800', punkt: 'marker:text-indigo-400', chip: 'bg-indigo-100 text-indigo-700' },
  wissen: { icon: 'brain', karte: 'bg-violet-50 border-violet-200', titel: 'text-violet-800', punkt: 'marker:text-violet-400', chip: 'bg-violet-100 text-violet-700' },
  vorgehen: { icon: 'steps', karte: 'bg-emerald-50 border-emerald-200', titel: 'text-emerald-800', punkt: 'marker:text-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  beispiele: { icon: 'quote', karte: 'bg-orange-50 border-orange-200', titel: 'text-orange-800', punkt: 'marker:text-orange-400', chip: 'bg-orange-100 text-orange-700' },
  merke: { icon: 'star', karte: 'bg-amber-50 border-amber-300', titel: 'text-amber-900', punkt: 'marker:text-amber-500', chip: 'bg-amber-200 text-amber-900', merke: true },
  achtung: { icon: 'warn', karte: 'bg-rose-50 border-rose-200', titel: 'text-rose-800', punkt: 'marker:text-rose-400', chip: 'bg-rose-100 text-rose-700' },
  standard: { icon: 'dot', karte: 'bg-slate-50 border-slate-200', titel: 'text-slate-800', punkt: 'marker:text-slate-400', chip: 'bg-slate-200 text-slate-700' },
};

/** Ermittelt das Thema einer Abschnitts-Überschrift. */
export function themaFuerTitel(titel = '') {
  const t = titel.toLowerCase();
  if (/merk|einprägen|nicht vergessen|tipp/.test(t)) return THEMEN.merke;
  if (/achtung|vorsicht|fehler|stolper/.test(t)) return THEMEN.achtung;
  if (/beispiel/.test(t)) return THEMEN.beispiele;
  if (/vorgeh|so gehst du|schritt|anleitung|ablauf/.test(t)) return THEMEN.vorgehen;
  if (/begriff|wortschatz|definition|vokab/.test(t)) return THEMEN.begriffe;
  if (/wissen|regel|grundlage|das musst du/.test(t)) return THEMEN.wissen;
  if (/worum|überblick|einstieg|thema|ziel/.test(t)) return THEMEN.ueberblick;
  return THEMEN.standard;
}

/**
 * Teilt den Markdown-Text an Überschriften in Abschnitte auf.
 * @returns {Array<{titel: string, body: string, thema: object}>}
 */
export function parseKompaktwissen(text = '') {
  const zeilen = String(text).split('\n');
  const sektionen = [];
  let aktuell = { titel: '', body: [] };

  zeilen.forEach((zeile) => {
    const m = zeile.match(/^\s{0,3}#{1,4}\s+(.+?)\s*#*\s*$/);
    if (m) {
      if (aktuell.titel || aktuell.body.join('').trim()) sektionen.push(aktuell);
      aktuell = { titel: m[1].trim(), body: [] };
    } else {
      aktuell.body.push(zeile);
    }
  });
  if (aktuell.titel || aktuell.body.join('').trim()) sektionen.push(aktuell);

  return sektionen.map((s) => ({
    titel: s.titel,
    body: s.body.join('\n').trim(),
    thema: s.titel ? themaFuerTitel(s.titel) : THEMEN.ueberblick,
  }));
}