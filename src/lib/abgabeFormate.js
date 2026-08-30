/**
 * lib/abgabeFormate.js
 *
 * Die Formate, in denen Schüler:innen ein Ergebnis abgeben können.
 *
 * Der Pool-Manager nimmt selbst NICHTS entgegen. Er legt nur fest, WAS
 * erwartet wird, zeigt es den Schüler:innen an der richtigen Stelle der
 * Aufgabe an und gibt es im Payload an die MBK weiter — das Hochladen selbst
 * passiert in Moodle. Ein zweiter Ort für Schülerarbeiten wäre weder nötig
 * noch datenschutzrechtlich wünschenswert.
 *
 * Herausgelöst aus projektaufgaben/AbgabeDefinitionSection (2026-08-31),
 * damit Projektaufgaben (Ebene 3) und Abgabe-Schritte in der Aufgaben-
 * Werkstatt dieselbe Liste benutzen. Die Kennungen bleiben unverändert —
 * Bestandsdaten und Export hängen daran.
 */

export const ABGABE_FORMATE = Object.freeze([
  { id: 'text',         label: 'Text',          emoji: '📝', schueler: 'einen geschriebenen Text' },
  { id: 'presentation', label: 'Präsentation',  emoji: '📊', schueler: 'eine Präsentation' },
  { id: 'timeline',     label: 'Zeitleiste',    emoji: '📅', schueler: 'eine Zeitleiste' },
  { id: 'image',        label: 'Bild',          emoji: '🖼️', schueler: 'ein Bild' },
  { id: 'graphic',      label: 'Grafik',        emoji: '📐', schueler: 'eine Grafik' },
  { id: 'audio',        label: 'Audio/Podcast', emoji: '🎙️', schueler: 'eine Tonaufnahme' },
  { id: 'portfolio',    label: 'Portfolio',     emoji: '📁', schueler: 'ein Portfolio' },
]);

const NACH_ID = Object.freeze(
  Object.fromEntries(ABGABE_FORMATE.map((f) => [f.id, f])),
);

export function getAbgabeFormat(id) {
  return NACH_ID[id] || null;
}

/** Beschriftung für die Lehrkraft. Unbekannte Kennungen bleiben erhalten. */
export function abgabeFormatLabel(id) {
  return NACH_ID[id]?.label || id;
}

/**
 * Ein Satz für die Schüler:innen: „Gib eine Präsentation und ein Bild ab."
 * Leere Auswahl ergibt einen leeren Satz — dann steht nur der Hinweis da.
 */
export function abgabeSatz(formate = [], customFormat = '') {
  const teile = (formate || [])
    .map((id) => NACH_ID[id]?.schueler || id)
    .filter(Boolean);
  if (customFormat?.trim()) teile.push(customFormat.trim());
  if (teile.length === 0) return '';
  if (teile.length === 1) return `Gib ${teile[0]} ab.`;
  return `Gib ${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]} ab.`;
}
