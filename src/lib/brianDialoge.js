/**
 * lib/brianDialoge.js
 *
 * Sammelt alle Brian-DIALOGE einer Aufgabenmenge.
 *
 * Hintergrund: Brian legt pro Dialog eine eigene Aufgabe an. Bis 2026-08-31
 * entsprach das genau einer AllgemeineAufgabe — das Export-Center rechnete
 * deshalb durchgehend mit „ein Dialog je Aufgabe". Seit ein Brian-Gespräch
 * ein SCHRITT einer Folge ist, kann eine Aufgabe mehrere Dialoge enthalten,
 * die einzeln übertragen werden und unterschiedlich weit sein können.
 *
 * Diese Funktion vereinheitlicht beides zu einer Liste. Der Rest des
 * Export-Centers arbeitet auf Dialogen und muss den Unterschied nicht kennen.
 *
 * WICHTIG für Bestandsdaten: Bei einer Aufgabe im Modus 'einzeln' bleiben
 * Felder UND Status dort, wo sie immer waren — an der Aufgabe. Würden wir sie
 * auf Schritte umdeuten, gälten bereits übertragene Aufgaben als offen und
 * jemand legte sie in Brian ein zweites Mal an.
 */

import { schritteAusAufgabe, SCHRITT_TYPEN } from '@/lib/schrittTypen';

/** Aufgabentypen ohne eigenen Dialog (Bündel, Prozess, Anker …). */
function kannDialogHaben(aufgabe) {
  return (aufgabe?.aufgaben_typ || 'inhalt') === 'inhalt';
}

/** Sind alle vier Felder gefüllt? Ohne sie kann Brian nichts anfangen. */
export function istDialogBereit(felder) {
  return !!(
    felder?.dialog_name?.trim()
    && felder?.learner_instruction?.trim()
    && felder?.system_instruction?.trim()
    && felder?.completion_rule?.trim()
  );
}

/**
 * @returns {Array<{
 *   key: string, aufgabe: object, schrittId: string|null, schrittNummer: number|null,
 *   titel: string, felder: object, sync_status: string, synced_at: string|null,
 *   dialog_id: string|null, url: string|null, bereit: boolean
 * }>}
 */
export function sammleBrianDialoge(aufgaben = []) {
  const dialoge = [];

  for (const a of aufgaben) {
    if (!kannDialogHaben(a)) continue;

    if (a.aufgaben_modus === 'sequenz') {
      schritteAusAufgabe(a)
        .filter((s) => s.typ === SCHRITT_TYPEN.BRIAN)
        .forEach((s) => {
          const b = s.brian || {};
          const felder = {
            dialog_name: b.dialog_name || '',
            learner_instruction: b.learner_instruction || '',
            system_instruction: b.system_instruction || '',
            completion_rule: b.completion_rule || '',
          };
          dialoge.push({
            key: `${a.id}:${s.id}`,
            aufgabe: a,
            schrittId: s.id,
            schrittNummer: (s.reihenfolge ?? 0) + 1,
            titel: s.titel?.trim() || b.dialog_name?.trim() || 'Gespräch ohne Titel',
            felder,
            sync_status: b.sync_status || 'new',
            synced_at: b.synced_at || null,
            dialog_id: b.dialog_id || null,
            url: b.url || null,
            bereit: istDialogBereit(felder),
          });
        });
      continue;
    }

    // Einzelaufgabe: alles bleibt an der Aufgabe.
    const felder = {
      dialog_name: a.brian_dialog_name || '',
      learner_instruction: a.brian_learner_instruction || '',
      system_instruction: a.brian_system_instruction || '',
      completion_rule: a.brian_completion_rule || '',
    };
    dialoge.push({
      key: a.id,
      aufgabe: a,
      schrittId: null,
      schrittNummer: null,
      titel: a.titel || 'Aufgabe ohne Titel',
      felder,
      sync_status: a.brian_sync_status || 'new',
      synced_at: a.brian_synced_at || null,
      dialog_id: a.brian_dialog_id || null,
      url: a.brian_url || null,
      bereit: istDialogBereit(felder),
    });
  }

  return dialoge;
}

/**
 * Wurde die Aufgabe nach der Übertragung noch bearbeitet?
 *
 * Zehn Sekunden Puffer, weil die Bestätigung selbst ein Update auslöst und
 * `updated_date` dadurch minimal nach `synced_at` liegt.
 */
export function istVeraltet(dialog) {
  const a = dialog?.aufgabe;
  if (dialog?.sync_status !== 'synced' || !dialog?.synced_at || !a?.updated_date) return false;
  return new Date(a.updated_date).getTime() - new Date(dialog.synced_at).getTime() > 10_000;
}
