/**
 * lib/aufgabePortierung.js
 *
 * Wandelt eine alte KI-Tutor-EINZELAUFGABE in eine Schrittfolge mit genau
 * einem Brian-Schritt um.
 *
 * Warum: Seit dem Umbau ist ein Brian-Gespräch ein SCHRITT. Die rund 96
 * Aufgaben von vorher tragen ihre Angaben aber noch an der Aufgabe und
 * öffnen deshalb weiterhin den alten Editor. Erst wenn sie portiert sind,
 * kann der alte Weg verschwinden.
 *
 * Grundsatz: NICHTS geht verloren und NICHTS wird gelöscht. Die Felder an der
 * Aufgabe bleiben unangetastet stehen — sie sind der Rückweg, falls sich die
 * Umwandlung als falsch erweist, und der Beleg beim Vergleich. Aufgeräumt
 * wird erst, wenn alle 96 durch sind und sich im Alltag bewährt haben.
 *
 * Der Übertragungsstand wandert MIT: Eine bereits nach Brian übertragene
 * Aufgabe muss auch als Schritt übertragen sein, sonst taucht sie im
 * Export-Center wieder auf und jemand legt sie ein zweites Mal in Brian an.
 */

import { neueSchrittId, SCHRITT_TYPEN, SCHRITT_STATUS } from '@/lib/schrittTypen';

/**
 * Alte Ergebnisformen auf die Kennungen aus lib/abgabeFormate abbilden.
 *
 * Nur EINDEUTIGE Entsprechungen — alles andere wandert wortgleich in
 * `custom_format`. Lieber die Formulierung der Lehrkraft im Klartext stehen
 * lassen, als sie in eine Schublade zu raten, die nicht passt: „Mischform /
 * Offen" ist eben kein Format aus unserer Liste.
 */
const ERGEBNISFORM_ZU_KENNUNG = {
  'Fließtext / Essay': 'text',
  'Präsentation / Folien': 'presentation',
  'Schema / Konzept-Map / Zeichnung': 'graphic',
};

/**
 * Baut aus den Abgabe-Feldern der Aufgabe einen Abgabe-Schritt.
 *
 * Zwei Systeme sind im Bestand gewachsen: die älteren Textfelder
 * `ergebnis_form` / `ergebnis_dateiformat` und die neueren `output_formats` /
 * `custom_format` der Projektaufgaben. Beide müssen mit — 95 der Aufgaben
 * haben mindestens eines davon gefüllt.
 *
 * @returns {{schritt: object|null, uebernommen: string[]}}
 */
export function baueAbgabeSchrittAusAufgabe(aufgabe, reihenfolge = 1) {
  const formate = Array.isArray(aufgabe?.output_formats) ? [...aufgabe.output_formats] : [];
  const eigene = [];

  if (aufgabe?.custom_format?.trim()) eigene.push(aufgabe.custom_format.trim());

  const form = aufgabe?.ergebnis_form?.trim();
  if (form) {
    const kennung = ERGEBNISFORM_ZU_KENNUNG[form];
    if (kennung) {
      if (!formate.includes(kennung)) formate.push(kennung);
    } else {
      eigene.push(form);
    }
  }

  const dateiformat = aufgabe?.ergebnis_dateiformat?.trim() || '';

  if (formate.length === 0 && eigene.length === 0 && !dateiformat) {
    return { schritt: null, uebernommen: [] };
  }

  const uebernommen = [];
  if (formate.length) uebernommen.push(`Ergebnisform (${formate.length} Format(e))`);
  if (eigene.length) uebernommen.push(`eigene Angabe „${eigene.join(', ')}"`);
  if (dateiformat) uebernommen.push(`Dateiformat „${dateiformat}"`);

  return {
    schritt: {
      id: neueSchrittId(),
      typ: SCHRITT_TYPEN.ABGABE,
      reihenfolge,
      titel: 'Ergebnis abgeben',
      status: SCHRITT_STATUS.UEBERNOMMEN,
      plan: { kurzbeschreibung: '', lernziel: '', dauer_minuten: null },
      abgabe: {
        formate,
        custom_format: eigene.join(', '),
        dateiformat,
        hinweis: '',
      },
    },
    uebernommen: [`Abgabe als eigener Schritt: ${uebernommen.join(', ')}`],
  };
}

/** Lässt sich diese Aufgabe portieren? */
export function istPortierbar(aufgabe) {
  if (!aufgabe) return false;
  if (aufgabe.aufgaben_modus === 'sequenz') return false;      // schon eine Folge
  if ((aufgabe.aufgaben_typ || 'inhalt') !== 'inhalt') return false; // Handlung, HTML, Bündel …
  return true;
}

