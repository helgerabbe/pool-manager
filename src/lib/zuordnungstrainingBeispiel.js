// Skizzen-Beispiel für „Zuordnungstraining“: viele Paare, portionsweise geübt.
export const PAARE = [
  ['tree', 'Baum'], ['leaf', 'Blatt'], ['root', 'Wurzel'], ['flower', 'Blüte'],
  ['seed', 'Samen'], ['stem', 'Stängel'], ['bud', 'Knospe'], ['fruit', 'Frucht'],
];
export const PRO_RUNDE = 4;
export const ZIEL = 2; // so oft richtig, bis ein Paar sitzt

/** Nächstes noch nicht sitzendes Paar der aktuellen Runde (Index) oder null. */
export function naechstes(stand, letzte) {
  const offen = PAARE.map((_, i) => i).filter((i) => (stand[i] || 0) < ZIEL).slice(0, PRO_RUNDE);
  if (!offen.length) return null;
  const andere = offen.filter((i) => i !== letzte);
  const wahl = andere.length ? andere : offen;
  return wahl[Math.floor(Math.random() * wahl.length)];
}

/** Vier Antworten: die richtige plus drei zufällige andere. */
export function antworten(i) {
  const rest = PAARE.map((p) => p[1]).filter((w) => w !== PAARE[i][1]).sort(() => Math.random() - 0.5).slice(0, 3);
  return [...rest, PAARE[i][1]].sort(() => Math.random() - 0.5);
}