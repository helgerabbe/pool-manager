/**
 * brianKatalogFelder.js
 *
 * EIN Feld, zwei Namen — und die Auflösung davon.
 *
 * DAS PROBLEM (Meldung des Kursbaus, 2026-09-10): Die interne Anweisung für den
 * KI-Tutor heißt an der Aufgabe und am Sequenzschritt `system_instruction`, in
 * den `field_values` der Katalog-Aktivität „KI-Tutor Aufgabe (Brian)" aber
 * `system_prompt`. Der Bau las nur den einen Namen und meldete 22 von 23
 * Dialogen als „Prompt leer", obwohl die Lehrkraft ihn geschrieben hatte.
 *
 * WARUM WIR NICHT UMBENENNEN: Die Umbenennung wäre der sauberere Weg, würde
 * aber 49 gewachsene, von Lehrkräften geschriebene Prompts anfassen (teils
 * mehrere Tausend Zeichen). Dieses Risiko steht in keinem Verhältnis zum
 * Gewinn. Stattdessen reist der Wert AB airgap-1.23.0 unter BEIDEN Namen im
 * Payload: `system_instruction` als der Name, der überall sonst gilt, und
 * `system_prompt` unverändert daneben, damit bestehende Leser nicht brechen.
 * In der Datenbank bleibt alles, wie es ist.
 *
 * Das ist bewusst eine Übersetzung AN DER GRENZE (im Payload), nicht im
 * Datenmodell — die App selbst kennt weiterhin nur `system_prompt` an dieser
 * Aktivität, und niemand muss zwei Schreibwege pflegen.
 */

/** Der abweichende Feldname in den field_values der Brian-Katalog-Aktivität. */
export const BRIAN_KATALOG_ALTNAME = 'system_prompt';
/** Der Name, der an Aufgabe, Schritt und im übrigen Payload gilt. */
export const BRIAN_KANON_NAME = 'system_instruction';

/**
 * Spiegelt `system_prompt` zusätzlich als `system_instruction`.
 *
 * Nur ergänzend: Ein bereits vorhandenes `system_instruction` wird NICHT
 * überschrieben, und ohne `system_prompt` bleibt das Objekt unangetastet
 * (dasselbe Objekt kommt zurück) — so bleibt die Funktion für alle anderen
 * 29 Katalog-Formate wirkungslos.
 *
 * @param {object|null} fieldValues
 * @returns {object|null}
 */
export function mitBrianFeldNamen(fieldValues) {
  if (!fieldValues || typeof fieldValues !== 'object') return fieldValues;
  const wert = fieldValues[BRIAN_KATALOG_ALTNAME];
  if (typeof wert !== 'string' || !wert.trim()) return fieldValues;
  if (typeof fieldValues[BRIAN_KANON_NAME] === 'string' && fieldValues[BRIAN_KANON_NAME].trim()) {
    return fieldValues;
  }
  return { ...fieldValues, [BRIAN_KANON_NAME]: wert };
}