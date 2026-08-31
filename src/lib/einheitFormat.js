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

/**
 * Beschriftungen je Format.
 *
 * WICHTIG: Nur die Oberfläche ändert sich. Gespeichert wird ein Übungsblock
 * exakt wie eine Einheit — `titel_der_einheit`, `gesamtziele`,
 * `grundgeruest_rohtext` heißen im Datensatz weiter so. Damit bleibt der
 * Vorteil erhalten, dass ein Übungsblock eine Einheit IST: Export, Arbeitsplan
 * und der Moodle-Code funktionieren unverändert, und ein späterer Agent kann
 * ohne Umwandlung aus Blöcken eine Einheit bauen.
 *
 * Würde man die Feldnamen mitändern, wäre genau das verloren — für einen rein
 * kosmetischen Gewinn.
 */
const TEXTE = {
  einheit: {
    konfigurieren: 'Einheit konfigurieren',
    konfigurierenSub: 'Titel, Ziel, Fach und Status dieser Unterrichtseinheit.',
    titel: 'Titel der Einheit',
    ziele: 'Gesamtziele der Einheit',
    titelbild: 'Titelbild der Einheit',
    code: 'Einheiten-Code für Moodle',
    codeSub: 'Jede Einheit hat einen eigenen Code — wie eine Hausnummer. Damit verknüpfen Sie diese Einheit in Moodle.',
    loeschen: 'Einheit löschen',
    codeZiel: 'genau zu dieser Einheit',
  },
  uebungsblock: {
    konfigurieren: 'Übungsblock konfigurieren',
    konfigurierenSub: 'Titel, Ziel, Fach und Jahrgang dieses Übungsblocks.',
    titel: 'Titel des Übungsblocks',
    ziele: 'Ziele des Übungsblocks',
    titelbild: 'Titelbild des Übungsblocks',
    code: 'Übungsblock-Code für Moodle',
    codeSub: 'Jeder Übungsblock hat einen eigenen Code — wie eine Hausnummer. Damit verknüpfen Sie ihn in Moodle.',
    loeschen: 'Übungsblock löschen',
    codeZiel: 'genau zu diesem Übungsblock',
  },
};

/** Beschriftungen für dieses Format. */
export function formatTexte(einheit) {
  return TEXTE[formatVon(einheit)];
}
