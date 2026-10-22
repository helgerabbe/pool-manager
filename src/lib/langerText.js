// Lange Texte (über 20.000 Zeichen) passen nicht in ein Feld: in Stücke teilen und beim Laden wieder zusammensetzen.
const STUECK = 15000;
export const LANGE_FELDER = ['info_grafikassistent', 'info_methodenbeschreiber', 'info_grobuebersicht'];

export function teileText(text) {
  const t = text || '';
  const teile = [];
  for (let i = 0; i < t.length; i += STUECK) teile.push(t.slice(i, i + STUECK));
  return teile;
}

export function ladeText(m, feld) {
  return m?.[`${feld}_teile`]?.length ? m[`${feld}_teile`].join('') : m?.[feld];
}

export function ladeGrafikText(m) {
  return ladeText(m, 'info_grafikassistent');
}

/** Methode mit wieder zusammengesetzten langen Texten. */
export function mitLangenTexten(m) {
  return { ...m, ...Object.fromEntries(LANGE_FELDER.map((f) => [f, ladeText(m, f)])) };
}

/** Speicherdaten: lange Felder in Stücke teilen, das Einzelfeld leeren. */
export function langeTexteTeilen(daten) {
  LANGE_FELDER.forEach((f) => { daten[`${f}_teile`] = teileText(daten[f]); daten[f] = ''; });
  return daten;
}