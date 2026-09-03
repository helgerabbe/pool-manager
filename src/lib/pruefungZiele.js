/**
 * pruefungZiele.js
 *
 * Wohin führt ein Befund? Übersetzt eine geprüfte Stelle in einen Link
 * innerhalb der App.
 *
 * Besonderheit: Befunde zu den vorab per KI erzeugten Seiten
 * (ziel_typ='systembaustein') werden NICHT in einem Aufgaben-Reiter behoben,
 * sondern im Export-Center („Interne Inhalte erzeugen"). Sie tauchen in der
 * Taskliste trotzdem auf — sonst wäre eine leere Seite im Kurs unsichtbar.
 */
export function getBefundZiel(befund, { einheitId, aufgaben = [] }) {
  if (!befund) return null;

  if (befund.ziel_typ === 'systembaustein') {
    return { href: '/export-center', label: 'Zum Export-Center' };
  }

  if (befund.ziel_typ === 'allgemeine_aufgabe') {
    const aufgabe = aufgaben.find((a) => a.id === befund.ziel_id);
    const tab = aufgabe?.anforderungsebene === '3 - Projekt' ? 'ebene3' : 'ebene2';
    return {
      href: `/workspace?einheit=${einheitId}&tab=${tab}`,
      label: tab === 'ebene3' ? 'Zu den Projektaufgaben' : 'Zu den allgemeinen Aufgaben',
    };
  }

  if (befund.lernpaket_id) {
    return {
      href: `/workspace?einheit=${einheitId}&tab=lernpakete&lernpaket=${befund.lernpaket_id}`,
      label: 'Zum Lernpaket',
    };
  }

  return null;
}

/** Gruppiert Befunde nach Lernpaket bzw. Sammelgruppen für die Taskliste. */
export function gruppiereBefunde(befunde) {
  const gruppen = new Map();
  for (const b of befunde) {
    const key = b.ziel_typ === 'systembaustein'
      ? 'interne_inhalte'
      : (b.lernpaket_id || (b.ziel_typ === 'allgemeine_aufgabe' ? 'aufgaben' : 'sonstige'));
    const titel = b.ziel_typ === 'systembaustein'
      ? 'Interne KI-Inhalte (Export-Center)'
      : (b.lernpaket_titel || (b.ziel_typ === 'allgemeine_aufgabe' ? 'Allgemeine und Projektaufgaben' : 'Weitere Stellen'));
    if (!gruppen.has(key)) gruppen.set(key, { key, titel, befunde: [] });
    gruppen.get(key).befunde.push(b);
  }
  return [...gruppen.values()];
}