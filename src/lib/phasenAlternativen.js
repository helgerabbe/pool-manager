// Methoden-Alternativen je Phase des Grobentwurfs (2026-10-16): aus Raster-Einordnung + Variantenpassung.
import { EINORDNUNG_PROBE } from '@/lib/stundenModelle';
import { VARIANTEN_PASSUNG } from '@/lib/methodenVariantenPassung';

/** Methoden, die für diese Phase einen Kern- oder Teilbeitrag leisten und gut zum Stundentyp passen. */
export function phasenAlternativen(phase, modellKey, varianteKey) {
  const namen = [phase.name, ...(phase.deckt || [])];
  return Object.entries(EINORDNUNG_PROBE).map(([name, e]) => {
    const r = e[modellKey];
    if (!r || name === phase.methode) return null;
    const beitrag = namen.map((n) => r.phasen?.[n]).find((b) => b === 'kern' || b === 'teil');
    if (!beitrag) return null;
    const v = varianteKey && VARIANTEN_PASSUNG[name]?.[varianteKey];
    const wert = v ? v[0] : r.passung;
    return wert <= 2 ? { name, wert, beitrag, hinweis: v ? v[1] : r.hinweis } : null;
  }).filter(Boolean).sort((a, b) => a.wert - b.wert || (a.beitrag === b.beitrag ? 0 : a.beitrag === 'kern' ? -1 : 1) || a.name.localeCompare(b.name));
}