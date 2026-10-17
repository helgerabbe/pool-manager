// Passung einer Methode zur gewählten Grundstruktur (Stundenmodell + Variante), 1 = sehr passend … 5 = passt nicht.
import { EINORDNUNG_PROBE } from '@/lib/stundenModelle';
import { VARIANTEN_PASSUNG } from '@/lib/methodenVariantenPassung';

export function grundstrukturPassung(name, g) {
  if (!g) return null;
  const v = g.variante && VARIANTEN_PASSUNG[name]?.[`${g.modell}_${g.variante}`];
  if (v) return { wert: v[0], hinweis: v[1] };
  const e = EINORDNUNG_PROBE[name]?.[g.modell];
  return e ? { wert: e.passung, hinweis: e.hinweis } : null;
}

/** Besonders passende Methoden (Passung 1–2) für die Grundstruktur, die besten zuerst. */
export const passendeMethoden = (g, max = 6) => !g ? [] : Object.keys(EINORDNUNG_PROBE)
  .map((name) => ({ name, p: grundstrukturPassung(name, g) }))
  .filter((x) => x.p && x.p.wert <= 2)
  .sort((a, b) => a.p.wert - b.p.wert)
  .slice(0, max);