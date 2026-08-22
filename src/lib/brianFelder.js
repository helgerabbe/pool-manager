/**
 * lib/brianFelder.js
 *
 * Single Source of Truth für die vier Brian.study-Übergabefelder.
 *
 * Hintergrund: Für Brian.study gibt es KEINE API — alle Brian-Dialoge werden
 * vom MBK-Team händisch angelegt. Grundlage dafür sind ausschließlich diese
 * vier Felder, die im Export-Payload (Payload 3, `brian_dialog`) mitgeliefert
 * werden. Eine KI kann sie NICHT nachträglich erfinden, deshalb gilt:
 * Eine Aufgabe mit Brian-Dialog ist erst vollständig, wenn alle vier
 * Felder gefüllt sind.
 *
 * Reine Funktionen, keine I/O.
 */

export const BRIAN_FELDER = [
  { key: 'brian_dialog_name', label: 'Dialogname' },
  { key: 'brian_learner_instruction', label: 'Anweisung für Lernende' },
  { key: 'brian_system_instruction', label: 'Interne Anweisung für den Chatbot' },
  { key: 'brian_completion_rule', label: 'Abbruchbedingung' },
];

/**
 * Aufgaben-Typen, die KEINEN eigenen Brian-Dialog haben: reine Container,
 * die nur auf andere Inhalte verweisen bzw. externe HTML-Seiten einbetten.
 */
const CONTAINER_TYPEN = new Set([
  'buendel',
  'auswahl_buendel',
  'projekt_anker',
  'externe_html_seite',
]);

/** True, wenn diese AllgemeineAufgabe (Ebene 2 oder 3) einen Brian-Dialog braucht. */
export function istBrianAufgabe(aufgabe) {
  if (!aufgabe) return false;
  return !CONTAINER_TYPEN.has(aufgabe.aufgaben_typ || 'inhalt');
}

/** Liste der noch leeren Brian-Felder (jeweils { key, label }). */
export function fehlendeBrianFelder(aufgabe) {
  return BRIAN_FELDER.filter((f) => String(aufgabe?.[f.key] || '').trim() === '');
}

/** True, wenn keine Brian-Felder fehlen (bzw. die Aufgabe keine braucht). */
export function hatVollstaendigeBrianFelder(aufgabe) {
  if (!istBrianAufgabe(aufgabe)) return true;
  return fehlendeBrianFelder(aufgabe).length === 0;
}