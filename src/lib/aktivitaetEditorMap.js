/**
 * lib/aktivitaetEditorMap.js
 *
 * Zuordnung: Name einer Katalog-Aktivität → passender Editor-Dialog.
 *
 * Für die meisten Aufgabenformate gibt es im Pool-Manager einen eigenen
 * Editor — den WYSIWYG-Lückentext, den Miniquiz-Editor mit KI-Hilfe, die
 * Bildbeschriftung mit Bildmarkierung. Diese Editoren sollen an JEDER Stelle
 * benutzt werden, an der ein solches Format ausgearbeitet wird: im Lernpaket,
 * im Regieblatt einer Unterrichtsstunde und in der Aufgaben-Werkstatt.
 *
 * Deshalb steht die Zuordnung hier und nicht in einer der drei Oberflächen.
 * Herausgelöst aus unterrichtsstunden/StundenAufgabeEditorButton (2026-08-31),
 * wo sie zuerst entstanden ist.
 *
 * Die Zuordnung läuft über den NAMEN, nicht über eine ID: Der Katalog führt
 * jede Aktivität einmal pro Lernpaket-Phase, die IDs unterscheiden sich also,
 * der Name nicht.
 */

/**
 * @param {string} name  Name der Katalog-Aktivität
 * @returns {string} Schlüssel des Editors, 'generisch' als Rückfallebene
 */
export function editorTyp(name = '') {
  const n = String(name).toLowerCase();
  if (n.includes('galerie')) return 'galerie';
  if (n.includes('test')) return 'test';
  if (n.includes('quiz')) return 'quiz';
  if (['lückentext', 'lueckentext', 'lücken', 'cloze'].some((k) => n.includes(k))) return 'lueckentext';
  if (['reihenfolge', 'sortierung', 'sequenzierung', 'sorting'].some((k) => n.includes(k))) return 'sortierung';
  if (n.includes('zuordnen') || n.includes('match terms')) return 'match';
  if (n.includes('multiple choice') || n.includes('multiple-choice')) return 'mc';
  if (n.includes('bildbeschriftung') || n.includes('bildbeschreibung')) return 'bild';
  if (n.includes('ki-tutor') || n.includes('ki-check')) return 'kitutor';
  if (n.includes('offene aufgabe')) return 'offen';
  return 'generisch';
}

/**
 * Hat dieses Format einen eigenen Editor-Dialog? Wenn nicht, werden die
 * Felder aus dem `form_schema` direkt angezeigt — für drei Textfelder lohnt
 * kein eigenes Fenster.
 */
export function hatEigenenEditor(name = '') {
  return editorTyp(name) !== 'generisch';
}

/** Beschriftung des Knopfes, der den Editor öffnet. */
export function editorKnopfText(name = '', hatInhalt = false) {
  const kurz = String(name || 'Aufgabe').trim();
  return hatInhalt ? `${kurz} bearbeiten` : `${kurz} jetzt erstellen`;
}
