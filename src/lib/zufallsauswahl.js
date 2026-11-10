/**
 * Zufallsauswahl einer Aufgabe (2026-11-10): Aus N Elementen bearbeitet ein
 * Schüler nur X zufällig gezogene. Die Ziehung bleibt je Aufgabe für die
 * Dauer der Browser-Sitzung stabil (Neuladen ändert sie nicht).
 */
export function zufallsAuswahl(schritte = [], aufgabe = null) {
  const anzahl = Number(aufgabe?.zufallsauswahl_anzahl) || 0;
  if (anzahl <= 0 || anzahl >= schritte.length || !aufgabe?.id) return schritte;

  const key = `zufallsauswahl:${aufgabe.id}`;
  const vorhandene = new Set(schritte.map((s) => s.id));
  let ids = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (!Array.isArray(ids) || ids.length !== anzahl || !ids.every((id) => vorhandene.has(id))) {
    const gemischt = [...schritte];
    for (let i = gemischt.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [gemischt[i], gemischt[j]] = [gemischt[j], gemischt[i]];
    }
    ids = gemischt.slice(0, anzahl).map((s) => s.id);
    sessionStorage.setItem(key, JSON.stringify(ids));
  }
  return schritte.filter((s) => ids.includes(s.id));
}