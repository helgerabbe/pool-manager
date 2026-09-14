/**
 * aufgabentextStandard
 * ────────────────────
 * Welcher Aufgabentext steht bei den Schülern, solange die Lehrkraft keinen
 * eigenen formuliert hat?
 *
 * Der Grund für diese Datei: Die Schüler-Seiten bringen je Format ihren
 * eigenen Standardsatz mit („Schau dir das folgende Video aufmerksam an …").
 * Im Editor stand daneben ein anderer, allgemeiner Satz — die Lehrkraft sah
 * also einen Standardtext, den die Schüler nie zu Gesicht bekommen. Hier
 * steht der Satz EINMAL, und der Editor zeigt genau ihn.
 */

const ALLGEMEIN = 'Bearbeite die folgende Aufgabe sorgfältig.';

/**
 * @param {string} aktivitaetName Name aus dem Aktivitätenkatalog
 * @param {object} fieldValues    aktuelle Feldwerte (z. B. medientyp)
 */
export function standardAufgabentext(aktivitaetName = '', fieldValues = {}) {
  const name = (aktivitaetName || '').toLowerCase();

  if (name.includes('video') || name.includes('audio')) {
    const istAudio = fieldValues.medientyp === 'audio' || fieldValues.medientyp === 'audio_upload';
    return istAudio
      ? 'Höre dir die folgende Tondatei aufmerksam an und versuche, den Inhalt vollständig zu erfassen.'
      : 'Schau dir das folgende Video aufmerksam an und versuche, den Inhalt vollständig zu erfassen.';
  }

  return ALLGEMEIN;
}

export default standardAufgabentext;