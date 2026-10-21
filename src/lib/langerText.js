// Lange Texte (über 20.000 Zeichen) passen nicht in ein Feld: in Stücke teilen und beim Laden wieder zusammensetzen.
const STUECK = 15000;

export function teileText(text) {
  const t = text || '';
  const teile = [];
  for (let i = 0; i < t.length; i += STUECK) teile.push(t.slice(i, i + STUECK));
  return teile;
}

export function ladeGrafikText(m) {
  return m.info_grafikassistent_teile?.length ? m.info_grafikassistent_teile.join('') : m.info_grafikassistent;
}