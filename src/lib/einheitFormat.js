/**
 * lib/einheitFormat.js — Einzelquelle für die Formate einer Einheit.
 *
 * Es gibt zwei:
 *
 *   EINHEIT       Das vollständige Lernszenario. Grundgerüst, Wizard,
 *                 Onboarding, mehrere Themenfelder, alle vier Lernpläne.
 *
 *   ÜBUNGSBLOCK   Klein und schnell gebaut, für die Poolzeit. Ein Themenfeld,
 *                 ein bis drei Lernpakete, allgemeine Aufgaben, ein Lernplan.
 *                 Keine Projektaufgaben, kein Grundgerüst, kein Wizard.
 *
 * Warum kein eigener Datentyp: Ein Übungsblock IST eine Einheit, nur eine
 * reduzierte. So erbt er Arbeitsplan, Bündel, Rechte und den Weg nach Moodle
 * über den Einheiten-Code — nichts davon existiert doppelt, und nichts muss
 * bei künftigen Änderungen an zwei Stellen gepflegt werden.
 *
 * Übungsblöcke sind immer privat. Sperrlogik, Bearbeitungsmodus und die
 * Freigabe-Abschnitte sind für private Einheiten bereits ausgeblendet — sie
 * mussten also gar nicht erst unterdrückt werden.
 *
 * Die Grenzen hier sind FÜHRUNG, keine Zäune: Sie steuern, was die Oberfläche
 * anbietet. Eine Lehrkraft, die ein viertes Lernpaket braucht, soll nicht am
 * Werkzeug scheitern — deshalb prüft `lernpaketGrenzeErreicht` nur, ob ein
 * Hinweis fällig ist, und blockiert nicht.
 */

export const EINHEIT_FORMATE = Object.freeze({
  EINHEIT: 'einheit',
  UEBUNGSBLOCK: 'uebungsblock',
});

/** Fehlender Wert = 'einheit'. Alle Bestandsdaten sind Einheiten. */
export function formatVon(einheit) {
  return einheit?.format === EINHEIT_FORMATE.UEBUNGSBLOCK
    ? EINHEIT_FORMATE.UEBUNGSBLOCK
    : EINHEIT_FORMATE.EINHEIT;
}

export function istUebungsblock(einheit) {
  return formatVon(einheit) === EINHEIT_FORMATE.UEBUNGSBLOCK;
}

/** Anzeigename, z. B. für Überschriften und Meldungen. */
export function formatLabel(einheit) {
  return istUebungsblock(einheit) ? 'Übungsblock' : 'Einheit';
}

/**
 * Was dieses Format anbietet. Eine Stelle für alle Abfragen der Oberfläche —
 * damit nicht an zwanzig Orten `format === 'uebungsblock'` steht.
 */
export function formatRegeln(einheit) {
  const kurz = istUebungsblock(einheit);
  return {
    // Aufbau
    zeigtGrundgeruest: !kurz,
    zeigtWizard: !kurz,
    zeigtOnboarding: !kurz,
    mehrereThemenfelder: !kurz,

    // Inhalte
    erlaubtProjektaufgaben: !kurz,
    maxLernpakete: kurz ? 3 : null,   // null = keine Empfehlung

    // Differenzierung: beim Übungsblock startet nur ein Lernplan, weitere
    // lassen sich zuschalten (dafür gibt es `aktive_lerntypen` bereits).
    standardLerntypen: kurz ? ['pragmatiker'] : null,
  };
}

/** Ist die Empfehlung von höchstens drei Lernpaketen erreicht? */
export function lernpaketGrenzeErreicht(einheit, anzahl) {
  const max = formatRegeln(einheit).maxLernpakete;
  return max !== null && anzahl >= max;
}

/** Vorbelegung beim Anlegen eines Übungsblocks. */
export function neuerUebungsblock({ fach, titel, jahrgangsstufe, besitzerEmail }) {
  return {
    format: EINHEIT_FORMATE.UEBUNGSBLOCK,
    // Immer privat — daran hängt, dass Sperren und Freigabe entfallen.
    sichtbarkeit: 'privat',
    besitzer_email: besitzerEmail,
    fach: fach || null,
    titel_der_einheit: titel || '',
    jahrgangsstufe: jahrgangsstufe || null,
    aktive_lerntypen: ['pragmatiker'],
    // Kein Wizard: Der Übungsblock ist sofort bearbeitbar, nicht erst nach
    // einem Einrichtungslauf.
    wizard_status: 'aktiv',
  };
}
