/**
 * airGapAenderungen.js
 *
 * Was sich in der AKTUELLEN Air-Gap-Version geändert hat — in einem Satz je
 * Feld, in der Sprache des Kursbaus.
 *
 * Warum das hier steht (Bitte der MBK, 9. September 2026): Der Umbau der
 * Lernlandkarte von einer Liste zu einem Baum hat den Bau angehalten, weil er
 * die Änderung erst mit dem Export selbst erfuhr. Seitdem gilt: Jede
 * strukturelle Änderung wird angekündigt — als Stichpunktliste in `meta`
 * JEDES Payloads (damit der Bau beim ersten Export mit neuer Version selbst
 * darauf hinweisen kann) UND als Ticket-Issue im Repository einen Tag vorher.
 *
 * BEISPIELE (Bitte des Kursbaus, 10. September 2026): Eine Stichpunktliste
 * sagt, DASS ein Baustein neu ist — nicht, wie er aussieht. Der Bau musste die
 * Form deshalb aus dem ersten Export erraten. Kommt ein neuer Baustein hinzu,
 * gehört ab jetzt ein Beispiel-Payload in `beispiele`.
 *
 * PFLEGE: Bei jedem Hochzählen von MBK_AIRGAP_VERSION hier `version` mitziehen
 * und die Stichpunkte (und Beispiele) durch die NEUEN ersetzen — die Liste
 * beschreibt immer genau den Sprung auf die aktuelle Version, nicht die
 * Geschichte.
 */

/* Bewusst OHNE Import von MBK_AIRGAP_VERSION: mbkPayloadBasis liest diese
   Liste, ein Rückimport wäre ein Ringschluss. Version hier mitpflegen. */
export const AIRGAP_AENDERUNGEN = Object.freeze({
  version: 'airgap-1.23.0',
  vorherige_version: 'airgap-1.22.0',
  stichpunkte: Object.freeze([
    'Die interne Anweisung des KI-Tutors reist an der Katalog-Aktivität '
    + '„KI-Tutor Aufgabe (Brian)" jetzt unter BEIDEN Namen: neu zusätzlich als '
    + 'system_instruction (so heißt sie an Aufgabe und Schritt schon immer), '
    + 'unverändert weiter als system_prompt. Lies bevorzugt '
    + 'system_instruction; system_prompt bleibt vorerst erhalten.',
    'meta.aenderungen enthält neu das Feld beispiele: Bei jedem neuen Baustein '
    + 'steht hier ein Beispiel-Payload, damit die Form nicht aus dem Export '
    + 'erraten werden muss.',
  ]),
  /**
   * Beispiel-Payloads zu den Änderungen dieser Version. Leeres Array = diese
   * Version bringt keinen neuen Baustein, nur Feldänderungen.
   */
  beispiele: Object.freeze([
    Object.freeze({
      was: 'field_values der Katalog-Aktivität „KI-Tutor Aufgabe (Brian)"',
      wo: 'Payload 3 (mbk_task_content_payload) → items[].aktivitaeten[].field_values',
      beispiel: Object.freeze({
        instruction: 'Diskutiere mit Brian, ob Nathanael selbst schuld ist.',
        system_instruction: 'Du bist ein sokratischer Gesprächspartner …',
        system_prompt: 'Du bist ein sokratischer Gesprächspartner …',
        dialog_name: 'Der Sandmann – Schuldfrage',
        completion_rule: 'Fertig, wenn drei Argumente belegt wurden.',
      }),
    }),
  ]),
  hinweis:
    'Diese Liste gilt für den Sprung von vorherige_version auf version. Sie '
    + 'wird zusätzlich als Ticket-Issue (Label ticket + engine) im Repository '
    + 'angekündigt, bevor der erste Export mit der neuen Version rausgeht. '
    + 'Welche Schritt-Typen und Aktivitätsnamen es überhaupt gibt, steht '
    + 'dauerhaft und maschinenlesbar in bausteine/katalog.json.',
});