/**
 * Baut den Brian-Schritt aus den Aufgabenfeldern.
 * @returns {{schritt: object, uebernommen: string[], hinweise: string[]}}
 */
export function baueBrianSchrittAusAufgabe(aufgabe) {
  const uebernommen = [];
  const hinweise = [];
  const merke = (was, bedingung) => { if (bedingung) uebernommen.push(was); };

  const brian = {
    aufgabenstellung: aufgabe.aufgabenstellung || '',
    aufgaben_bild_url: aufgabe.aufgaben_bild_url || '',
    materialien: Array.isArray(aufgabe.materialien) ? aufgabe.materialien : [],
    erwartungshorizont: aufgabe.erwartungshorizont || '',
    erwartungshorizont_datei_url: aufgabe.erwartungshorizont_datei_url || '',
    erwartungshorizont_datei_name: aufgabe.erwartungshorizont_datei_name || '',
    lernzielanalyse: aufgabe.lernzielanalyse && typeof aufgabe.lernzielanalyse === 'object'
      ? aufgabe.lernzielanalyse
      : {},
    dialog_name: aufgabe.brian_dialog_name || '',
    learner_instruction: aufgabe.brian_learner_instruction || '',
    system_instruction: aufgabe.brian_system_instruction || '',
    completion_rule: aufgabe.brian_completion_rule || '',
    tutor_persona: aufgabe.tutor_persona || 'standard',
    tutor_persona_zusatz: aufgabe.tutor_persona_zusatz || '',
    // Übertragungsstand mitnehmen — siehe Kopfkommentar.
    sync_status: aufgabe.brian_sync_status || 'new',
    synced_at: aufgabe.brian_synced_at || '',
    dialog_id: aufgabe.brian_dialog_id || '',
    url: aufgabe.brian_url || '',
  };

  merke('Aufgabenstellung', !!brian.aufgabenstellung.trim());
  merke('Aufgabenbild', !!brian.aufgaben_bild_url);
  merke(`${brian.materialien.length} Materialien`, brian.materialien.length > 0);
  merke('Erwartungshorizont', !!brian.erwartungshorizont.trim());
  merke('Lösungsdatei', !!brian.erwartungshorizont_datei_url);
  merke(`Lernzielanalyse (${brian.lernzielanalyse?.items?.length || 0} Ziele)`,
    Array.isArray(brian.lernzielanalyse?.items) && brian.lernzielanalyse.items.length > 0);
  merke('die vier Brian-Felder',
    !!(brian.dialog_name || brian.learner_instruction || brian.system_instruction || brian.completion_rule));
  merke('Übertragungsstand nach Brian', brian.sync_status === 'synced');

  if (!brian.aufgabenstellung.trim()) {
    hinweise.push('Diese Aufgabe hat keine Aufgabenstellung — der Schritt bleibt unvollständig.');
  }
  if (aufgabe.musterloesung?.trim() && !brian.erwartungshorizont.trim()) {
    hinweise.push('Es gibt eine Musterlösung, aber keinen Erwartungshorizont. Die Musterlösung bleibt an der Aufgabe stehen.');
  }

  const schritt = {
    id: neueSchrittId(),
    typ: SCHRITT_TYPEN.BRIAN,
    reihenfolge: 0,
    titel: aufgabe.titel || '',
    // Portierte Aufgaben waren fertig — sie sollen nicht plötzlich als
    // "geplant" in der Werkstatt auftauchen.
    status: SCHRITT_STATUS.UEBERNOMMEN,
    plan: { kurzbeschreibung: '', lernziel: '', dauer_minuten: null },
    brian,
  };

  return { schritt, uebernommen, hinweise };
}

/**
 * Die Änderung, die gespeichert werden muss. Bewusst klein: nur der Modus und
 * die Schrittfolge. Alles Übrige bleibt, wo es ist.
 */
export function baueAenderungFuerPortierung(aufgabe) {
  const { schritt, uebernommen, hinweise } = baueBrianSchrittAusAufgabe(aufgabe);
  const schritte = [schritt];

  // Die Abgabe ist im neuen Modell ein eigener Schritt und gehört ans Ende:
  // erst arbeiten, dann abgeben.
  const abgabe = baueAbgabeSchrittAusAufgabe(aufgabe, 1);
  if (abgabe.schritt) schritte.push(abgabe.schritt);

  return {
    aenderung: { aufgaben_modus: 'sequenz', sequenz_schritte: schritte },
    uebernommen: [...uebernommen, ...abgabe.uebernommen],
    hinweise,
  };
}
